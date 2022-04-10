import path from "path";

export class RecPath {
  constructor(
    public room_id: string,
    public date: string,
    public time: string,
    public extension: string,
    public encode_state?: "raw" | "encoded"
  ) {}
  static fromObjectKey(key: string) {
    const result = key.match(
      /stream\/(?<encode_state>raw|encoded)\/(?<room_id>\d+)\/(?<date>\d{8})\/(?<time>\d{6})\.(?<extension>\w+)/
    );
    if (!result?.groups) throw `parse error: ${key}`;
    const g = result.groups;
    return new RecPath(
      g.room_id as string,
      g.date as string,
      g.time as string,
      g.extension as string,
      g.encode_state as "raw" | "encoded"
    );
  }
  static fromStoreFile(filePath: string) {
    const key = filePath.split(path.sep).join("/");
    const result = key.match(
      /(?<encode_state>raw|encoded)\/(?<room_id>\d+)\/(?<date>\d{8})\/(?<time>\d{6})\.(?<extension>\w+)/
    );
    if (!result?.groups) throw `parse error: ${key}`;
    const g = result.groups;
    return new RecPath(
      g.room_id as string,
      g.date as string,
      g.time as string,
      g.extension as string,
      "raw"
    );
  }
  static fromRecFile(filePath: string) {
    const key = filePath.split(path.sep).join("/");
    const result = key.match(
      /(?<room_id>\d+)-(?<date>\d{8})-(?<time>\d{6})\.(?<extension>\w+)/
    );
    if (!result?.groups) throw `parse error: ${key}`;
    const g = result.groups;
    return new RecPath(
      g.room_id as string,
      g.date as string,
      g.time as string,
      g.extension as string,
      "raw"
    );
  }
  toObjectKey(extension = this.extension, encode_state = this.encode_state) {
    if (!encode_state) throw "encode_state not defined";
    return `stream/${encode_state}/${this.room_id}/${this.date}/${this.time}.${extension}`;
  }
  toStoreFile(extension = this.extension) {
    return [this.room_id, this.date, `${this.time}.${extension}`].join(
      path.sep
    );
  }
  toRecFile(extension = this.extension) {
    return `${this.room_id}-${this.date}-${this.time}.${extension}`;
  }
}
