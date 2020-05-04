import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";
import Sorting from "../controller/Sorting";

export default class Scheduler implements IScheduler {

    public schedule(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        // TODO Implement this
        // Idea 1: Let sections be organized by largest Room Requirements, rooms organized by largest space
        // - You should select the room with the largest space, and if that is
        // - unavailable reshuffle the remaining rooms to sort
        // - distance away then use the next closest room. If that room has insufficient space, scroll to the next room.
        // - 0.7 means priority on enrollment, less on space so it should work
        // TODO: Object that takes in the sections, and returns an object with total enrol in section
        // TODO: Object that takes in the rooms and the room of focus, and returns an array object
        // TODO: with harvestine distance
        // TODO: Use Sorting Fields
        let slots: TimeSlot[] = ["MWF 0800-0900", "MWF 0900-1000", "MWF 1000-1100",
        "MWF 1100-1200", "MWF 1200-1300", "MWF 1300-1400",
        "MWF 1400-1500", "MWF 1500-1600", "MWF 1600-1700",
        "TR  0800-0930", "TR  0930-1100", "TR  1100-1230",
        "TR  1230-1400", "TR  1400-1530", "TR  1530-1700"];
        let sortinRoom: Sorting = new Sorting(rooms, {dir: "down", keys: ["rooms_seats"]});
        // Removing highest by shift
        let sects: any[] = this.addEnrollmentSize(sections);
        let sortinSec: Sorting = new Sorting(sects, {dir: "down", keys: ["enrol_total"]}); // Removing by shift
        let orderedRoom: any[] = sortinRoom.applySort();
        let orderedSec: any[] = sortinSec.applySort();
        let results: any[] = [];
        for (let v of orderedRoom) {
            for (let s of slots) {
                let blank: any = [ v , {}, s]; // All Rooms and their available timeslots are created
                results.push(blank);
            }
        }
        let tots: number = 0;
        for (let cs of rooms) {
            tots += cs.rooms_seats;
        }
        while (orderedSec.length !== 0 && orderedRoom.length !== 0) { // If either are 0, we have no more work to do
            let seck: any = orderedSec.shift(); // Each Time Take The Largest Section and try adding it
            this.addingSectionToRooms(seck, orderedRoom, results, tots);
        }
        let pruneResult: any[] = this.pruningResults(results);
        // This will remove any excess objects (room + slots with no class allocated at all).
        return pruneResult;
    }

    private addEnrollmentSize(section: any[]): any[] {
        let newCopy: any[] = [];
        for (let sec of section) {
            let sece: any = {};
            Object.keys(sec).forEach((col) => {
                let rawcol: string = col;
                sece[rawcol] = sec[col];
            });
            sece["enrol_total"] = sec.courses_pass + sec.courses_fail + sec.courses_audit;
            newCopy.push(sece);
        }
        return newCopy;
    }

    /*Helper will add an extra field for the rooms outlining the harvestine distance from a given room*/
    private addHarvestineDistance(room: any, rooms: any[], totE: number): any[] {
        let newCopy: any[] = [];
        for (let rooma of rooms) {
            let roomo: any = {};
            Object.keys(rooma).forEach((col) => {
                let rawcol: string = col;
                roomo[rawcol] = rooma[col];
            });
            roomo["harv_dist"] = (0.7 * rooma["rooms_seats"] / totE ) +
                (0.3 * (1 - (this.havdist(room, rooma) / 1372)));
            newCopy.push(roomo);
        }
        return newCopy;
    }

