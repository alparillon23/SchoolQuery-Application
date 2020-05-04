import Filter from "./Filter";
import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import Section from "./Section";
import DataSet from "./DataSet";
import Log from "../Util";

export default class SComparison extends Filter {
    // "courses_bla" : value
    private field: string; // "courses_bla"
    private fieldvalue: any; // value
    private datasetToSearch: string; // courses
    private fieldToSearch: string; // bla
    private datasetGiven: string;
    private tempResultSoFar: any[] = [];
    private datasetType: InsightDatasetKind;
    private sfieldSections: {[index: string]: string[]} = {};

    constructor(kkey: string, vvalue: any) {
        super(kkey, vvalue);
        if (typeof(vvalue) !== "object" || Object.keys(vvalue).length !== 1) {
            throw new InsightError("Invalid format for M comp");
        }
        this.field = Object.keys(vvalue)[0];
        this.fieldvalue = vvalue[this.field];
        if (this.field.indexOf("_") <= 0) {
            throw new InsightError("skey is not valid");
        }
        this.datasetToSearch = this.field.substr(0, this.field.indexOf("_"));
        this.fieldToSearch = this.field.substr((this.field.indexOf("_") + 1));
        this.sfieldSections[InsightDatasetKind.Courses] = ["dept", "id", "instructor", "title", "uuid"];
        this.sfieldSections[InsightDatasetKind.Rooms] =
            ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
    }

    public applyFilter(ds: DataSet, resultSoFar: any[]): any[] {
        this.datasetGiven = ds.id;
        this.datasetType = ds.type;
        try {
                if (this.isValid()) {
                    let sections: any = ds.records;
                    if (this.fieldvalue.includes("*")) {
                        this.asteriskHelper(sections);
                    } else {
                        this.filterHelper(sections);
                        }
                    }
                return this.tempResultSoFar;
            } catch (e) {
            throw new InsightError(e);
        }
    }

    // checks for 4 things:
    // is the field inputted a string
    // is the asterisk at the beginning or the end of the string or in the middle
    // is the key given a valid key
    // is the dataset requested in the database
    protected isValid(): boolean {
        if (typeof(this.fieldvalue) !== "string") {
            throw new InsightError("String Comparsion using wrong field type");
        }
        if (!SComparison.isKeyValid(this.key)) {
            throw new InsightError("SCOMPARATOR given is invalid");
        }
        if (this.fieldvalue === null) {
            throw new InsightError("String given for search is NULL");
        }
        if (this.fieldvalue.includes("*") && (SComparison.isAsteriskAtWrongSpot(this.fieldvalue))) {
            throw new InsightError("Asterisk not at the beginning or end");
        }
        if (!this.isFieldToSearchValid(this.fieldToSearch)) {
            throw new InsightError("The key given is not a valid key");
        }
        if (!this.isDatasetRequestValid()) {
            throw new InsightError("The dataset requested is not in the database");
        } else {
            return true;
        }
    }

    // helper function to check if an asterisk is not at the front or end of a string
    private static isAsteriskAtWrongSpot(fieldvalue: any): boolean {
        return (fieldvalue.substr(1, fieldvalue.length - 2).includes("*"));
    }

    private isFieldToSearchValid(fts: string) {
        return this.sfieldSections[this.datasetType].includes(fts);
    }

    // helper function to check if dataset requested is in database
    private isDatasetRequestValid(): boolean {
        return this.datasetToSearch === this.datasetGiven;
    }

    private static isKeyValid(scomp: string): boolean {
        return scomp === "IS";
    }

    private static twoAsterisksHelper(secs: string, fieldval: string): boolean {
        let valueRequestedLength: number = fieldval.length - 2;
        if (secs.length >= valueRequestedLength) {
            return secs.includes(fieldval.substr(1, valueRequestedLength));
        } else {
            return false;
        }
    }

    private static asteriskAtStartHelper(secs: string, fieldval: string): boolean {
        let valueRequestedLength: number = fieldval.length - 1;
        if (secs.length >= valueRequestedLength) {
            return secs.substr(secs.length - valueRequestedLength) === fieldval.substr(1);
        } else {
            return false;
        }
    }

    private static asteriskAtEndHelper(secs: string, fieldval: string): boolean {
        let valueRequestedLength: number = fieldval.length - 1;
        if (secs.length >= valueRequestedLength) {
            return secs.substr(0, valueRequestedLength) === fieldval.substr(0, valueRequestedLength);
        } else {
            return false;
        }
    }

    private static isAsteriskOnBothEnd(fieldvalue: string): boolean {
        return ((fieldvalue.substr(0, 1) === "*") &&
            (fieldvalue.substr(fieldvalue.length - 1) === "*"));
    }

    private asteriskHelper(sections: any) {
        if (this.fieldvalue === "*") {
            for (let [str, Sec] of Object.entries(sections)) {
                this.tempResultSoFar.push(Sec);
            }
        }
        if (SComparison.isAsteriskOnBothEnd(this.fieldvalue)) {
            for (let [str, Sec] of Object.entries(sections)) {
                let tempSec: any = Sec;
                if (SComparison.twoAsterisksHelper(tempSec[this.fieldToSearch],
                    this.fieldvalue)) {
                    this.tempResultSoFar.push(Sec);
                }
            }
        }
        if (this.fieldvalue.substr(0, 1) === "*") {
            for (let [str, Sec] of Object.entries(sections)) {
                let tempSec: any = Sec;
                if (SComparison.asteriskAtStartHelper(tempSec[this.fieldToSearch],
                    this.fieldvalue)) {
                    this.tempResultSoFar.push(Sec);
                }
            }
        }
        if (this.fieldvalue.substr(this.fieldvalue.length - 1)) {
            for (let [str, Sec] of Object.entries(sections)) {
                let tempSec: any = Sec;
                if (SComparison.asteriskAtEndHelper(tempSec[this.fieldToSearch],
                    this.fieldvalue)) {
                    this.tempResultSoFar.push(Sec);
                }
            }
        }
    }

    private filterHelper(sections: any) {
        for (let [str, Sec] of Object.entries(sections)) {
            let tempSec: any = Sec;
            if (tempSec[this.fieldToSearch] === this.fieldvalue) {
                this.tempResultSoFar.push(Sec);
            }
        }
    }
}
