import {InsightError} from "./IInsightFacade";

export default class Sorting {
    /*
    Sort works as Order Key or List of Order Keys
    Bear in Mind
        1. Sort considers the new "columns" made in Transformation
        2. Sort accepts an array or a single item of keys
     */
    private sorting: any; // Whatever came after ORDER
    private isObj: boolean; // Should inform compiler whether it's dealing with a complex sorting job or not
    private direc: string; // direction - UP or DOWN (only used when isObj is true
    private criteria: string[]; // sort criteria, if sort is not obj, just push it onto criteria
    private rds: any[]; // the dataset after filtering/transformation

    constructor(rd: any [], sort: any) {
        this.criteria = [];
        this.rds = rd; // rd would come from the output of COLUMNS
        try {
            this.sorting = sort;
            if (sort === Object(sort)) { // Figure out whether it's an object or primitive
                this.isObj = true;
            } else {
                this.isObj = false;
            }
            if (this.isObj) { // If it is an object, it must maintain a dir field and a keys field
                if (this.sorting.hasOwnProperty("dir")) {
                   this.direc = this.sorting["dir"];
                } else {
                    throw new InsightError("Invalid Syntax Missing DIR");
                }
                if (this.sorting.hasOwnProperty("keys")) {
                    if (Array.isArray(this.sorting["keys"])) {
                        this.criteria = this.sorting["keys"];
                    } else {
                        throw new InsightError("Invalid Syntax Keys Not Specified");
                    }
                } else {
                    throw new InsightError("Invalid Syntax Missing KEYS");
                }
            } else { // If not an object - it would be a string, we add the string to the sort criteria list
                this.criteria.push(this.sorting);
                this.direc = "UP";
            }
        } catch (er) {
                throw new InsightError("Order Error" + er.message);
        }

    }

    public applySort(): any[] {
        let records: any[] = this.mergeSort(this.rds);
        return records;
    }

    private mergeSort(array: any[]): any[] {
        if (array.length < 2) {
            return array;
        } else {
            let mid: number = Math.floor(array.length / 2);
            let leftarr: any[] = array.slice(0, mid);
            let rightarr: any[] = array.slice(mid, array.length);
            return this.merge(this.mergeSort(leftarr), this.mergeSort(rightarr));
        }
    }

    private merge(leftar: any[], rightar: any[]): any[] {
        let sortedar: any[] = [];
        while (leftar.length && rightar.length) {
            let criteria = this.criteria.slice();
            if (this.compare(leftar[0], rightar[0], criteria)) {
                sortedar.push(leftar[0]);
                leftar.shift();
            } else {
                sortedar.push(rightar[0]);
                rightar.shift();
            }
        }
        while (leftar.length) {
            sortedar.push(leftar.shift());
        }
        while (rightar.length) {
            sortedar.push(rightar.shift());
        }
        return sortedar;
    }

    /*
    Helper: accepts to records and figure out
    A) if record A is less than B (if dir = UP or more than if dir = DOWN) outputs true else false
    B) if record A = B then parse through to the next criteria if all the criteria is still equal output true
     */
    private compare(a: any, b: any, criteria: string[]): boolean {
        if (this.direc === "UP") {
            if (a[criteria[0]] < b[criteria[0]]) {
                return true;
            } else if (a[criteria[0]] > b[criteria[0]]) {
                return false;
            } else {
                if (criteria.length > 1) {
                  criteria.shift();
                  return this.compare(a, b, criteria);
                } else {
                   return true;
                }
            }
        } else {
            if (a[criteria[0]] > b[criteria[0]]) {
                return true;
            } else if (a[criteria[0]] < b[criteria[0]]) {
                return false;
            } else {
                if (criteria.length > 1) {
                    criteria.shift();
                    return this.compare(a, b, criteria);
                } else {
                    return true;
                }
            }

        }
    }

    public isSortValid?(listofdata: string[]): boolean {
        let valid: boolean = true;
        for (let col of this.criteria) {
            if (!listofdata.includes(col)) {
                valid = false;
            }
        }
        if (!((this.direc === "DOWN") || (this.direc === "UP"))) {
            valid = false;
        }
        return (valid && this.allTheSame());
    }

    private allTheSame(): boolean {
        // INTUITION: size of set should be = 1 if they are all in the same dataset "courses_xxx"
        let queryFieldSet = new Set();
        let cols: string[] = this.criteria.slice();
        for (let col of cols) {
            if (col.includes("_")) {
                let temp = col.split("_");
                queryFieldSet.add(temp[0]);
            }
        }
        return queryFieldSet.size <= 1;
    }
}
