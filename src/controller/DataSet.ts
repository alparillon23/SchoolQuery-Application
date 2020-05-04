import Section from "./Section";
import Room from "./Room";
import {InsightDatasetKind} from "./IInsightFacade";

// export default class DataSet {
//     public records: {[index: string]: Section};
//     public id: string;
//
//     constructor(id: string) {
//         this.id = id;
//         this.records = {};
//     }
//
//     public addRecord(section: Section) {
//         this.records[section.uuid] = section;
//     }
//
// }

export default class DataSet {
    public records: any;
    public id: string;
    public type: InsightDatasetKind;

    constructor(id: string, type: InsightDatasetKind) {
        this.id = id;
        this.records = {};
        this.type = type;
        if (type === InsightDatasetKind.Courses) {
            this.records = this.records as {[index: string]: Section};
        } else if (type === InsightDatasetKind.Rooms) {
            this.records = this.records as {[index: string]: Room};
        }
    }

    public addRecord(record: any) {
        if (record instanceof Section) {
            this.records[record.uuid] = record;
        } else if (record instanceof Room) {
            this.records[record.name] = record;
        }
    }

}
