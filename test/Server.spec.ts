import Server from "../src/rest/Server";

import InsightFacade from "../src/controller/InsightFacade";
import {expect} from "chai";
import Log from "../src/Util";
import * as fs from "fs-extra";
import {InsightDatasetKind} from "../src/controller/IInsightFacade";
import TestUtil from "./TestUtil";
import {ITestQuery} from "./InsightFacade.spec";
import chai = require("chai");
import chaiHttp = require("chai-http");
import Response = ChaiHttp.Response;

describe("Facade D3 PUT", function () {

    let facade: InsightFacade = null;
    let server: Server = null;
    const cacheDir = __dirname + "/../data";
    // dataset of datasets to test PUT for
    const datasetsToTest: { [id: string]: any } = {
        courses: {id: "courses", kind: InsightDatasetKind.Courses, valid: true},
        rooms: {id: "rooms", kind: InsightDatasetKind.Rooms, valid: true},
        validCourseButWrongTypeTest: {id: "validCourseButWrongTypeTest", kind: "random", valid: false}
    };

    chai.use(chaiHttp);

    before(function () {
        try {
        if (fs.existsSync(cacheDir + "/courses")) {
            fs.unlinkSync(cacheDir + "/courses");
        }
        if (fs.existsSync(cacheDir + "/rooms")) {
            fs.unlinkSync(cacheDir + "/rooms");
        }
        fs.removeSync(cacheDir);
        fs.mkdirSync(cacheDir);
    } catch (err) {
        Log.error(err);
    }
        facade = new InsightFacade();
        server = new Server(4321);
        server.start().catch((err: any) => {
            Log.error("Could not start the server due to " + err);
        });
    });

    after(function () {
        server.stop();
        try {
            if (fs.existsSync(cacheDir + "/courses")) {
                fs.unlinkSync(cacheDir + "/courses");
            }
            if (fs.existsSync(cacheDir + "/rooms")) {
                fs.unlinkSync(cacheDir + "/rooms");
            }
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
        } catch (err) {
            Log.error(err);
        }
        Log.test("server stopped");
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        Log.test(server.insf.listDatasets());
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        Log.test(server.insf.listDatasets());
    });

    describe("PUT test for each dataset", function () {
        for (let key of Object.keys(datasetsToTest)) {
            it(datasetsToTest[key].id + "dataset PUT test", function () {
                try {
                    let ds: any = datasetsToTest[key];
                    if (ds.valid) {
                        return chai.request("http://localhost:4321")
                            .put("/dataset/" + ds.id + "/" + ds.kind)
                            .send(fs.readFileSync("./test/data/" + ds.id + ".zip"))
                            .set("Content-Type", "application/x-zip-compressed")
                            .then((res: Response) => {
                                Log.test("status is: " + res.status);
                                Log.test("Response body is: " + res.body.result);
                                expect(res.status).to.be.equal(200);
                            }).catch((err: any) => {
                                Log.test("error is: " + err["response"].error.text);
                                expect.fail("Should not have failed");
                            });
                    } else {
                        return chai.request("http://localhost:4321")
                            .put("/dataset/" + ds.id + "/" + ds.kind)
                            .send(fs.readFileSync("./test/data/" + ds.id + ".zip"))
                            .set("Content-Type", "application/x-zip-compressed")
                            .then((res: Response) => {
                                Log.test("status is: " + res.status);
                                expect.fail("Should not have added dataset");
                            }).catch((err: any) => {
                                Log.test("error is: " + err["response"]["error"].text);
                                expect(err.status).to.be.equal(400);
                            });
                    }
                } catch (err) {
                    Log.test(err);
                }
            });
        }
    });
});

