import "dotenv/config";
import { createReadStream } from "fs";
import path from "path";
import { Readable } from "stream";

import { BDFileMeta, BDPcs } from "@gtr-infra/bdpcs";
import { BDUser } from "@gtr-infra/bdpcs/dist/config";
import { EzBucket, initMinio, S3Service } from "@gtr-infra/minio";
import { cacheWrap, env } from "@gtr/utils";

import { initInfra } from "./infra.js";

// TODO: writeTo
export interface StorageHelper {
  size(key: string): Promise<number>;
  read(key: string): Promise<{
    stream: Readable;
    size?: () => Promise<number>;
    clean?: () => Promise<unknown>;
    remove?: () => Promise<unknown>;
  }>;
  write(key: string, file: Readable): Promise<unknown>;
}

export class MinioHelper implements StorageHelper {
  constructor(public bucket: EzBucket) { }
  async size(key: string) {
    const meta = await this.bucket.mkObject(key).headObject({});
    return meta.ContentLength as number;
  }
  async read(key: string) {
    const obj = this.bucket.mkObject(key);
    const { Body, ContentLength } = await obj.getObject({});
    const stream: Readable = Body;
    const remove = async () => obj.deleteObject({});
    return {
      stream,
      remove,
      size:
        ContentLength === undefined
          ? undefined
          : () => Promise.resolve(ContentLength),
    };
  }
  async write(key: string, file: Readable) {
    const obj = this.bucket.mkObject(key);
    if (typeof file === "string") file = createReadStream(file);
    await obj.putObject({ Body: file });
  }
}

export class BDPcsHelper implements StorageHelper {
  constructor(public bdpcs: BDPcs, public prefix: string) { }
  private resolveKey = (key: string) => path.posix.join("/", this.prefix, key);
  async size(key: string) {
    const _key = this.resolveKey(key);
    const meta = await this.bdpcs.meta<BDFileMeta>(_key);
    return meta.size;
  }
  async read(key: string) {
    const _key = this.resolveKey(key);
    const stream = await this.bdpcs.getStream(_key);
    const size = () => this.bdpcs.meta<BDFileMeta>(_key).then((m) => m.size);
    const remove = () => this.bdpcs.delete(_key);
    return { stream, remove, size };
  }
  async write(key: string, file: Readable) {
    const _key = this.resolveKey(key);
    await this.bdpcs.upload(_key, file, { deleteAfterUpload: true });
  }
}

export const resolveStorage = cacheWrap(
  async (
    id: string
  ): Promise<{
    id: string;
    online: boolean;
    name: string;
    type: string;
    instance: any;
    helper: StorageHelper;
  }> => {
    const { db, vault } = await initInfra();
    const record = await db.StoragePolicy.findById(id);
    if (!record) throw "storage policy not exist";

    const resultBase = {
      id: record.id,
      online: record.online,
      name: record.friendlyName,
    };

    if (record.type === "minio") {
      if (!record.secret) throw "minio storage policy requires `secret`";
      const bucketName = record.config.get("bucket");
      if (typeof bucketName !== "string" || bucketName.length === 0)
        throw "minio storage policy requires `bucket`";
      const minio = new S3Service(initMinio(vault, record.secret));
      const bucket = minio.mkBucket(bucketName);
      const helper = new MinioHelper(bucket);
      return { ...resultBase, type: "minio", helper, instance: bucket };
    }

    if (record.type === "baidu_wangpan") {
      if (!record.secret) throw "baidu_wangpan storage policy required secret";
      const prefix = record.config.get("prefix") as string;
      if (typeof prefix !== "string" || prefix.length === 0)
        throw "minio storage policy requires `prefix`";

      const cred = await vault.get<BDUser>(record?.secret);
      const bdpcs = new BDPcs();
      const proxy = env.str("BDPCS_PROXY");
      if (proxy) await bdpcs.setConfig({ proxy });
      await bdpcs.addUser(cred);
      await bdpcs.setUser(cred.uid);

      const helper = new BDPcsHelper(bdpcs, prefix);
      return { ...resultBase, type: "baidu_wangpan", helper, instance: bdpcs };
    }

    throw `storage policy: unexpected type ${record.type}`;
  }
);
