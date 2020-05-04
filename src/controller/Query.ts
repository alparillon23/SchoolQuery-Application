/*
This is the query class that will contain methods which will
1. parse JSON queries
2. build the hierarchy
3. output JSON result
4. error handling (nice to have)
- Should be used in InsightFacade.performQuery()
 */
/*
Todo: Al's Notes For D2: This needs to be refactored.
    1. Let Filter Handle 'Where' Implementation, Query Only Passes the arguments
    2. Pass on Result of Filter to Transformations (if present)
    3. Pass on Result of Transformations, or Filter if Transformations isn't present to Options
    4. Pass out Result
    Ideally this: In Query, Get the Dataset, Filter it, Transform it (if required) and Truncate it.
    Each sector will have its own error checking from now on. This will be thrown up and handled by Query.
    No specific error checking should be done by Query. ESLint will not behave otherwise
 */

import {InsightError, ResultTooLargeError} from "./IInsightFacade";
import DataSets from "./DataSets";
import Filter from "./Filter";
import LogicComparison from "./LogicComparison";
import SComparison from "./SComparison";
import MComparison from "./MComparison";
import Negation from "./Negation";
import DataSet from "./DataSet";
import Options from "./Options";
import Log from "../Util";
import DataObject from "./DataObject";
import Transformation from "./Transformation";

export default class Query {
    private queryObj: any;
    private datasets: DataSets;
    private filter: Filter;
    private datasetId: string;
    private dataset: DataSet;
    public result: any = [];
    constructor(query: any, datasets: DataSets) {
        /* Should we include error handling here - if syntactically incorrect JSON
           Maybe just catch any error thrown
        */
        // DONE
        this.queryObj = query;
        this.datasets = datasets;
        let options = this.queryObj["OPTIONS"];
        if (options === undefined) {
            throw (new InsightError("OPTIONS clause missing in query"));
        }
        if (Object.keys(options).length !== 1 && Object.keys(options).length !== 2) {
            throw (new InsightError("Too many or too few OPTIONS"));
        }
        // let columns = options["COLUMNS"];
        // if (columns === undefined || !Array.isArray(columns) || columns.length === 0) {
        //     throw (new InsightError("Columns missing from options or not an array"));
        // }
        // let order = options["ORDER"];
        // if (order !== undefined && typeof(order) !== "string") {
        //     throw (new InsightError("Order missing from options"));
        // }
        // if (columns.length === 0) {
        //     throw (new InsightError("No column specified in options"));
        // }
        // let columnsOrder = columns.slice();
        // if (order !== undefined) {
        //     columnsOrder.push(order);
        // }

        // this.datasetId = this.datasetIdOptions(columnsOrder);
        try {
            let optionsValues = this.findDatasetOptions(this.queryObj);
            let tfsValues = this.findDatasetTransformations(this.queryObj["TRANSFORMATIONS"]);
            let datasetIds = Query.union(optionsValues, tfsValues);
            if (datasetIds.size !== 1) {
                throw (new InsightError("Invalid query dataset combination"));
            }
            this.datasetId = datasetIds.values().next().value;
        } catch (e) {
            throw new InsightError(e);
        }
        if (this.datasetId === "") {
            throw (new InsightError("Querying multiple datasets in OPTIONS"));
        }
        if (!this.datasets.datasets.hasOwnProperty(this.datasetId)) {
            throw (new InsightError("Querying non-existent dataset in OPTIONS"));
        }
        this.dataset = this.datasets.datasets[this.datasetId];
        // Check where stuff
        let where = this.queryObj["WHERE"];
        if (where === undefined) {
            throw (new InsightError("WHERE missing in query"));
        }
        if (Object.keys(where).length > 1) {
            throw (new InsightError("Too many keys in where"));
        } else if (Object.keys(where).length === 1) {
            let whereOpt = Object.keys(where)[0];
            if (whereOpt === "AND") {
                this.filter = new LogicComparison ("AND", where[whereOpt]);
            } else if (whereOpt === "OR") {
                this.filter = new LogicComparison ("OR", where[whereOpt]);
            } else if (whereOpt === "IS") {
                this.filter = new SComparison ("IS", where[whereOpt]);
            } else if (whereOpt === "LT") {
                this.filter = new MComparison ("LT", where[whereOpt]);
            } else if (whereOpt === "GT") {
                this.filter = new MComparison ("GT", where[whereOpt]);
            } else if (whereOpt === "EQ") {
                this.filter = new MComparison ("EQ", where[whereOpt]);
            } else if (whereOpt === "NOT") {
                this.filter = new Negation ("NOT", where[whereOpt]);
            } else {
                throw new InsightError("Invalid WHERE field");
            }
        }
        try {
            let filteredDataset = [];
            if (Object.keys(where).length === 1) {
                filteredDataset = this.filter.applyFilter(this.dataset, Object.values(this.dataset.records));
            } else {
                filteredDataset = Object.values(this.dataset.records);
            }
            let dataobj: DataObject = new DataObject();
            let resultsArray: any[] = [];
            let processedDataset: any[] = [];
            if (filteredDataset.length === 0) {
                processedDataset = [];
            } else {
                processedDataset = dataobj.convertToJSON(filteredDataset, this.datasetId);
            }
            if (this.queryObj.hasOwnProperty("TRANSFORMATIONS")) {
                let transform: Transformation = new Transformation(this.queryObj["TRANSFORMATIONS"], processedDataset);
                resultsArray = transform.applyTransformations();
            } else {
                resultsArray = processedDataset; // Proceed with Filtered JSON if Transformations doesn't exist;
            }
            if (resultsArray.length > 5000) {
                throw new ResultTooLargeError("Too many");
            }
            let resultingArray: any[] = [];
            if (resultsArray.length > 0) {
                let optionsObj: Options = new Options(options, resultsArray);
                resultingArray = optionsObj.applyColumnsAndOrder();
            }
            this.result = resultingArray;
        } catch (e) {
            throw e;
        }
    }