describe("Facade D3 DELETE", function () {
    let facade: InsightFacade = null;
    let server: Server = null;
    const datasetsToRemove: { [id: string]: any} = {
        courses: {id: "courses", valid: true, kind: InsightDatasetKind.Courses},
        rooms: {id: "rooms", valid: true, kind: InsightDatasetKind.Rooms},
        // undefined: {id: undefined, valid: false, kind: InsightDatasetKind.Courses},
        invalid_id: {id: "invalid_id", valid: false, kind: InsightDatasetKind.Courses},
        invalidWhitespace: {id: "   ", valid: false, kind: InsightDatasetKind.Courses}
    };
    let validButNonExistent: any = {id: "validButNonExistent", valid: false, kind: InsightDatasetKind.Courses};
    const cacheDir = __dirname + "/../data";

    chai.use(chaiHttp);

    before(function () {
        try {
            if (fs.existsSync(cacheDir + "/courses")) {
                fs.unlinkSync(cacheDir + "/courses");
            }
            if (fs.existsSync(cacheDir + "/rooms")) {
                fs.unlinkSync(cacheDir + "/rooms");
            }
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
        } catch (err) {
            Log.error(err);
        }
        facade = new InsightFacade();
        server = new Server(4321);
        server.start().catch((err: any) => {
            Log.error("Could not start the server due to " + err);
        });
        Log.test(server.insf.listDatasets());
        const datasetsToQuery: { [id: string]: any } = {
            courses: {id: "courses", path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
            rooms: {id: "rooms", path: "./test/data/rooms.zip", kind: InsightDatasetKind.Rooms}
        };
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        let insightFacade: InsightFacade;
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

    after(function () {
        server.stop();
        try {
            if (fs.existsSync(cacheDir + "/courses")) {
                fs.unlinkSync(cacheDir + "/courses");
            }
            if (fs.existsSync(cacheDir + "/rooms")) {
                fs.unlinkSync(cacheDir + "/rooms");
            }
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
        } catch (err) {
            Log.error(err);
        }
        Log.test("server stopped");
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        Log.test(server.insf.listDatasets());
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        Log.test(server.insf.listDatasets());
    });

    it(validButNonExistent.id + " DELETE dataset not found test", function () {
        return chai.request("http://localhost:4321")
                .del("/dataset/" + validButNonExistent.id)
                .then((res: Response) => {
                    expect.fail("Should not have deleted dataset");
                }).catch((err: any) => {
                    expect(err.status).to.be.equal(404);
                });
    });

    describe("DELETE test for datasets", function () {
        for (let key of Object.keys(datasetsToRemove)) {
            it(key + " DELETE dataset test", function () {
                    let ds: any = datasetsToRemove[key];
                    if (ds.valid) {
                        return chai.request("http://localhost:4321")
                            .del("/dataset/" + ds.id)
                            .then((res: Response) => {
                                Log.test("status is: " + res.status);
                                Log.test("result is: " + res.body.result);
                                expect(res.status).to.be.equal(200);
                            }).catch((err: any) => {
                                Log.test("error is: " + err);
                                expect.fail();
                            });
                    } else {
                        return chai.request("http://localhost:4321")
                            .del("/dataset/" + ds.id)
                            .then((res: Response) => {
                                Log.test("status is: " + res.status);
                                expect.fail();
                            }).catch((err: any) => {
                                Log.test("error is: " + err.status);
                                expect(err.status).to.be.equal(400);
                            });
                    }
            });
        }
    });
});

describe("Facade D3 POST", () => {
    let facade: InsightFacade = null;
    let server: Server = null;
    let validQuery: any;
    let invalidQuery: any;
    let testQueries: ITestQuery[] = [];
    const cacheDir = __dirname + "/../data";

    chai.use(chaiHttp);

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        try {
            if (fs.existsSync(cacheDir + "/courses")) {
                fs.unlinkSync(cacheDir + "/courses");
            }
            if (fs.existsSync(cacheDir + "/rooms")) {
                fs.unlinkSync(cacheDir + "/rooms");
            }
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
        } catch (err) {
            Log.error(err);
        }
        facade = new InsightFacade();
        server = new Server(4321);
        server.start().then(function (val: boolean) {
            Log.test("Server started: " + val);
        }).catch((err: any) => {
            Log.error("Could not start the server due to " + err);
        });
        Log.test("Server started");
        Log.test(server);
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${err}`);
        }
        for (let test of testQueries) {
            if (test.filename === "test/queries/ANDvalid.json") {
                validQuery = test.query;
            } else {
                if (test.filename !== "test/queries/ANDinvalidObj.json") {
                    continue;
                }
                invalidQuery = test.query;
            }
        }
        const datasetsToQuery: { [id: string]: any } = {
            courses: {id: "courses", path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
            rooms: {id: "rooms", path: "./test/data/rooms.zip", kind: InsightDatasetKind.Rooms}
        };
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        let insightFacade: InsightFacade;
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

    after(function () {
        // Log.test(`After: ${this.test.parent.title}`);
        server.stop();
        try {
            if (fs.existsSync(cacheDir + "/courses")) {
                fs.unlinkSync(cacheDir + "/courses");
            }
            if (fs.existsSync(cacheDir + "/rooms")) {
                fs.unlinkSync(cacheDir + "/rooms");
            }
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
        } catch (err) {
            Log.error(err);
        }
        Log.test("bla bla bla");
    });

    beforeEach(function () {
        // Log.test(`BeforeTest: ${this.currentTest.title}`);
        Log.test("server currently has: " + server.insf.listDatasets());
    });

    afterEach(function () {
        // Log.test(`AfterTest: ${this.currentTest.title}`);
        Log.test("server currently has: " + server.insf.listDatasets());
    });

    it("Valid query", function () {
                return chai.request("localhost:4321")
                    .post("/query")
                    .send(JSON.stringify(validQuery))
                    .set("Content-Type", "application/json")
                    .then(function (res: Response) {
                        expect(res.status).to.be.equal(200);
                    }).catch(function (err) {
                        Log.test(err);
                        expect.fail("should not have failed");
                    });
    });

    it("Invalid query", function () {
                return chai.request("localhost:4321")
                    .post("/query")
                    .send(JSON.stringify(invalidQuery))
                    .set("Content-Type", "application/json")
                    .then(function (res: Response) {
                        expect.fail("Should not have passed");
                    }).catch(function (err) {
                        Log.test(err);
                        expect(err.status).to.be.equal(400);
                    });
    });

    /*for (let test of testQueries) {
        describe("POST tests", function () {
            it(test.filename + " " + test.title, function (done) {
                if (test.isQueryValid) {
                    return chai.request("localhost:4321")
                        .post("/query")
                        .send(test.query)
                        .set("Content-Type", "application/json")
                        .then(function (res: Response) {
                            expect(res.status).to.be.equal(200);
                            done();
                        }).catch(function (err) {
                            Log.test(err);
                            expect.fail("Should not have failed");
                            done();
                        });
                } else {
                    return chai.request("localhost:4321")
                        .post("/query")
                        .send(test.query)
                        .set("Content-Type", "application/json")
                        .then((res: Response) => {
                            expect.fail("Should not have passed");
                            done();
                        }).catch((err) => {
                            Log.test(err);
                            expect(err);
                            done();
                        });
                }
            });
        });
    }*/
});

describe("GET test", function () {
    let facade: InsightFacade = null;
    let server: Server = null;
    const cacheDir = __dirname + "/../data";

    chai.use(chaiHttp);

    before(function () {
        try {
            if (fs.existsSync(cacheDir + "/courses")) {
                fs.unlinkSync(cacheDir + "/courses");
            }
            if (fs.existsSync(cacheDir + "/rooms")) {
                fs.unlinkSync(cacheDir + "/rooms");
            }
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
        } catch (err) {
            Log.error(err);
        }
        facade = new InsightFacade();
        server = new Server(4321);
        server.start().then(function (val: boolean) {
            Log.test("Server started: " + val);
        }).catch((err: any) => {
            Log.error("Could not start the server due to " + err);
        });
        const datasetsToQuery: { [id: string]: any } = {
            courses: {id: "courses", path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
            rooms: {id: "rooms", path: "./test/data/rooms.zip", kind: InsightDatasetKind.Rooms}
        };
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        let insightFacade: InsightFacade;
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

    after(function () {
        server.stop();
        try {
            if (fs.existsSync(cacheDir + "/courses")) {
                fs.unlinkSync(cacheDir + "/courses");
            }
            if (fs.existsSync(cacheDir + "/rooms")) {
                fs.unlinkSync(cacheDir + "/rooms");
            }
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
        } catch (err) {
            Log.error(err);
        }
    });

    beforeEach(function () {
        // Log.test("server currently has: " + server.insf.listDatasets());
    });

    afterEach(function () {
        // Log.test("server currently has: " + server.insf.listDatasets());
    });

    it("Should return a list of datasets added", function () {
        return chai.request("localhost:4321")
            .get("/datasets")
            .then(function (res: Response) {
                Log.test(res.body.result);
                expect(res.status).to.be.equal(200);
            }).catch(function (err) {
                Log.test(err);
                expect.fail("Should never reach this part");
            });
    });
});


    // Sample on how to format PUT requests
    /*
    it("PUT test for courses dataset", function () {
        try {
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(204);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
        }
    });
    */

    // The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
