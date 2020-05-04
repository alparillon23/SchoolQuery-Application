import Filter from "./Filter";
import DataSets from "./DataSets";
import {InsightDataset, InsightError} from "./IInsightFacade";
import SComparison from "./SComparison";
import MComparison from "./MComparison";
import LogicComparison from "./LogicComparison";
import InsightFacade from "./InsightFacade";
import DataSet from "./DataSet";

export default class Negation extends Filter {
    private filter: Filter;

    constructor(kkey: string, vvalue: any) {
        if (typeof(vvalue) !== "object") {
            throw new InsightError("Invalid value to NOT");
        }
        if (Object.keys(vvalue).length !== 1) {
            throw new InsightError("Too many keys for NOT");
        }
        super(kkey, vvalue);
        if (vvalue.hasOwnProperty("AND")) {
            this.filter = new LogicComparison ("AND", vvalue.AND);
        } else if (vvalue.hasOwnProperty("OR")) {
            this.filter = new LogicComparison ("OR", vvalue.OR);
        } else if (vvalue.hasOwnProperty("IS")) {
            this.filter = new SComparison ("IS", vvalue.IS);
        } else if (vvalue.hasOwnProperty("LT")) {
            this.filter = new MComparison ("LT", vvalue.LT);
        } else if (vvalue.hasOwnProperty("GT")) {
            this.filter = new MComparison ("GT", vvalue.GT);
        } else if (vvalue.hasOwnProperty("EQ")) {
            this.filter = new MComparison ("EQ", vvalue.EQ);
        } else if (vvalue.hasOwnProperty("NOT")) {
            this.filter = new Negation ("NOT", vvalue.NOT);
        } else {
            throw new InsightError("Invalid Field");
        }
    }

    public applyFilter(ds: DataSet, resultSoFar: any[]): any[] {
        try {
            if (this.isValid()) {
                let tempArr: any[] = this.filter.applyFilter(ds, resultSoFar);
                resultSoFar = resultSoFar.filter((val) => !tempArr.includes(val));
            }
            return resultSoFar;
            } catch (e) {
            throw new InsightError(e);
        }
    }

    protected isValid(): boolean {
        if (this.key !== "NOT") {
            throw new InsightError("NOT is invalid");
        } else {
            return true;
        }
    }

}
