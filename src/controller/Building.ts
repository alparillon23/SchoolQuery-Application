export default class Building {
    public fullname: string;
    public shortname: string;
    public address: string;
    public lat: number;
    public lon: number;
    public link: string;
    public data: any;
    // constructor(fullname: string, shortname: string,
    //             address: string, lat: number, lon: number) {
    //     this.fullname = fullname;
    //     this.shortname = shortname;
    //     this.address = address;
    //     this.lat = lat;
    //     this.lon = lon;
    // }

    public checkTableDefined(): boolean {
        return this.fullname !== undefined && this.shortname !== undefined &&
            this.address !== undefined && this.link !== undefined;
    }

}
