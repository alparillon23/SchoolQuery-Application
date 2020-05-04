export default class GroupHelper {
    /*
       4. WISH LIST!: Helpers to build to make this simpler (and avoid ESLint Bullshit)
           - GroupHelper.unique(criteria: string, rsf) will return a set of unique values of criteria
           - GroupHelper.related_rsf(criteria: string, value: any, rsf) will
               return an rsf with only items that satisfy criteria==value
           - GroupHelper.nextCriteria(criteriaRemaining: string[]) will return criteriaRemaining[0]
           - GroupHelper.newRemainingCriteria(criteriaRemaining: string[]) will return criteriaRemaining[less 0]
           - GroupHelper.newMutableObject(oldMutableObj: any, newField: string, newValue: any)
           will take the old object and add newField
*/
    public unique(criteria: string, rsf: any[]): Set<any> {
        let uniqueSet = new Set();
        for (let record of rsf) {
            uniqueSet.add(record[criteria]);
        }
        return uniqueSet;
    }

    public relatedRSF(criteria: string, value: any, rsf: any[]): any[] {
        let records: any[] = [];
        for (let record of rsf) {
            if (record[criteria] === value) {
                records.push(record);
            }
        }
        return records;
    }

    public nextCriteria(criteriaRemaining: string[]): string {
        return criteriaRemaining[0];
    }

    public newRemainingCriteria(criteriaRemaining: string[]): string[] {
        let newRemaining: string[] = [];
        for (let str of criteriaRemaining) {
            newRemaining.push(str);
        }
        newRemaining.shift();
        return newRemaining;
    }

    public newMutableObject(oldMutableObj: any, newField: string, newValue: any): any {
        let newObj: any = {};
        let currentFields = Object.keys(oldMutableObj);
        for (let field of currentFields) {
                newObj[field] = oldMutableObj[field];
            }
        newObj[newField] = newValue;
        return newObj;
    }
}
