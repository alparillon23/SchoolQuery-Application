import Section from "./Section";
import DataSet from "./DataSet";
import Log from "../Util";
import Building from "./Building";
import {InsightError} from "./IInsightFacade";
import {resolve} from "dns";
import Room from "./Room";
function createValidSection(section: any) {
    if (section.Subject !== undefined && section.Course !== undefined &&
        section.Avg !== undefined && section.Professor !== undefined && section.Title !== undefined
        && section.Pass !== undefined && section.Fail !== undefined && section.Audit !== undefined
        && section.id !== undefined  && section.Year !== undefined) {
        if (section.Section === "overall") {
            section.Year = 1900;
        }
        let sectionObject: Section = new Section(section.Subject.toString(),
            section.Course.toString(), parseFloat(section.Avg),
            section.Professor.toString(), section.Title.toString(), parseInt(section.Pass, 10),
            parseInt(section.Fail, 10), parseInt(section.Audit, 10), section.id.toString(),
            parseInt(section.Year, 10));
        return sectionObject;
    }
    return null;
}

export function addSectionsDataset(filesJSON: any, currDataset: DataSet) {
    filesJSON.forEach((fileJSON: any) => {
        if (fileJSON != null) {
            for (let section of fileJSON["result"]) {
                // totalSec++;
                let sectionObj: Section = createValidSection(section);
                // Log.trace(sectionObj);
                if (sectionObj) {
                    // validSec++;
                    currDataset.addRecord(sectionObj);
                }
            }
        }
    });
}

export function isIDValid(id: string): boolean {
    return !(id === undefined ||  id === null ||
        id.includes("_") || id === "" || !id.replace(/\s/g, "").length);
}

export function findTag(parent: any, arrayTables: any[], tag: string) {
    if (parent.nodeName === tag) {
        arrayTables.push(parent);
    } else {
        if (parent.hasOwnProperty("childNodes")) {
            parent.childNodes.forEach((child: any) => {
                findTag(child, arrayTables, tag);
            });
        }
    }
}

export function createFileReadPromises(data: any): any[] {
    let promisesFiles: any[] = [];
    for (let file in data.files) {
        if (file.length > "courses/".length && file.substring(0, 8) === "courses/") {
            let currFilePromise = data.files[file].async("text")
                .then((courseData: any) => {
                    try {
                        return JSON.parse(courseData);
                    } catch (e) {
                        return null;
                    }
                })
                .catch((errZip: any) => {
                    Log.trace(errZip);
                });
            promisesFiles.push(currFilePromise);
        }
    }
    return promisesFiles;
}

export function createBuildingReadPromises(data: any, buildings: Building[]): any[] {
    let promisesFiles: any[] = [];
    buildings.forEach((building: Building) => {
        let currPath = "rooms" + building.link.substr(1);
        if (data.files.hasOwnProperty(currPath)) {
            let currFilePromise = data.files[currPath].async("text").then((buildingData: any) => {
                building.data = buildingData;
            }).catch((err: any) => {
                throw new InsightError(err);
            });
            promisesFiles.push(currFilePromise);
        }
    });
    return promisesFiles;
}

export function findTableBody(body: any) {
    let arrayTables: any[] = [];
    findTag(body, arrayTables, "table");
    return arrayTables;
}

export function exploreTable(table: any): Building[] {
    let tableBody: any = table.childNodes.find((elem: any) => {
        return elem.nodeName === "tbody";
    });
    let arrayRows: any[] = [];
    findTag(tableBody, arrayRows, "tr");
    let buildings: Building[] = [];
    try {
        arrayRows.forEach((row: any) => {
            let building: Building;
            building = new Building();
            let arraytds: any[] = [];
            findTag(row, arraytds, "td");
            arraytds.forEach( (td: any) => {
                if (td.attrs[0].value === "views-field views-field-field-building-code") {
                    building.shortname = td.childNodes[0].value.trim();
                } else if (td.attrs[0].value === "views-field views-field-field-building-address") {
                    building.address = td.childNodes[0].value.trim();
                } else if (td.attrs[0].value === "views-field views-field-title") {
                    let a = td.childNodes.find((elem: any) => {
                        return elem.nodeName === "a";
                    });
                    building.fullname = a.childNodes[0].value.trim();
                    let href = a.attrs.find((elem: any) => {
                        return elem.name === "href";
                    });
                    building.link = href.value.trim();
                }
            });
            if (building.checkTableDefined()) {
                buildings.push(building);
            }
        });
    } catch (e) {
        throw new InsightError(e);
    }
    return buildings;
}

export function getLatLon(address: string): Promise<any> {
    const http = require("http");
    let url = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team267/" +
        encodeURIComponent(address);
    return new Promise<any>((fulfill, reject) => {
        http.get(url, function (res: any) {
            let body = "";
            res.on("data", function (chunk: any) {
                body += chunk;
            });
            res.on("end", function () {
                // let jsonResponse = JSON.parse(body);
                fulfill(JSON.parse(body));
            });
        }).on("error", function (e: any) {
            reject(new InsightError(e));
        });
    });
}

export function assignBuildingDataRoom(room: Room, building: Building) {
    room.fullname = building.fullname;
    room.shortname = building.shortname;
    room.address = building.address;
    room.lat = building.lat;
    room.lon = building.lon;
}

export function roomDefined(room: Room): boolean {
    return room.fullname !== undefined
    && room.shortname !== undefined
    && room.number !== undefined
    && room.name !== undefined
    && room.address !== undefined
    && room.lat !== undefined
    && room.lon !== undefined
    && room.seats !== undefined
    && room.type !== undefined
    && room.furniture !== undefined
    && room.href !== undefined;
}
