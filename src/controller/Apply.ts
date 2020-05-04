import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import DataSet from "./DataSet";
import {Decimal} from "decimal.js";
import {split} from "ts-node";
import apply = Reflect.apply;

export default class Apply {
    /*
    EBNF rules: APPLY: [' (APPLYRULE (', ' APPLYRULE )* )? ']
    TODO
        Test for an array
        Test for ApplyRule fields
    WILL ACCEPT A GROUPING DATASET, THE APPLY RULE(S) and custom names
     */
    private ruleNames: any[] = []; // "overallAVG"
    private rules: any[] = []; // "AVG" : "courses_avg"
    private groupDS: any[];
    private applyTOKEN: string[] = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
    private mfieldSections: string[];
    private sfieldSections: string[];
    private dataSetID: string;
    private dataSetType: string;

    constructor(groupeddataset: any[], anies: any[]) {
        /*
        Goal:
        Store the grouped dataset from 'Group'
        Store rules and names as is
         */
        if (!Array.isArray(anies)) {
            throw new InsightError("APPLY is invalid.");
        }
        for (let applyRule of anies) {
            // check if there is only 1 key in applyrule.
            if (Object.keys(applyRule).length !== 1) {
                throw new InsightError("APPLYRULE is invalid.");
            }
            let tempStr: string = Object.keys(applyRule)[0];
            if (tempStr.indexOf("_") !== -1) {
                throw new InsightError("applyKey has underscore");
            }
            if (this.ruleNames.includes(tempStr)) {
                throw new InsightError("Duplicate APPLY key: " + tempStr);
            } else {
                this.ruleNames.push(tempStr);
                this.rules.push(applyRule[tempStr]);
            }
        }
        this.groupDS = groupeddataset;
        this.mfieldSections = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
        this.sfieldSections = ["dept", "id", "instructor", "title", "uuid",
            "fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
    }
    /*
    Assuming that the Apply Rules are legitimate
    (handle semantics in the other method, Transformation will handle when it's not)
    Feel free to add helpers to this
     */

    public setApply(): any[] {
        let records: any[];
        for (let group of this.groupDS) {
            delete group[Object.keys(group).length - 1];
            let tempArrRecords: any[] = group["result"];
            for (let i = 0; i < this.ruleNames.length; i++) {
                let field: string = this.rules[i][Object.keys(this.rules[i])[0]];
                group[this.ruleNames[i]] = Apply.setApplyHelper(Object.keys(this.rules[i])[0], tempArrRecords, field);
            }
        }
        records = this.groupDS;
        return records;
        }

    /*
    returns true IFF Apply semantics are all valid
    will accept a list of columns - feel free to add more params at this stage
    bruh
     */
    public isApplyValid(listofdata: string[]): boolean {
        for (let applyBody of this.rules) {
            let tempLength: number = Object.keys(applyBody).length;
            // check for if the body has any tokens and keys.
            if (tempLength === 0) {
                throw new InsightError("Apply body is invalid.");
            }
            // check for if the token is valid
            if (!this.applyTOKEN.includes(Object.keys(applyBody)[0])) {
                throw new InsightError("Invalid token.");
            }
            // check if the body has multiple tokens that aren't the same.
            let tempArr: string[] = [Object.keys(applyBody)[0]];
            for (let i = 0; i < tempLength; i++) {
                if (!tempArr.includes(Object.keys(applyBody)[i])) {
                    throw new InsightError("Apply body should only have 1 key.");
                }
            }
            for (let i = tempLength - 2; i >= 0 ; i--) {
                delete Object.keys(applyBody)[i];
            }
            let field: string = applyBody[Object.keys(applyBody)[tempLength - 1]];
            // check if there is no key to apply
            if (field === null) {
                throw new InsightError("no key in applyBody.");
            }
            // check if the key given is valid
            if (field.indexOf("_") <= 0) {
                throw new InsightError("key is not valid");
            }
            let splitted: string[] = field.split("_");
            let tempKey: string = splitted[1];
            // check if the apply body is attempting to query more than 1 dataset.
            let bla: any = this.groupDS[0];
            let bla1: any = bla["result"];
            let bla2: any = Object.keys(bla1[0]);
            if (!bla2.includes(field)) {
                throw new InsightError("Invalid key in APPLYBODY");
            }
            // check if the key is correct based on token.
            if (Object.keys(applyBody)[tempLength - 1] !== "COUNT") {
                if (!this.mfieldSections.includes(tempKey)) {
                    throw new InsightError("Invalid key in " + Object.keys(applyBody)[tempLength - 1]);
                }
            }
        }
        return true;
    }

    // does the actual applyToken applying.
    private static setApplyHelper(ruleName: any, recordsArr: any[], key: string): any {
        let tempResult: any;
        if (ruleName === "MAX") {
            tempResult = recordsArr[0][key];
            for (let section of recordsArr) {
                if (section[key] > tempResult) {
                    tempResult = section[key];
                }
            }
        } else if (ruleName === "MIN") {
            tempResult = recordsArr[0][key];
            for (let section of recordsArr) {
                if (section[key] < tempResult) {
                    tempResult = section[key];
                }
            }
        } else if (ruleName === "AVG") {
            let tempTotal: Decimal = new Decimal(0);
            for (let section of recordsArr) {
                let tempNum = new Decimal(section[key]);
                tempTotal = tempTotal.plus(tempNum);
            }
            let tempAvg: number = tempTotal.toNumber();
            if (recordsArr.length !== 0) {
                tempAvg = tempTotal.toNumber() / recordsArr.length;
            }
            tempResult = Number(tempAvg.toFixed(2));
        } else if (ruleName === "SUM") {
            tempResult = 0;
            for (let section of recordsArr) {
                tempResult = tempResult + section[key];
            }
            tempResult = Number(tempResult.toFixed(2));
        } else {
            tempResult = 0;
            let tempArr: any[] = [];
            for (let section of recordsArr) {
                if (!tempArr.includes(section[key])) {
                    tempResult++;
                    tempArr.push(section[key]);
                }
            }
        }
        return tempResult;
    }

}
