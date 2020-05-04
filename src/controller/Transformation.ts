import Group from "./Group";
import Apply from "./Apply";
import {InsightError} from "./IInsightFacade";

export default class Transformation {

    private group: Group;
    private apply: Apply;
    private object: any; // The Resulting Query - Whatever That May Be {Transformation: object}
    private dataset: any; // The Beginning Dataset, where the fun begins.

    /*
    EBNF Rules TRANSFORMATIONS: {' GROUP ', ' APPLY '}'}
                                GROUP: [' (key ',')* key ']
                                APPLY: [' (APPLYRULE (', ' APPLYRULE )* )? ']
                                */
    /*
    TODO: Grammar Caveats In English:
            Transformations MUST specify an object - Error Check in Constructor
            Transformations MUST specify a GROUP and an APPLY KEY - Error Check in Constructor
            APPLY can be an empty array - Apply Should Only test if its provided an array - Apply Constructor
            Group must be by at least one key - Group should test if the value
            given is an array and if it's valid - Group Constructor
     */
    /*
    For this implementation, we leave error checking to the bodies that are being inspected. Isolate from Query
    and apply them directly here and in other clauses - Quick Fixes are problematic and non compliant to ESLint
     */
    constructor(query: any, dataset: any) {
       // handle this implementation based only on grammar rules
        this.object = query;
        this.dataset = dataset;
        try {
            if (query.hasOwnProperty("GROUP")) {
                this.group = new Group(query["GROUP"], dataset);
            } else {
                throw new InsightError("GROUP not specified");
            }
            if (query.hasOwnProperty("APPLY")) {
                this.apply = new Apply (dataset, query["APPLY"]);
            } else {
                throw new InsightError("APPLY not specified");
            }
        } catch (er) {
            throw new InsightError("Poor Transformation Spec Found" + er);
        }
    }

    /*
      Should be able to:
      1. Check Validity (Helper!!)
      iff Valid
      2. Return Resulting Dataset
      else
      3. Return Error Message

      Resulting Dataset, should ideally be
        1. Array of OBJECTS
     */
    public applyTransformations(): any [] {
        let records: any[];
        try {
            if (this.group.isGroupValid(Object.keys(this.dataset[0]))) {
                records = this.group.applygrouping();
            } else {
                throw new InsightError("Invalid Grouping Used Here");
            }
            this.apply = new Apply(records, this.object["APPLY"]);
            if (this.apply.isApplyValid(Object.keys(records[0]))) {
                records = this.apply.setApply();
            } else {
                throw new InsightError("Invalid Apply Used Here");
            }
        } catch (er) {
            throw new InsightError("Transformation Invalid: " + er);
        }
        return records;
    }

    /*
    This will form a semantics check.
        1. If columns specified are invalid. (By using multiple types, by non existence, etc.)
        likely more conditions but great to build a laundry list of whats valid by syntax but not by semantics
        going forward.
        captures member classes validity simultaneously
    TODO:
         Returns True iff the Transformation Clause is Valid
         Accepts Columns of dataset specified
     */
    /*
    public isTransformationValid? (existingColumnNames: string[]): boolean {
        return false;
    }
    */


}