    // private datasetIdOptions(columnsOrder: string[]): string {
    //     // INTUITION: size of set should be = 1 if they are all in the same dataset "courses_xxx"
    //     let colName = "";
    //     columnsOrder.forEach((col) => {
    //         let currName = col.split("_")[0];
    //         if (colName === "") {
    //             colName = currName;
    //         }
    //         if (colName !== "" && currName !== colName) {
    //             return null;
    //         }
    //     });
    //     return colName;
    // }

    // return dataset name if found and consistent
    // return undefined if not found
    // else throw Insight error
    private findDatasetTransformations(tfs: any): Set<string> {
        let datasetIdSet: Set<string> = new Set<string>();
        if (tfs !== undefined) {
            if (tfs.hasOwnProperty("GROUP") && tfs.hasOwnProperty("APPLY")) {
                if (tfs["GROUP"].length >= 1) {
                    tfs["GROUP"].forEach((key: string) => {
                        datasetIdSet.add(key.split("_")[0]);
                    });
                    tfs["APPLY"].forEach((key: any) => {
                        datasetIdSet.add(Object.values(Object.values(key)[0])[0].split("_")[0]);
                    });
                } else {
                    throw new InsightError("Wrong length group/ apply");
                }
            } else {
                throw new InsightError("Wrong Transformation");
            }
        }
        return datasetIdSet;
    }

    private findDatasetOptions(tfs: any): Set<string> {
        let datasetIdSet: Set<string> = new Set<string>();
        if (tfs.hasOwnProperty("OPTIONS")) {
            if (tfs["OPTIONS"].hasOwnProperty("COLUMNS"))  {
                let set: string[] = this.helperForFields(tfs.OPTIONS.COLUMNS);
                for (let s of set) {
                    datasetIdSet.add(s);
                }
            } else {
                throw new InsightError ("No Columns Field");
            }
            if (tfs["OPTIONS"].hasOwnProperty("ORDER")) {
                let sete: string[] = this.helperForOrder(tfs.OPTIONS.ORDER);
                let seta: string[] = this.helperForFields(sete);
                for (let s of seta) {
                    datasetIdSet.add(s);
                }
            }
        } /*else {
            throw new InsightError("No Options Field Specified");
        }*/
        return datasetIdSet;
    }

    private static union(setA: Set<string>, setB: Set<string>): Set<string> {
        let unionSet = new Set(setA);
        for (let elem of setB) {
            unionSet.add(elem);
        }
        return unionSet;
    }

    private helperForOrder(clause: any): string[] {
        let str: string[] = [];
        if (clause === Object(clause)) {
            if (clause.hasOwnProperty("keys")) {
                if (Array.isArray(clause["keys"])) {
                    str = clause["keys"];
                } else {
                    throw new InsightError("Keys Wrong Format Specified");
                }
            }
        } else {
            str.push(clause);
        }
        return str;
    }

    private helperForFields(clause: any): string[] {
        let str: string[] = [];
        if (Array.isArray(clause)) {
            for (let clau of clause) {
                if (clau.includes("_")) {
                    let temp = clau.split("_");
                    str.push(temp[0]);
                }
            }
        }
        return str;
    }

}
