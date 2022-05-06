import path from "path";

export interface RecPathOptions {
  room_id: string;
  date: string;
  time: string;
  ms?: string;
  extension: string;
  encode_state?: "raw" | "encoded";
}

export class RecPath {
  public room_id: string;
  public date: string;
  public time: string;
  public ms: string;
  public extension: string;
  public encode_state?: "raw" | "encoded";
  constructor(opts: RecPathOptions) {
    this.room_id = opts.room_id;
    this.date = opts.date;
    this.time = opts.time;
    this.ms = opts.ms || "000";
    this.extension = opts.extension;
    this.encode_state = opts.encode_state;
  }
  static fromObjectKey(key: string) {
    const result = key.match(
      /stream\/(?<encode_state>raw|encoded)\/(?<room_id>\d+)\/(?<date>\d{8})\/(?<time>\d{6})(-(?<ms>\d{3}))?\.(?<extension>\w+)/
    );
    if (!result?.groups) throw Error(`parse error: ${key}`);
    return new RecPath(result.groups as unknown as RecPathOptions);
  }
  static fromStoreFile(filePath: string) {
    const key = filePath.split(path.sep).join("/");
    const result = key.match(
      /(?<encode_state>raw|encoded)\/(?<room_id>\d+)\/(?<date>\d{8})\/(?<time>\d{6})(-(?<ms>\d{3}))?\.(?<extension>\w+)/
    );
    if (!result?.groups) throw Error(`parse error: ${key}`);
    return new RecPath(result.groups as unknown as RecPathOptions);
  }
  static fromFallbackRecFile(filePath: string) {
    const key = filePath.split(path.sep).join("/");
    const result = key.match(
      /(?<room_id>\d+)-(.+?)\/录制-(\d+)-(?<date>\d{8})-(?<time>\d{6})-(?<ms>\d{3})?-(.+?)\.(?<extension>\w+)/
    );
    if (!result?.groups) throw Error(`parse error: ${key}`);
    return new RecPath({
      ...(result.groups as unknown as RecPathOptions),
      encode_state: "raw",
    });
  }
  static fromRecFile(filePath: string) {
    const key = filePath.split(path.sep).join("/");
    const result = key.match(
      /(?<room_id>\d+)-(?<date>\d{8})-(?<time>\d{6})(-(?<ms>\d{3}))?\.(?<extension>\w+)/
    );
    if (!result?.groups) throw Error(`parse error: ${key}`);
    return new RecPath({
      ...(result.groups as unknown as RecPathOptions),
      encode_state: "raw",
    });
  }
  toObjectKey(extension = this.extension, encode_state = this.encode_state) {
    if (!encode_state) throw Error("encode_state not defined");
    return `stream/${encode_state}/${this.room_id}/${this.date}/${this.time}-${this.ms}.${extension}`;
  }
  toStoreFileV1(extension = this.extension) {
    return [this.room_id, this.date, `${this.time}.${extension}`].join(
      path.sep
    );
  }
  toStoreFileV2(extension = this.extension) {
    return [
      this.room_id,
      this.date,
      `${this.time}-${this.ms}.${extension}`,
    ].join(path.sep);
  }
  toRecFile(extension = this.extension) {
    return `${this.room_id}-${this.date}-${this.time}-${this.ms}.${extension}`;
  }
}