    /*Helper that calculates the havestine distance based on the formula provided on the website. Taking two rooms
    * we apply the equation to develop our result*/
    private havdist(room1: SchedRoom, room2: SchedRoom): number {
        let pi: number = Math.PI;
        let rd: number = 6371e3;
        let lt1: number = room1.rooms_lat * pi / 180;
        let lt2: number = room2.rooms_lat * pi / 180;
        let delLat: number =  (room2.rooms_lat - room1.rooms_lat) * pi / 180;
        let delLon: number = (room2.rooms_lon - room1.rooms_lon) * pi / 180;
        let a: number =  Math.sin(delLat / 2) * Math.sin(delLat / 2) +
            Math.cos(lt1) * Math.cos(lt2) * Math.sin(delLon / 2) * Math.sin(delLon / 2);
        let c: number = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a) );
        let d: number = rd * c;
        return d;
    }

    private removeEnrollmentSize(section: any): SchedSection {
        let newC: any = {};
        Object.keys(section).forEach((col) => {
            let rawcol: string = col;
            if (rawcol !== "enrol_total") {
                newC[rawcol] = section[col];
            }
        });
        let b: SchedSection = newC; // masked
        return b;
    }

    private removeHarvestingSize(rooms: any[]): SchedRoom[] {
        let voo: SchedRoom[] = [];
        for (let r of rooms) {
            let newC: any = {};
            Object.keys(r).forEach((col) => {
                let rawcol: string = col;
                if (rawcol !== "harv_dist") {
                    newC[rawcol] = r[col];
                }
            });
            let b: SchedRoom = newC; // masked
            voo.push(b);
        }
        return voo;
    }

    private addingSectionToRooms(sec: any, orderedRoom: any[], results: any[], totalE: number) {
        // Check if all slots are filled for the Room
        // if it is, reorder the remaining rooms by that room - DONE
        // else for each slot check for conflicts
        // if there are conflicts, go to next time period
        // else test if the class can fit
        // if it fits add it, else don't add
        let ordRom: any;
        if (orderedRoom.length === 0) { // if the length is zero, there are no more rooms available to be filled
            return;
        }
        while (orderedRoom.length !== 0) {
            if (this.checkAllSlotsAreFilled(orderedRoom[0], results)) { // Check if first room is filled all slots
                ordRom = orderedRoom.shift(); // if the room is filled go to the next best room and check if that's
                orderedRoom = this.sortByHavestine(ordRom, orderedRoom, totalE); // filled
            } else {
                ordRom = orderedRoom[0]; // if best room is not filled, select as best room
                break;
            }
        }
        if (orderedRoom.length === 0) {
            return;
        }
        for (let r of results) { // for all timeslots available across all buildings
            if (this.areTheyEqual(r[0], ordRom)) { // the best room with an available timeslot
                if (!this.thereAreConflictingSections(sec, results, r,  r[2])) { // check for section conflicts
                    this.tryInsertingSection(sec, r);
                    return; // This principle seeks to ensure that the class is choosing the best enrolment room
                }
            }
        }
    }

/* Helper that will add the Havestine Distance of All Remaining Rooms, Sort Those Rooms By That Criteria
   Then Remove The Distance (For obtaining the ordered SchedRooms by Distance) */
    private sortByHavestine(roomOne: any, roomsRemaining: any[], tot: number): SchedRoom[] {
        let newAny: any[] = this.addHarvestineDistance(roomOne, roomsRemaining, tot);
        let sorte: Sorting = new Sorting(newAny, {dir: "down", keys: ["harv_dist"]});
        let reordered: any[] = sorte.applySort();
        let reorder: SchedRoom[] = this.removeHarvestingSize(reordered);
        return reorder;
    }

    /* Helper that will check if all time slots of the Room in question are filled. These rooms should
    * be filled by the best classes (those that maximize enrolment size) */
    private checkAllSlotsAreFilled(desiredRoom: any, results: any[]): boolean {
        for (let e of results) {
            if (this.areTheyEqual(e[1], {}) && this.areTheyEqual(e[0], desiredRoom)) {
                // Check if each slot is filled for the classroom
                return false;
            }
        }
        return true;
    }

    /* Helper that will check if there are conflicts. Conflicts occur iff, there exists a section of the same course
    * as the one in question, which occurs at the time in question OR if this is filled by an existing section so far*/
    private thereAreConflictingSections(sec: any, results: any[], r: any,  rTime: any): boolean {
        if (!this.areTheyEqual(r[1], {})) { // The best class has already been added earlier
            return true;
        }
        for (let e of results) { // Check if that class (irrespective of section) is in other rooms at the same time
            if (e[2] === rTime) {
                if (sec.courses_id === e[1].courses_id && sec.courses_dept === e[1].courses_dept) { // same class
                   return true;
                }
            }
        }
        return false;
    }
    // The rationale behind only testing if it fits is that we already order the rooms by size, if it doesn't fit this
    // room in question, it obviously won't fit the subsequent (smaller) rooms
    // Also, since the classes are ordered by their size as well, any previous rooms already filled would have higher
    // enrollment.

    /*Helper tries to insert the section into the available space. It checks that the space is large enough to use*/
    private tryInsertingSection(sec: any, r: any) {
        if (sec.enrol_total <= r[0].rooms_seats) { // if the section will fit, insert, else discard it.
            let newsec: SchedSection = this.removeEnrollmentSize(sec);
            r[1] = newsec;
        }
    }

    /*Helper basically strips the result array which is  Rooms x Timeslots size, and shrinks it by stripping the
    *times with empty classrooms. It will return only times where the classes are filled*/
    public pruningResults(result: any[]): any[] {
      let res: any[] = [];
      for (let r of result) {
          if (!this.areTheyEqual(r[1], {})) {
              res.push(r);
          }
      }
      return res;
    }

    /* Helper that tests equality between two objects - no need for deep equal here */
    private areTheyEqual(a: any, b: any): boolean {
        return JSON.stringify(a) === JSON.stringify(b);
    }
}
