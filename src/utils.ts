import path from "path";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js"
dayjs.extend(customParseFormat);

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
  // /stream/raw/17151/20101024/012345.flv
  // /stream/raw/17151/20101024/012345-389.flv
  static fromObjectKey(key: string) {
    const result = key.match(
      /stream\/(?<encode_state>raw|encoded)\/(?<room_id>\d+)\/(?<date>\d{8})\/(?<time>\d{6})(-(?<ms>\d{3}))?\.(?<extension>\w+)/
    );
    if (!result?.groups) throw Error(`parse error: ${key}`);
    return new RecPath(result.groups as unknown as RecPathOptions);
  }
  // /raw/17151/20101024/012345-389.flv
  // /raw/17151/20101024/012345.flv
  static fromStoreFile(filePath: string) {
    const key = filePath.split(path.sep).join("/");
    const result = key.match(
      /(?<encode_state>raw|encoded)\/(?<room_id>\d+)\/(?<date>\d{8})\/(?<time>\d{6})(-(?<ms>\d{3}))?\.(?<extension>\w+)/
    );
    if (!result?.groups) throw Error(`parse error: ${key}`);
    return new RecPath(result.groups as unknown as RecPathOptions);
  }
  // /17151-GeekTR/录制-17151-20101024-012345-389-随便打打游戏.flv
  static fromFallbackRecFile(filePath: string) {
    const key = filePath.split(path.sep).join("/");
    const result = key.match(
      /(?<room_id>\d+)-(.+?)\/录制-(\d+)-(?<date>\d{8})-(?<time>\d{6})(-(?<ms>\d{3}))?-(.+?)\.(?<extension>\w+)/
    );
    if (!result?.groups) throw Error(`parse error: ${key}`);
    return new RecPath({
      ...(result.groups as unknown as RecPathOptions),
      encode_state: "raw",
    });
  }
  // 17151-20101024-012345-389.flv
  // 17151-20101024-012345.flv
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
  getDayjs() {
    return dayjs(`${this.date}-${this.time}-${this.ms}`, "YYYYMMDD-hhmmss-SSS")
  }
}
