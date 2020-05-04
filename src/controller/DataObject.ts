import Section from "./Section";
import Room from "./Room";
import {InsightError} from "./IInsightFacade";

export default class DataObject {

    // Helper Object That will Take a List of Sections/Rooms and outputs the desired JSON format
    public convertToJSON(ud: any[], datasetId: string): any[] {
        let records: any[] = [];
        for (let udr of ud) {
            records.push(this.selectColumnsAsObj(udr, datasetId));
            // if (udr instanceof Section) {
            //     records.push(this.selectColumnsAsObj(udr, "courses"));
            // } else if (udr instanceof Room) {
            //     records.push(this.selectColumnsAsObj(udr, "rooms"));
            // } else {
            //     throw new InsightError("Invalid Type");
            // }
        }
        return records;
    }


    private selectColumnsAsObj(udr: any, datasetId: string): any {
        let newData: any = {};
        Object.keys(udr).forEach((col) => {
            let rawcol: string = col;
            if (col === "numberRename") {
                rawcol = "number";
            }
            let colLong = datasetId + "_" + rawcol;
            newData[colLong] = udr[col];
        });
        return newData;
    }
}
