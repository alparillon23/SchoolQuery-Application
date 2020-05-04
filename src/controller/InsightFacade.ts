import Log from "../Util";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NotFoundError,
    ResultTooLargeError
} from "./IInsightFacade";
import DataSets from "./DataSets";
import * as JSZip from "jszip";
import * as fs from "fs";
import DataSet from "./DataSet";
import Query from "./Query";
import * as dh from "./DataHelpers";
import Building from "./Building";
import Room from "./Room";
import {assignBuildingDataRoom} from "./DataHelpers";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private datasets: DataSets;
    private dataDir = "./data/";

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.datasets = new DataSets();
        this.loadDatasetDisk();
    }

    private loadDatasetDisk() {
        let filenames = fs.readdirSync(this.dataDir);
        filenames.forEach((filename) => {
            try {
                let fileContent = fs.readFileSync(this.dataDir + filename, "utf8");
                let currDatasetRead: DataSet = JSON.parse(fileContent);
                this.datasets.addDataset(currDatasetRead);
            } catch (e) {
                throw new InsightError("Cannot read file from disk");
            }
        });
    }

    // todo: fix case where id is invalid but is still being added despite giving insighterror.
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            this.loadDatasetDisk();
            if (!dh.isIDValid(id)) {
                return reject(new InsightError("Invalid Id"));
            }
            this.isAdded(id).then(async (cond) => {
                if (cond) {
                    return reject(new InsightError("Dataset already exists"));
                } else {
                    let zipFile = new JSZip();
                    let currDataset: DataSet = new DataSet(id, kind);
                    if (kind === InsightDatasetKind.Courses) {
                        zipFile.loadAsync(content, {base64: true}).then((data) => {
                            let promisesFiles: any[] = dh.createFileReadPromises(data);
                            Promise.all(promisesFiles).then((filesJSON) => {
                                dh.addSectionsDataset(filesJSON, currDataset);
                                try {
                                    resolve(this.checkEmptyDatasetAndAdd(currDataset));
                                } catch (e) {
                                  return reject(e);
                                }
                            })
                                .catch((errAll: any) => {
                                    return reject(new InsightError(errAll));
                                    // throw new InsightError("Invalid Promises to read zip");
                                });
                            }
                        ).catch((errGlo: any) => {
                            return reject(new InsightError("Invalid Zip File"));
                        });
                    } else if (kind === InsightDatasetKind.Rooms) {
                        zipFile.loadAsync(content, {base64: true}).then((data) => {
                            this.readRoomsHTML(data, currDataset).then(() => {
                                if (Object.keys(currDataset.records).length) {
                                    this.addDatasetDisk(currDataset);
                                    return resolve(Object.keys(this.datasets.datasets));
                                } else {
                                    return reject(new InsightError("No valid section in Zip File"));
                                }
                                // added the next two lines because "rooms/index.html not found" error was not handled.
                            }).catch((err: any) => {
                                return reject(new InsightError(err));
                            });
                        }
                        ).catch((errGlo: any) => {
                            return reject(new InsightError("Invalid Zip File"));
                        });
                    }
                }
            });
        });
    }

    private checkEmptyDatasetAndAdd(dataset: DataSet): string[] {
        if (Object.keys(dataset.records).length) {
            this.addDatasetDisk(dataset);
            return Object.keys(this.datasets.datasets);
        } else {
            throw new InsightError("No valid section in Zip File");
        }
    }

    private readRoomsHTML(data: any, currDataset: DataSet) {
        const parse5 = require("parse5");
        let index = "rooms/index.htm";
        return new Promise((resolve, reject) => {
            if (data.files.hasOwnProperty(index)) {
                data.files[index].async("text").then((htmlData: any) => {
                    let htmlDoc = parse5.parse(htmlData);
                    let htmlHtml = htmlDoc.childNodes.find((elem: any) => {
                        return elem.nodeName === "html";
                    });
                    let htmlBody = htmlHtml.childNodes.find((elem: any) => {
                        return elem.nodeName === "body";
                    });
                    let tables = dh.findTableBody(htmlBody), buildings: Building[] = [];
                    try {
                        tables.forEach((table: any) => {
                            buildings = buildings.concat(dh.exploreTable(table));
                        });
                    } catch (e) {
                        throw new InsightError(e);
                    }
                    let promiseBuildings = dh.createBuildingReadPromises(data, buildings);
                    let latLonPromises: Array<Promise<any>> = [];
                    Promise.all(promiseBuildings).then(() => {
                        buildings.forEach((building: Building) => {
                            latLonPromises.push(dh.getLatLon(building.address).then((latLonJson: any) => {
                                if (latLonJson.hasOwnProperty("lat") && latLonJson.hasOwnProperty("lon")) {
                                    building.lat = latLonJson.lat;
                                    building.lon = latLonJson.lon;
                                }
                                let buildingHtml: any = parse5.parse(building.data);
                                this.readRooms(buildingHtml, building, currDataset);
                            }).catch((err: any) => {
                                reject(new InsightError(err));
                            }));
                        });
                        Promise.all(latLonPromises).then(() => {
                            resolve();
                        }).catch((err: any) => {
                            reject(new InsightError(err));
                        });
                    }).catch((errAll: any) => {
                        reject(new InsightError(errAll));
                    });
                });
            } else {
                reject(new InsightError("rooms/index.html not found"));
            }
        });
    }

    private readRooms(buildingHtml: any, building: Building, currDataset: DataSet) {
        let arrayTables: any = [];
        dh.findTag(buildingHtml, arrayTables, "table");
        arrayTables.forEach((table: any) => {
            let tableBody: any = table.childNodes.find((elem: any) => {
                return elem.nodeName === "tbody";
            });
            let tableRows: any = [];
            dh.findTag(tableBody, tableRows, "tr");
            tableRows.forEach((row: any) => {
                let room: Room = new Room();
                assignBuildingDataRoom(room, building);
                let arraytds: any = [];
                dh.findTag(row, arraytds, "td");
                try {
                    arraytds.forEach((td: any) => {
                        if (td.attrs[0].value === "views-field views-field-field-room-capacity") {
                            room.seats = parseInt(td.childNodes[0].value.trim(), 10);
                        } else if (td.attrs[0].value === "views-field views-field-field-room-furniture") {
                            room.furniture = td.childNodes[0].value.trim();
                        } else if (td.attrs[0].value === "views-field views-field-field-room-type") {
                            room.type = td.childNodes[0].value.trim();
                        } else if (td.attrs[0].value === "views-field views-field-field-room-number") {
                            let a = td.childNodes.find((elem: any) => {
                                return elem.nodeName === "a";
                            });
                            room.number = a.childNodes[0].value.trim();
                        } else if (td.attrs[0].value === "views-field views-field-nothing") {
                            let a = td.childNodes.find((elem: any) => {
                                return elem.nodeName === "a";
                            });
                            room.href = a.attrs[0].value.trim();
                        }
                    });
                    room.name = room.shortname + "_" + room.number;
                    if (dh.roomDefined(room)) {
                        currDataset.addRecord(room);
                    }
                } catch (e) {
                    throw new InsightError("error in fields in room");
                }
            });
        });
    }

    private addDatasetDisk(currDataset: DataSet) {
        this.datasets.addDataset(currDataset);
        try {
            if (!fs.existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir);
            }
            fs.writeFileSync(this.dataDir + currDataset.id,
                JSON.stringify(currDataset));
        } catch (e) {
            throw new InsightError("Cannot write to disk");
        }
    }


    private isAdded(id: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.listDatasets().then((datasets: InsightDataset[]) => {
                datasets.forEach((dset) => {
                    if (dset.id === id) {
                        return resolve(true);
                    }
                });
                return resolve(false);
            }).catch((err: any) => {
                reject(new InsightError("Cannot check if dataset is added"));
            });
        });
    }

    public removeDataset(id: string): Promise<string> {
        // Check if id is valid
        return new Promise<string>((resolve, reject) =>  {
            this.loadDatasetDisk();
            if (dh.isIDValid(id)) {
                this.isAdded(id).then((val) => {
                    if (!val) {
                        reject(new NotFoundError("Dataset to remove is not added"));
                    } else {
                        try {
                            delete this.datasets.datasets[id];
                        } catch (e) {
                            reject(new InsightError("Cannot remove dataset from memory"));
                        }
                        try {
                            fs.unlinkSync(this.dataDir + id);
                        } catch (e) {
                            reject(new InsightError("Cannot remove dataset from disk"));
                        }
                        resolve(id);
                    }
                }).catch((err: any) => {
                    reject(new InsightError("Cannot check if dataset is added"));
                });
            } else {
                reject(new InsightError("Invalid ID"));
            }
        });
    }

    public performQuery(query: any): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
            // this.loadDatasetDisk();
            try {
                let queryObj: Query = new Query(query, this.datasets);
                if (queryObj.result.length > 5000) {
                    reject(new ResultTooLargeError("More that 5000 results"));
                }
                resolve(queryObj.result);
            } catch (e) {
                reject(e);
            }
        });
    }

    public listDatasets(): Promise<InsightDataset[]> {
        this.loadDatasetDisk();
        let insightDatasets: InsightDataset[];
        insightDatasets = [];
        for (let [datasetId, dataSet] of Object.entries(this.datasets.datasets)) {
            let insightDataset: InsightDataset = {
                id: datasetId,
                kind: dataSet.type,
                numRows: Object.keys(dataSet.records).length
            };
            insightDatasets.push(insightDataset);
        }
        return new Promise((resolve, reject) => {
            resolve(insightDatasets);
        });

    }
}
