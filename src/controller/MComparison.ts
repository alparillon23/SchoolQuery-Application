import Filter from "./Filter";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import Section from "./Section";
import DataSet from "./DataSet";

export default class MComparison extends Filter {
    // "courses_bla" : value
    private field: string; // "courses_bla"
    private fieldvalue: any; // value
    private datasetToSearch: string; // courses
    private fieldToSearch: string; // bla
    private datasetGiven: string;
    private tempResultSoFar: any[] = [];
    private datasetType: InsightDatasetKind;
    private mfieldSections: {[index: string]: string[]} = {};

    constructor(kkey: string, vvalue: any) {
        super(kkey, vvalue);
        if (typeof(vvalue) !== "object" || Object.keys(vvalue).length !== 1) {
            throw new InsightError("Invalid format for M comp");
        }
        this.field = Object.keys(vvalue)[0];
        this.fieldvalue = vvalue[this.field];
        if (((this.field.indexOf("_") === -1) || (this.field.indexOf("_") === 0))) {
            throw new InsightError("mkey given is not valid");
        }
        this.datasetToSearch = this.field.substr(0, this.field.indexOf("_"));
        this.fieldToSearch = this.field.substr((this.field.indexOf("_") + 1));
        this.mfieldSections[InsightDatasetKind.Courses] = ["avg", "pass", "fail", "audit", "year"];
        this.mfieldSections[InsightDatasetKind.Rooms] = ["lat", "lon", "seats"];
    }

    public applyFilter(ds: DataSet, resultSoFar: any[]): any[] {
        this.datasetGiven = ds.id;
        this.datasetType = ds.type;
        try {
                if (this.isValid()) {
                    let sections: any = ds.records;
                    if (this.key === "LT") {
                        this.lessThanHelper(sections);
                    } else if (this.key === "EQ") {
                        this.equalHelper(sections);
                    } else {
                        this.greaterThanHelper(sections);
                    }
                }
                return this.tempResultSoFar;
        } catch (e) {
            throw new InsightError(e);
        }
    }

    // checks for 4 things:
    // is the fieldvalue a Number
    // is the key to search a valid key
    // is the field to search a valid field
    // is the dataset to search a valid dataset
    protected isValid(): boolean {
        if (typeof(this.fieldvalue) !== "number") {
            throw new InsightError("Numeric comparison using Non Numeric Field");
        }
        if (!MComparison.isKeyValid(this.key)) {
            throw new InsightError("MCOMPARATOR is invalid");
        }
        if (!this.isFieldToSearchValid(this.fieldToSearch)) {
            throw new InsightError("Key given is not a valid key");
        }
        if (!this.isDatasetRequestValid()) {
            throw new InsightError("Dataset requested is not in database");
        } else {
            return true;
        }
    }

    private isFieldToSearchValid(fts: string) {
        return this.mfieldSections[this.datasetType].includes(fts);
    }

    // helper function to check if dataset requested is in database
    private isDatasetRequestValid(): boolean {
        return this.datasetToSearch === this.datasetGiven;
    }

    private static isKeyValid(mcomp: string): boolean {
        return ((mcomp === "LT") || (mcomp === "GT") || (mcomp === "EQ"));
    }

    private lessThanHelper(sections: any) {
        for (let [str, Sec] of Object.entries(sections)) {
            let tempSec: any = Sec;
            if (tempSec[this.fieldToSearch] < this.fieldvalue) {
                this.tempResultSoFar.push(Sec);
            }
        }
    }

    private equalHelper(sections: any) {
        for (let [str, Sec] of Object.entries(sections)) {
            let tempSec: any = Sec;
            if (tempSec[this.fieldToSearch] === this.fieldvalue) {
                this.tempResultSoFar.push(Sec);
            }
        }
    }
    // helper

    private greaterThanHelper(sections: any) {
        for (let [str, Sec] of Object.entries(sections)) {
            let tempSec: any = Sec;
            if (tempSec[this.fieldToSearch] > this.fieldvalue) {
                this.tempResultSoFar.push(Sec);
            }
        }
    }

}
