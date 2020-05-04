/**
 * Created by rtholmes on 2016-06-19.
 */

import fs = require("fs");
import restify = require("restify");
import Log from "../Util";
import InsightFacade from "../controller/InsightFacade";
import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "../controller/IInsightFacade";

/**
 * This configures the REST endpoints for the server.
 */
export default class Server {

    private port: number;
    private rest: restify.Server;
    public insf: InsightFacade = new InsightFacade();

    constructor(port: number) {
        Log.info("Server::<init>( " + port + " )");
        this.port = port;
    }

    /**
     * Stops the server. Again returns a promise so we know when the connections have
     * actually been fully closed and the port has been released.
     *
     * @returns {Promise<boolean>}
     */
    public stop(): Promise<boolean> {
        Log.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }

    /**
     * Starts the server. Returns a promise with a boolean value. Promises are used
     * here because starting the server takes some time and we want to know when it
     * is done (and if it worked).
     *
     * @returns {Promise<boolean>}
     */
    public start(): Promise<boolean> {
        const that = this;
        Log.info("Server::start() - start");
        return new Promise(function (fulfill, reject) {
            try {
                that.rest = restify.createServer({
                    name: "insightUBC",
                });
                that.rest.use(restify.bodyParser({mapFiles: true, mapParams: true}));
                that.rest.use(
                    function crossOrigin(req, res, next) {
                        res.header("Access-Control-Allow-Origin", "*");
                        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        return next();
                    });

                // This is an example endpoint that you can invoke by accessing this URL in your browser:
                // http://localhost:4321/echo/hello
                /*that.rest.get("/echo/:msg", Server.echo);*/

                // NOTE: your endpoints should go here
                // that.rest.put("/dataset/:id/:kind", Server.add);

                that.rest.put("/dataset/:id/:kind",
                    (req: restify.Request, res: restify.Response, next: restify.Next) => {
                    that.add(req, res, next);
                });

                that.rest.del("/dataset/:id", (req: restify.Request, res: restify.Response, next: restify.Next) => {
                    that.remove(req, res, next);
                });

                that.rest.post("/query", (req: restify.Request, res: restify.Response, next: restify.Next) => {
                    that.resultQuery(req, res, next);
                });

                that.rest.get("/datasets", (req: restify.Request, res: restify.Response, next: restify.Next) => {
                    that.listOfDataset(req, res, next);
                });

                // This must be the last endpoint!
                that.rest.get("/.*", that.getStatic);

                that.rest.listen(that.port, function () {
                    Log.info("Server::start() - restify listening: " + that.rest.url);
                    fulfill(true);
                });

                that.rest.on("error", function (err: string) {
                    // catches errors in restify start; unusual syntax due to internal
                    // node not using normal exceptions here
                    Log.info("Server::start() - restify ERROR: " + err);
                    reject(err);
                });

            } catch (err) {
                Log.error("Server::start() - ERROR: " + err);
                reject(err);
            }
        });
    }

    private add(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::add() - params.id: " + JSON.stringify(req.params.id));
        Log.trace("Server::add() - params.kind: " + JSON.stringify(req.params.kind));
        try {
            if ((req.params.kind !== InsightDatasetKind.Courses) && (req.params.kind !== InsightDatasetKind.Rooms)) {
                throw new InsightError("Invalid dataset kind.");
            }
            let tempContent: string = Buffer.from(req.body).toString("base64");
            this.insf.addDataset(req.params.id, tempContent, req.params.kind).then((value: string[]) => {
                Log.trace(value);
                Log.info("Server::add() - responding " + 200);
                res.json(200, {result: value});
            }).catch((err: any) => {
                Log.error("Server::add() - responding 200: " + err.message);
                res.json(400, {error: err.message});
            });
        } catch (e) {
            Log.error("Server::add() - responding 400: " + e.message);
            res.json(400, {error: e.message});
        }
        return next();
    }

    private remove(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::remove() - params.id: " + JSON.stringify(req.params.id));
        this.insf.removeDataset(req.params.id).then((resultID: string) => {
                Log.trace(resultID);
                Log.info("Server::remove() - responding " + 200);
                res.json(200, {result: resultID});
            }).catch((err: any) => {
                Log.trace(err);
                if (err instanceof NotFoundError) {
                    Log.error("Server::remove() - responding 404: " + err.message);
                    res.json(404, {error: err.message});
                } else {
                    Log.error("Server::remove() - responding 400: " + err.message);
                    res.json(400, {error: err.message});
                }
            });
        return next();
    }

    private resultQuery(req: restify.Request, res: restify.Response, next: restify.Next) {
            this.insf.performQuery(req.body).then((query: any) => {
                Log.trace(query);
                Log.info("Server::resultQuery() - responding " + 200);
                res.json(200, {result: query});
            }).catch((err: any) => {
                // Log.error("Server::resultQuery() - responding 400: " + err.message);
                res.json(400, {error: err.message});
            });
            return next();
    }

    private listOfDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        this.insf.listDatasets().then((insightDatasets: InsightDataset[]) => {
            Log.trace(insightDatasets);
            Log.info("Server::listOfDataset() - responding " + 200);
            res.json(200, {result: insightDatasets});
        });
        return next();
    }

    private getStatic(req: restify.Request, res: restify.Response, next: restify.Next) {
        const publicDir = "frontend/public/";
        Log.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + req.url.split("/").pop();
        }
        fs.readFile(path, function (err: Error, file: Buffer) {
            if (err) {
                res.send(500);
                Log.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }

    // The next two methods handle the echo service.
    // These are almost certainly not the best place to put these, but are here for your reference.
    // By updating the Server.echo function pointer above, these methods can be easily moved.
    /*private static echo(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::echo(..) - params: " + JSON.stringify(req.params));
        try {
            const response = Server.performEcho(req.params.msg);
            Log.info("Server::echo(..) - responding " + 200);
            res.json(200, {result: response});
        } catch (err) {
            Log.error("Server::echo(..) - responding 400");
            res.json(400, {error: err});
        }
        return next();
    }

    private static performEcho(msg: string): string {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        } else {
            return "Message not provided";
        }
    }*/

}
