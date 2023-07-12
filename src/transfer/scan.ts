import { getObjectMd5 } from "@gtr-infra/s3";

import { getLogger } from "../log.js";

import { initInfra } from "./infra.js";
import { MinioHelper, resolveStorage } from "./storage-helper.js";

const logger = getLogger("transfer/scan");

export interface ScanOptions {
  policy: string;
  prefix: string;
  include?: RegExp;
  exclude?: RegExp;
  testMode: boolean;
}

export const scanMinio = async (opts: ScanOptions, { bucket }: MinioHelper) => {
  const { db } = await initInfra();

  const generator = bucket.walkMeta({ Prefix: opts.prefix });

  let wrote = 0;
  let scanned = 0;

  for await (const [Raw] of generator) {
    scanned += 1;
    if (scanned > 1000 && 10 / scanned > Math.random())
      logger.info(`scanned: ${scanned}`);

    if (opts.exclude && opts.exclude.test(Raw.Key || "")) continue;
    if (opts.include && !opts.include.test(Raw.Key || "")) continue;

    if (!Raw.Key) continue;
    if (!Raw.ContentLength) {
      logger.log(Raw.Key, ": Size 0");
      continue;
    }
    const hash = getObjectMd5(Raw);

    const item = await db.StorageFile.findOne({
      storagePolicy: opts.policy,
      key: Raw.Key,
    });
    if (item) continue;

    const file = new db.StorageFile({
      storagePolicy: opts.policy,
      key: Raw.Key,
      size: Raw.ContentLength,
      hash,
    });
    if (!opts.testMode) await file.save();

    wrote += 1;
    if (10 / wrote > Math.random())
      logger.info(`(${wrote}) new file: ${Raw.Key}`);
  }

  logger.info(`completed: ${scanned} scanned, ${wrote} wrote`);
};

export const scan = async (opts: ScanOptions) => {
  const { helper, type } = await resolveStorage(opts.policy);
  switch (type) {
    case "minio":
      scanMinio(opts, helper as MinioHelper);
      break;
    default:
      throw "policy not supported";
  }
};
