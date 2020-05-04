import Grouping from "./Grouping";
import {InsightError} from "./IInsightFacade";

export default class Group {
    private groups: string[];
    private grouping: Grouping;
    private dataset: any;
    private obj: any; // Whatever comes after GROUP:

    /*
    EBNF Rules GROUP: [' (key ',')* key ']
    TODO:
     GROUP Must Specify an Array - Error Check in Constructor
     GROUP Must Indicate at least one key
     */
    constructor(groupobj: any, rsfdataset: any) {
        // Throw any Errors in Grammar
        this.obj = groupobj;
        this.dataset = rsfdataset;
        // Test for An Array
        if (!Array.isArray(this.obj)) {
            throw new InsightError("Group Object Is Not An Array");
        } else {
            this.groups = this.obj;
        }
        if (this.obj.length < 1) {
            throw new InsightError("Group Array Has No Items");
        }
    }

    /*
    Requires: Nothing - 'Grouping' Handles the Load in this problem
    Effects: Returns a valid list of groups where criteria is clearly defined for each group
    */
    /*
    IMPORTANT NOTES ON IMPLEMENTATION
    WLOG: apply grouping should return in the format*/
    /*
        [ {criteria 1: ?, criteria 2: ?, .... criteria k: ?, result: AnArrayOfRecords},
        {criteria 1: ?, criteria 2: ?, .... criteria k: ?, result: AnArrayOfRecords}...]
        for all possible unique matchings!
        */
    /*
    For the sake of optimization at runtime, we will end up ignoring criteria combos with 0 items
     */
    public applygrouping(): any[] {
        // Local Variables Improve Testability
        let first = this.obj.shift(); // Should Remove the First Element and Return That Element
        let rest = this.obj; // Should Now Only Contain The Rest of The Elements
        this.grouping = new Grouping(this.dataset, first, rest, { });
        let gp = this.grouping.showGroups([]);
        return gp;
    }

    /*
    As in Transformations this tests the semantic validity, NOT the grammar
     */
    public isGroupValid?(existingColumnNames: string[]): boolean {
        // Test if Group Provided Is A Column
        for (const group of this.groups) {
            if (!existingColumnNames.includes(group)) {
                return false;
            }
        }
        return true;
    }
}
