import {InsightError} from "./IInsightFacade";

export default class Columns {
    /*
    TODO:
        Add Columnar Functionality

    This Object Will Accept a Dataset and the Column Values
    And Should Output A Resulting Array with only selected columns specified
    - Al Did This Implementation in Sprint 1 but an important caveat
        Apply rules are also applicable as column names now
        If Apply rules are used
     */
    private rds: any[];
    private readonly columndesired: string[];
    constructor(dataset: any[], columns: any) {
        this.rds = dataset;
        if (Array.isArray(columns) && columns.length > 0) {
            this.columndesired = columns;
        } else {
            throw new InsightError("Incorrect Format");
        }
    }

    public applyColumns(): any[] {
        let records: any[] = [];
        for (let udr of this.rds) {
            let record = this.selectColumnsAsObj(udr);
            records.push(record);
        }
        return records;
    }

    public isColumnarValid?(listFields: string[]): boolean {
        let valid: boolean = true;
        for (let col of this.columndesired) {
            if (!listFields.includes(col)) {
                valid = false;
            }
        }
        return (valid && this.allTheSame());
    }

    // Helper that creates new objects of the record with only columns in question
    /*
        @param : a record from the filtered dataset
        @spec  : convert into object with only selected columns as properties
        @output: an object with select-column fields
     */
    private selectColumnsAsObj(udr: any): any {
        let newData: any = {};
        this.columndesired.forEach((col) => {
            newData[col] = udr[col];
        });
        return newData;
    }

    // Helper that tests whether all fields are in the same dataset
    /*
        @param : none
        @spec  : test if all columns in column selected are of the same dataset
        @output: true if valid, false if not
     */
    private allTheSame(): boolean {
        // INTUITION: size of set should be = 1 if they are all in the same dataset "courses_xxx"
        let queryFieldSet = new Set();
        let cols: string[] = this.columndesired.slice();
        for (let col of cols) {
            if (col.includes("_")) {
                let temp = col.split("_");
                queryFieldSet.add(temp[0]);
            }
        }
        return queryFieldSet.size <= 1;
    }
}
