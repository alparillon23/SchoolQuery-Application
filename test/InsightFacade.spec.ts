import {expect} from "chai";
import * as fs from "fs-extra";
import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";
import Group from "../src/controller/Group";
import Grouping from "../src/controller/Grouping";
import GroupHelper from "../src/controller/GroupHelper";
import Sorting from "../src/controller/Sorting";
import Columns from "../src/controller/Columns";
import Scheduler from "../src/scheduler/Scheduler";
import {SchedRoom, SchedSection} from "../src/scheduler/IScheduler";


// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string;  // This is injected when reading the file
}

describe("InsightFacade load dataset from disk", function () {
    let insightFacade1: InsightFacade;
    let insightFacade2: InsightFacade;
    let content: any;
    let addPromise: any;
    const cacheDir = __dirname + "/../data";
    beforeEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs before each test, which should make each test independent from the previous one
        Log.test(`BeforeTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
        } catch (err) {
            Log.error(err);
        }
    });
    it("Reject duplicate addition for disk", function () {
        insightFacade1 = new InsightFacade();
        content = fs.readFileSync("./test/data/courses.zip").toString("base64");
        addPromise = insightFacade1.addDataset("courses", content, InsightDatasetKind.Courses).
        then((result: string[]) => {
            insightFacade2 = new InsightFacade();
            const id: string = "courses";
            const expected: string[] = [id];
            return insightFacade2.addDataset("courses", content, InsightDatasetKind.Courses).
            then((result1: string[]) => {
                // expect(result).to.deep.equal(expected);
                expect.fail(result1, expected, "Should be rejected");
            }).catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
        });
        });
});

describe("InsightFacade Add/Remove Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        illegal_id: "./test/data/illegal_id.zip",
        noCoursesDir: "./test/data/noCoursesDir.zip",
        incorrectCoursesDir: "./test/data/incorrectCoursesDir.zip",
        noCourseSections: "./test/data/noCourseSections.zip",
        garbageInCourses: "./test/data/garbageInCourses.zip",
        validWithGarbage: "./test/data/validWithGarbage.zip",
        corrupt: "./test/data/corrupt.zip",
        rooms: "./test/data/rooms.zip",
        roomsMissIndex: "./test/data/roomsMissIndex.zip",
        roomsNoRoom: "./test/data/roomsNoRoom.zip",
        roomsValidGarbage: "./test/data/roomsValidGarbage.zip"

    };
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
        }
    });

    beforeEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs before each test, which should make each test independent from the previous one
        Log.test(`BeforeTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });
    // Unit Tests for removeDataset
    // This is a unit test. You should create more like this!
    it("Should add a valid dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
            return insightFacade.listDatasets().then((returnedData: InsightDataset[]) => {
                expect(returnedData).to.have.length(1);
            }).catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });

    });
    it("Should add a valid rooms dataset", function () {
        const id: string = "rooms";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
            return insightFacade.listDatasets().then((returnedData: InsightDataset[]) => {
                expect(returnedData).to.have.length(1);
            }).catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });

    });
    it("Check nrows in rooms.zip", function () {
        const id: string = "rooms";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
            return insightFacade.listDatasets().then((returnedData: InsightDataset[]) => {
                expect(returnedData).to.have.length(1);
                expect(returnedData[0].numRows).equal(364);
            }).catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });

    });
    // it("Check nrows in roomsValidGarbage.zip", function () {
    //     const id: string = "roomsValidGarbage";
    //     const expected: string[] = [id];
    //     return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then((result: string[]) => {
    //         expect(result).to.deep.equal(expected);
    //         return insightFacade.listDatasets().then((returnedData: InsightDataset[]) => {
    //             expect(returnedData).to.have.length(1);
    //             expect(returnedData[0].numRows).equal(364);
    //         }).catch((err: any) => {
    //             expect.fail(err, expected, "Should not have rejected");
    //         });
    //     }).catch((err: any) => {
    //         expect.fail(err, expected, "Should not have rejected");
    //     });
    //
    // });
    it("Should add a valid dataset with garbage", function () {
        const id: string = "validWithGarbage";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
            return insightFacade.listDatasets().then((returnedData: InsightDataset[]) => {
                expect(returnedData).to.have.length(1);
            }).catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });

    });
    // reject with undefined id (also undefined dataset)
    it("Reject adding dataset with undefined id", function () {
        const id: string = undefined;
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, expected, "Should be rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Reject adding rooms dataset with no index.html", function () {
        const id: string = "roomsMissIndex";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, expected, "Should be rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Reject adding rooms dataset with no Room file", function () {
        const id: string = "roomsNoRoom";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, expected, "Should be rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("reject adding dataset with invalid id", function () {
        const id: string = "illegal_id";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, expected, "Should be rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceof(InsightError);
        });
    });
    // reject with corrupted zip file
    it("Reject adding dataset with corrupted zip file", function () {
        const id: string = "corrupt";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, expected, "Should be rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Reject adding dataset with corrupted zip file in Room", function () {
        const id: string = "corrupt";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then((result: string[]) => {
            expect.fail(result, expected, "Should be rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    // reject with illegal id (whitespace)
    it("Reject adding dataset with id containing only whitespace", function () {
        const id: string = " ";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, expected, "Should be rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Reject adding dataset with id containing only whitespace room", function () {
        const id: string = " ";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then((result: string[]) => {
            expect.fail(result, expected, "Should be rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    // reject with illegal id (containing underscore)
    it("Reject adding dataset with underscore in id", function () {
        const id: string = "illegal_id";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, expected, "Should be rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    // reject with duplicate dataset
    it("Reject duplicate addition", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            // expect(result).to.deep.equal(expected);
            return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
                .then((resultDeep: string[]) => {
                    expect.fail(result, expected, "Should be rejected");
                }).catch((err: any) => {
                    expect(err).to.be.instanceOf(InsightError);
                });
        });
    });
    // it("Reject duplicate addition in room", function () {
    //     const id: string = "rooms";
    //     const expected: string[] = [id];
    //     return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then((result: string[]) => {
    //         // expect(result).to.deep.equal(expected);
    //         return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms)
    //             .then((resultDeep: string[]) => {
    //                 expect.fail(result, expected, "Should be rejected");
    //             }).catch((err: any) => {
    //                 expect(err).to.be.instanceOf(InsightError);
    //             });
    //     });
    // });
    // reject non-existent dataset
    it("Reject adding non-existent dataset", function () {
        const id: string = "nonexistent";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, expected, "Should be rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    it("Reject adding non-existent dataset room", function () {
        const id: string = "nonexistent";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then((result: string[]) => {
            expect.fail(result, expected, "Should be rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    // reject dataset with no courses directory
    it("Reject dataset with no courses directory", function () {
        const id: string = "noCoursesDir";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, expected, "Should be rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    // reject dataset with incorrect courses directory
    it("Reject dataset with incorrect courses directory", function () {
        const id: string = "incorrectCoursesDir";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, expected, "Should be rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    // reject dataset with > 1 courses but no sections
    it("Reject dataset with > 1 courses but no sections", function () {
        const id: string = "noCourseSections";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, expected, "Should be rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    // reject dataset with garbage in courses folder
    it("Reject dataset with garbage in courses folder", function () {
        const id: string = "garbageInCourses";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail(result, expected, "Should be rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    // Unit Tests for removeDataset
    // Should pass on removal of a valid dataset
    it("Should pass on removal of a valid dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            // expect(result).to.deep.equal(expected);
            return insightFacade.removeDataset(id)
                .then((resultDeep: string) => {
                    expect(resultDeep).to.deep.equal(id);
                }).catch((err: any) => {
                    expect.fail(err, expected, "Should not have rejected");
                });
        });
    });
    it("Should pass with empty list on removal of a valid dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            // expect(result).to.deep.equal(expected);
            return insightFacade.removeDataset(id)
                .then((resultDeep: string) => {
                    insightFacade.listDatasets().then((val: InsightDataset[]) => {
                        expect(val.length).to.equal(0);
                    }).catch((reason: any) => {
                        expect.fail(reason, expected, "Should not have rejected listing");
                    });
                    expect(resultDeep).to.deep.equal(id);
                }).catch((err: any) => {
                    expect.fail(err, expected, "Should not have rejected removing");
                });
        });
    });
    // reject with undefined id (also undefined dataset)
    it("Reject removing dataset with undefined id", function () {
        const id: string = undefined;
        const expected: string[] = [id];
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result, expected, "Should be rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    // reject with illegal id (whitespace)
    it("Reject removing dataset with id containing only whitespace", function () {
        const id: string = " ";
        const expected: string[] = [id];
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result, expected, "Should be rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    // reject with illegal id (containing underscore)
    it("Reject removing dataset with underscore in id", function () {
        const id: string = "illegal_id";
        const expected: string[] = [id];
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result, expected, "Should be rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
    // reject with removal of non-existent dataset with no dataset added
    it("Reject removing a dataset from empty datasets", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade.removeDataset(id).then((result: string) => {
            expect.fail(result, expected, "Should be rejected");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(NotFoundError);
        });
    });
    // reject removing a dataset not been added yet but some data added
    it("Reject removing a dataset not been added yet", function () {
        const idAdd: string = "courses";
        const idRemove: string = "nonexistent";
        const expected: string[] = [idAdd];
        return insightFacade.addDataset(idAdd, datasets[idAdd], InsightDatasetKind.Courses).then((result: string[]) => {
            // expect(result).to.deep.equal(expected);
            return insightFacade.removeDataset(idRemove)
                .then((resultDeep: string) => {
                    expect.fail(resultDeep, expected, "Should be rejected");
                }).catch((err: any) => {
                    expect(err).to.be.instanceOf(NotFoundError);
                });
        });
    });
});

describe("Testing Group Functions", function () {
    it("ORDER - Should Implement Columns Specified", function () {
        let testobj = [{ apple : 4 , turn : "me", over : 5},
            { apple : 3 , turn : "ma", over : 5}, { apple : 4 , turn : "mi", over : 5},
            { apple : 5 , turn : "mo", over : 5}, { apple : 3, turn : "my", over : 5},
            { apple : 5 , turn : "mu", over : 5}];
        let criteria = ["apple", "turn"];
        let expected = [{ apple : 4 , turn : "me"},  { apple : 3 , turn : "ma"},
            { apple : 4 , turn : "mi"}, { apple : 5 , turn : "mo"}, { apple : 3, turn : "my"},
            { apple : 5 , turn : "mu"}];
        let order = new Columns(testobj, criteria);
        let actual = order.applyColumns();
        expect(expected).to.deep.equal(actual);
    });
    it("Group - Should Group By Criteria Provided", function () {
        let testobj = [{ apple : 4 , turn : "me", over : 5},
            { apple : 3 , turn : "ma", over : 5}, { apple : 4 , turn : "mi", over : 5},
            { apple : 5 , turn : "mo", over : 5}, { apple : 3, turn : "my", over : 5},
            { apple : 5 , turn : "mu", over : 5}];
        let criteria = ["apple"];
        let expected = [
            { apple: 4, result: [{ apple : 4 , turn : "me", over : 5}, { apple : 4 , turn : "mi", over : 5}]},
            { apple: 3, result: [{ apple : 3 , turn : "ma", over : 5}, { apple : 3, turn : "my", over : 5}]},
            { apple: 5, result: [{ apple : 5 , turn : "mo", over : 5}, { apple : 5 , turn : "mu", over : 5}]}];
        let group = new Grouping(testobj, "apple", [ ], { });
        let actual = group.showGroups([]);
        expect(expected).to.deep.equal(actual);
    });
    it("GroupHelper - Test to Return RSF", function () {
        let testobj = [{ apple : 4 , turn : "me", over : 5},
            { apple : 3 , turn : "ma", over : 5}, { apple : 4 , turn : "mi", over : 5},
            { apple : 5 , turn : "mo", over : 5}, { apple : 3, turn : "my", over : 5},
            { apple : 5 , turn : "mu", over : 5}];
        let criteria = "apple";
        let expected =  [{ apple : 4 , turn : "me", over : 5}, { apple : 4 , turn : "mi", over : 5}];
        let group = new GroupHelper();
        let actual = group.relatedRSF(criteria, 4, testobj);
        expect(expected).to.deep.equal(actual);
    });
    it("GroupHelper - Test to Append New Criteria", function () {
        let testobj = {apple: 4};
        let group = new GroupHelper();
        let expected = {apple: 4, man: 5};
        let actual = group.newMutableObject(testobj, "man", 5);
        expect(expected).to.deep.equal(actual);
    });
    it("GroupHelper - Test For Next Criteria", function () {
        let testobj = ["apple", "boy", "girl"];
        let group = new GroupHelper();
        let expected = "apple";
        let actual = group.nextCriteria(testobj);
        expect(expected).to.deep.equal(actual);
        let nexpected = ["boy", "girl"];
        let nactual = group.newRemainingCriteria(testobj);
        expect(nexpected).to.deep.equal(nactual);
    });
    it("GroupHelper - Get Unique Values", function () {
        let testobj = [{ apple : 4 , turn : "me", over : 5},
            { apple : 3 , turn : "ma", over : 5}, { apple : 4 , turn : "mi", over : 5},
            { apple : 5 , turn : "mo", over : 5}, { apple : 3, turn : "my", over : 5},
            { apple : 5 , turn : "mu", over : 5}];
        let criteria = "apple";
        let expected: Set<any> = new Set<any>();
        expected.add(4);
        expected.add(3);
        expected.add(5);
        let group = new GroupHelper();
        let actual = group.unique(criteria, testobj);
        expect(expected).to.deep.equal(actual);
    });
    it("Group - Should Return The Group Criteria 2 Fields", function () {
        let testobj = [{ apple : 4 , turn : "me", over : 5},
            { apple : 3 , turn : "ma", over : 5}, { apple : 4 , turn : "mi", over : 6},
            { apple : 5 , turn : "mo", over : 6}, { apple : 3, turn : "my", over : 6},
            { apple : 5 , turn : "mu", over : 5}];
        let criteria = ["apple", "over"];
        let expected = [
            { apple: 4, over: 5, result: [{ apple : 4 , turn : "me", over : 5}]},
            { apple: 4, over: 6, result: [{ apple : 4 , turn : "mi", over : 6}]},
            { apple: 3, over: 5, result: [{ apple : 3 , turn : "ma", over : 5}]},
            { apple: 3, over: 6, result: [{ apple : 3 , turn : "my", over : 6}]},
            { apple: 5, over: 6, result: [{ apple : 5 , turn : "mo", over : 6}]},
            { apple: 5, over: 5, result: [{ apple : 5 , turn : "mu", over : 5}]}];
        let group = new Grouping(testobj, "apple", ["over"], { });
        let actual = group.showGroups([]);
        expect(expected).to.deep.equal(actual);
    });
    it("Group - Should Return The GROUPINGS from GROUP", function () {
        let testobj = [{ apple : 4 , turn : "me", over : 5},
            { apple : 3 , turn : "ma", over : 5}, { apple : 4 , turn : "mi", over : 6},
            { apple : 5 , turn : "mo", over : 6}, { apple : 3, turn : "my", over : 6},
            { apple : 5 , turn : "mu", over : 5}];
        let criteria = ["apple", "over"];
        let expected = [
            { apple: 4, over: 5, result: [{ apple : 4 , turn : "me", over : 5}]},
            { apple: 4, over: 6, result: [{ apple : 4 , turn : "mi", over : 6}]},
            { apple: 3, over: 5, result: [{ apple : 3 , turn : "ma", over : 5}]},
            { apple: 3, over: 6, result: [{ apple : 3 , turn : "my", over : 6}]},
            { apple: 5, over: 6, result: [{ apple : 5 , turn : "mo", over : 6}]},
            { apple: 5, over: 5, result: [{ apple : 5 , turn : "mu", over : 5}]}];
        let group = new Group(criteria, testobj);
        let actual = group.applygrouping();
        expect(expected).to.deep.equal(actual);
    });
});

describe("Testing Sort Functions", function () {
    it("Sort Fields", function () {
        let testobj = [{ apple : 4 , turn : "me", over : 5},
            { apple : 3 , turn : "ma", over : 5}, { apple : 4 , turn : "mi", over : 6},
            { apple : 5 , turn : "mo", over : 6}, { apple : 3, turn : "my", over : 6},
            { apple : 5 , turn : "mu", over : 5}];
        let criteria = ["apple", "over"];
        let order = {dir: "UP", keys: criteria};
        let expected = [{ apple : 3 , turn : "ma", over : 5}, { apple : 3, turn : "my", over : 6},
            { apple : 4 , turn : "me", over : 5}, { apple : 4 , turn : "mi", over : 6},
            { apple : 5 , turn : "mu", over : 5}, { apple : 5 , turn : "mo", over : 6}];
        let sort = new Sorting(testobj, order);
        let actual = sort.applySort();
        expect(expected).to.deep.equal(actual);
    });
    it("Sort Fields - No DIR", function () {
        let testobj = [{ apple : 4 , turn : "me", over : 5},
            { apple : 3 , turn : "ma", over : 5}, { apple : 4 , turn : "mi", over : 6},
            { apple : 5 , turn : "mo", over : 6}, { apple : 3, turn : "my", over : 6},
            { apple : 5 , turn : "mu", over : 5}];
        let criteria = ["apple", "over"];
        let order = {keys: criteria};
        let expected = [{ apple : 3 , turn : "ma", over : 5}, { apple : 3, turn : "my", over : 6},
            { apple : 4 , turn : "me", over : 5}, { apple : 4 , turn : "mi", over : 6},
            { apple : 5 , turn : "mu", over : 5}, { apple : 5 , turn : "mo", over : 6}];
        try {
            let sort = new Sorting(testobj, order);
            expect.fail("NO ERROR CAUGHT");
        } catch (er) {
            if (er instanceof InsightError) {
                // do nothing
            } else {
                expect.fail("WRONG ERROR CAUGHT");
            }
        }
    });
});
describe("Making Tests For Scheduler", function () {
    it("Should prune the records", function () {
        let schedule: Scheduler = new Scheduler();
        let input: any[] = [[1, 2, 3], [2, 4, 6], [3, {}, 4], [5, 6, 7]];
        let expected: any[] = [[1, 2, 3], [2, 4, 6], [5, 6, 7]];
        let actual: any[] = schedule.pruningResults(input);
        expect(actual).to.deep.equal(expected);
    });
    // eslint-disable-next-line @typescript-eslint/tslint/config
    it("Check if integration actually works", function () {
        let schedule: Scheduler = new Scheduler();
        let room: SchedRoom[] = [{
            rooms_shortname: "AERL",
            rooms_number: "120",
            rooms_seats: 144,
            rooms_lat: 49.26372,
            rooms_lon: -123.25099
        },
            {
                rooms_shortname: "ALRD",
                rooms_number: "105",
                rooms_seats: 94,
                rooms_lat: 49.2699,
                rooms_lon: -123.25318
            },
            {
                rooms_shortname: "ANGU",
                rooms_number: "098",
                rooms_seats: 260,
                rooms_lat: 49.26486,
                rooms_lon: -123.25364
            },
            {
                rooms_shortname: "BUCH",
                rooms_number: "A101",
                rooms_seats: 275,
                rooms_lat: 49.26826,
                rooms_lon: -123.25468
            }];
        let sched: SchedSection[] = [
            {
                courses_dept: "cpsc",
                courses_id: "340",
                courses_uuid: "1319",
                courses_pass: 101,
                courses_fail: 7,
                courses_audit: 2
            },
            {
                courses_dept: "cpsc",
                courses_id: "340",
                courses_uuid: "3397",
                courses_pass: 171,
                courses_fail: 3,
                courses_audit: 1
            },
            {
                courses_dept: "cpsc",
                courses_id: "344",
                courses_uuid: "62413",
                courses_pass: 93,
                courses_fail: 2,
                courses_audit: 0
            },
            {
                courses_dept: "cpsc",
                courses_id: "344",
                courses_uuid: "72385",
                courses_pass: 43,
                courses_fail: 1,
                courses_audit: 0
            }
        ];
        let expected: any[] = [[ { rooms_shortname: "AERL",
            rooms_number: "120",
            rooms_seats: 144,
            rooms_lat: 49.26372,
            rooms_lon: -123.25099 },
            { courses_dept: "cpsc",
                courses_id: "340",
                courses_uuid: "1319",
                courses_pass: 101,
                courses_fail: 7,
                courses_audit: 2 },
            "MWF 0800-0900" ],
            [ { rooms_shortname: "ANGU",
                rooms_number: "098",
                rooms_seats: 260,
                rooms_lat: 49.26486,
                rooms_lon: -123.25364 },
                { courses_dept: "cpsc",
                    courses_id: "340",
                    courses_uuid: "3397",
                    courses_pass: 171,
                    courses_fail: 3,
                    courses_audit: 1 },
                "MWF 0800-0900" ],
            [ { rooms_shortname: "BUCH",
                rooms_number: "A101",
                rooms_seats: 275,
                rooms_lat: 49.26826,
                rooms_lon: -123.25468 },
                { courses_dept: "cpsc",
                    courses_id: "344",
                    courses_uuid: "62413",
                    courses_pass: 93,
                    courses_fail: 2,
                    courses_audit: 0 },
                "MWF 0800-0900" ],
            [ { rooms_shortname: "ALRD",
                rooms_number: "105",
                rooms_seats: 94,
                rooms_lat: 49.2699,
                rooms_lon: -123.25318 },
                { courses_dept: "cpsc",
                    courses_id: "344",
                    courses_uuid: "72385",
                    courses_pass: 43,
                    courses_fail: 1,
                    courses_audit: 0 },
                "MWF 0800-0900" ]];
        let actual: any[] = schedule.schedule(sched, room);
        expect(actual).to.deep.equal(expected);
    });

});
/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: any } = {
        courses: {id: "courses", path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
        rooms: {id: "rooms", path: "./test/data/rooms.zip", kind: InsightDatasetKind.Rooms}
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        Log.test(`Before: ${this.test.parent.title}`);
        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${err}`);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        insightFacade = new InsightFacade();
        for (const key of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[key];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(insightFacade.addDataset(ds.id, data, ds.kind));
        }
        return Promise.all(loadDatasetPromises).catch((err) => {
            /* *IMPORTANT NOTE: This catch is to let this run even without the implemented addDataset,
             * for the purposes of seeing all your tests run.
             * For D1, remove this catch block (but keep the Promise.all)
             */
            return Promise.resolve("HACK TO LET QUERIES RUN");
        });
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function (done) {
                    insightFacade.performQuery(test.query).then((result) => {
                        TestUtil.checkQueryResult(test, result, done);
                    }).catch((err) => {
                        TestUtil.checkQueryResult(test, err, done);
                    });
                });
            }
        });
    });
});
