
import {InsightError} from "./IInsightFacade";
import Log from "../Util";
import Columns from "./Columns";
import Sorting from "./Sorting";

export default class Options {
    /*
    This is the entity which handles the OPTIONS operations in the QUERY
    columns - the columns of the dataset that will be shown in the query results
    order - the column which the query result must sort by
    TODO:
        Build The COLUMNS and SORT OBJECTS, DEPRECATE THIS USE INTO AN INTERFACE (Details below)
        Ideally, Options should be an API using Columns and Sorting to return a sorted dataset
        A (Grouped/Filtered Dataset),(Options Clause) -> [OPTIONS]
        B [OPTIONS] -> (Desired Columns),(Grouped/Filtered Dataset) -> [COLUMNS] -> (Dataset with Only Selected Columns)
        C (Dataset with Only Selected Columns),(Desired Order Key(s))-> [SORTING] -> (Dataset Sorted)
     */
    // private columns: any[];
    private options: any; // The value of OPTIONS key
    private columns: Columns; // New object that will perform Procedure B
    private uds: any[];
    private order: Sorting; // New object that will perform Procedure C
    /*
    private listDatasets: string[];
    private listColumns = ["dept", "id", "avg", "instructor", "title", "pass", "fail", "audit", "uuid", "year"];
    private datasetId: string;
    */
    // PHASE TWO: Options made General By Objects
    // Pass to the constructor
    // a) the value corresponding to options
    // b) the updated dataset so far
    // Be prepared to catch and handle a problematic Options in Query
    // If no error is thrown by the constructor, future errors will occur by
    // semantics "invalid keys used" not the structure
    // semantics are tested in applyColumnsAndOrder. Any errors caught from this is purely semantics
    // If no errors are thrown by applyColumnsAndOrder, the result will be an array of objects [records]
    constructor(options: any, uds: any[]) {
        // TODO: Query Should Test If There's Both 0 or 5000 throw an error for both
        // Test for syntactical correctness here. Throw an error only then.
        this.options = options;
        this.uds = uds;
        try {
            if (options.hasOwnProperty("COLUMNS")) {
                this.columns = new Columns(uds, options.COLUMNS);
            } else {
                throw new InsightError("No Column Field Specified");
            }
            if (options.hasOwnProperty("ORDER")) {
                this.order = new Sorting(uds, options.ORDER);
            } /*else {
                throw new InsightError("No Order Field Specified");
            }*/
        } catch (er) {
           throw new InsightError("Error in Columns, Order specification : " + er);
        }
        /*
        if (options.hasOwnProperty("COLUMNS")) {
            this.columns = new Columns(uds, options.COLUMNS);
        } else {
            throw new InsightError("No Column Field Specified");
        } */
        // this.order = options.ORDER;
        /*
        this.listDatasets = listDatasets;
        this.datasetId = datesetId;
         */
    }

    /* Test for Validity

     */
    /*
      @param: Updated data set (UDS) that has been filtered (Ask Bill what's returned in his struct)
      if JSON array don't stringify and manipulate directly by key strings, if Objects, stringify
      the UDS before manipulating.
      @specs: Apply both the columnar and order sorting
      @output: Expected data set as string
     */
    /*
    In Phase Two: To keep things general
    This will accept any dataset passed.
    For each Columns and Order
    There's a check for semantics (errors in key provided, invalid keys etc) BEFORE they perform their actions
     */
    public applyColumnsAndOrder(): any[] {
        let records: any[] = [];
        if (this.columns.isColumnarValid(Object.keys(this.uds[0]))) {
            records = this.columns.applyColumns();
        } else {
            throw new InsightError("Invalid Column Request");
        }
        try {
            if (this.options.hasOwnProperty("ORDER")) {
                this.order = new Sorting(records, this.options.ORDER);
                // notice this is reinitialized (from line 50)?
                // This is to use the updated dataset with limited columns in Order.
                // The first initialization was required only to test validity before creating.
                // No new syntactical errors will be thrown but its still throwing by convention so we must catch
                if (this.order.isSortValid(Object.keys(records[0]))) {
                    return this.order.applySort();
                } else {
                    throw new InsightError("Sorting Criteria Not Valid");
                }
            }
        } catch (er) {
            throw new InsightError("Error initializing the sort variable: " + er);
        }
        return records; // Should never get to this point but will output the right answer
    }

    // Helper that allows us to make the record
    // outputs a JSON object syntax {"field1":value1, "field2":value2, "field3":value3, ... "fieldn":valuen}
    /*
    private selectColumns(ur: any): string {
        let jsonObj: string = "{ ";
        for (let i = 0; i < this.columns.length - 1; i++) {
            let thisfield: string = "\"";
            let valf: string = "";
            if (isNaN(ur[this.columns[i].toString()])) {
                valf.concat("\"", ur[this.columns[i].toString()], "\"");
            } else {
                valf.concat(ur[this.columns[i].toString()]);
            }
            thisfield.concat(this.columns[i].toString(), "\": ", valf);
            jsonObj.concat(thisfield, ", ");
        }
        let vals: string = "";
        if (isNaN(ur[this.columns[this.columns.length - 1].toString()])) {
            vals.concat("\"", ur[this.columns[this.columns.length - 1].toString()], "\"");
        } else {
            vals.concat(ur[this.columns[this.columns.length - 1].toString()]);
        }
        jsonObj.concat("\"", this.columns[this.columns.length - 1].toString(), "\"");
        jsonObj.concat(": ", vals, " }");
        return jsonObj;
    }
     */
    // Helper that creates new objects of the record with only columns in question
    /*
        @param : a record from the filtered dataset
        @spec  : convert into object with only selected columns as properties
        @output: an object with select-column fields
     */
    /*
    private selectColumnsAsObj(udr: any): any {
        let newData: any = {};
        this.listColumns.forEach((col) => {
            let colLong = this.datasetId + "_" + col;
            if (this.columns.includes(colLong)) {
                newData[colLong] = udr[col];
            }
});
     *//*
        // let obje: {[k: string]: any} = {};
        // for (let column in this.columns) {
        //   obje[column.toString()] = udr[column.toString()];
        // }
        return newData;
    }

    // Helper that tests whether columns and order provided is legal
    /*
        @param : A list of datasets in scope
        @spec  : test if COLUMNS and ORDER are valid for the query
        @output: true if valid, error if not valid (with description)
     */
    /*
    private isValid(datasetsList: string[]): boolean {
        let valid: boolean = true;
        // test one: order key needs to be in column list
        if (this.order !== undefined) {
            if (!this.columns.includes(this.order)) {
                valid = false;
            }
        }
        // test two: column has to exist in list of columns
        for (const col of this.columns) {
            let split = col.split("_");
            if (split.length !== 2 || (!this.listColumns.includes(split[1]))) {
                valid = false;
            }
        }
        // test three: all columns have to be in the same dataset+
        if (!this.allTheSame()) {
            valid = false;
        }
        if (valid) {
            return true;
        }
    }

    // Helper that tests whether all fields are in the same dataset
    /*
        @param : none
        @spec  : test if all columns in column selected are of the same dataset
        @output: true if valid, false if not
     *//*
    private allTheSame(): boolean {
        // INTUITION: size of set should be = 1 if they are all in the same dataset "courses_xxx"
        let queryFieldSet = new Set();
        for (const col of this.columns) {
            let temp = col.split("_");
            queryFieldSet.add(temp[0]);
        }
        if (queryFieldSet.size === 1) {
            return true;
        }
        return false;
    }
    */
}
