import Server from "./rest/Server";
import Log from "./Util";
import * as fs from "fs-extra";
import {InsightDatasetKind} from "./controller/IInsightFacade";

/**
 * Main app class that is run with the node command. Starts the server.
 */
export class App {
    public initServer(port: number) {
        Log.info("App::initServer( " + port + " ) - start");

        const server = new Server(port);
        server.start().then(function (val: boolean) {
            Log.info("App::initServer() - started: " + val);
        }).catch(function (err: Error) {
            Log.error("App::initServer() - ERROR: " + err.message);
        });
        if (!fs.existsSync("/data/courses")) {
            let coursesFile: any = fs.readFileSync("./test/data/courses.zip").toString("base64");
            server.insf.addDataset("courses", coursesFile, InsightDatasetKind.Courses).then((result) => {
                if (!fs.existsSync("/data/rooms")) {
                    let roomsFile: any = fs.readFileSync("./test/data/rooms.zip").toString("base64");
                    server.insf.addDataset("rooms", roomsFile, InsightDatasetKind.Rooms).then((r) => {
                        Log.info(r);
                    });
                }
            }).catch((e) => {
                Log.info("dataset already added");
            });
        }
    }
}

// This ends up starting the whole system and listens on a hardcoded port (4321)
Log.info("App - starting");
const app = new App();
app.initServer(4321);

