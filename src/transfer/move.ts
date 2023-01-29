import { StorageFile } from "@gtr/relive-db/dist/models/StorageFile.js";
import dayjs from "dayjs";
import mongoose, { FilterQuery } from "mongoose";
import xbytes from "xbytes";

import { getLogger } from "../log.js";
import { RecPath } from "../utils.js";

import { TransferRequest } from "./../transfer/infra.js";
import { initInfra } from "./infra.js";

const logger = getLogger("transfer/move");

export interface MoveOptions {
  target: string;
  source: string;
  include: RegExp;
  exclude: RegExp;
  limit?: number;
  stopAt?: string | number | dayjs.Dayjs | Date;
  testMode: boolean;
}

export const move = async (opts: MoveOptions) => {
  const { db, channel, TransferRequestExchange } = await initInfra();

  const query: FilterQuery<StorageFile> = {
    $and: [
      { storagePolicy: new mongoose.Types.ObjectId(opts.source) },
      { key: { $regex: opts.include } },
      { key: { $not: { $regex: opts.exclude } } },
    ],
  };

  const files = await db.StorageFile.find(query);
  logger.info(`total files: ${files.length}`);

  const tasks: TransferRequest[] = [];

  let taskSize = 0;
  for (const i of files) {
    let meta: RecPath | null = null;
    let error = true;

    try {
      meta = RecPath.fromObjectKey(i.key);
      error = false;
    } catch {}
    // try {
    //   meta = RecPath.fromFallbackRecFile(i.key);
    // } catch { }
    // try {
    //   meta = RecPath.fromRecFile(i.key);
    // } catch { }

    if (!meta) {
      logger.error(`unexpected key format: ${i.key}`);
      if (opts.testMode) process.exit(1);
      continue;
    }

    const targetKey = meta.toObjectKey();

    if (opts.stopAt && meta.getDayjs().isAfter(opts.stopAt)) {
      console.log(i.key);
      continue;
    }
    if (typeof opts.limit === "number" && taskSize + i.size > opts.limit)
      continue;

    taskSize += i.size;
    tasks.push({
      fileId: i.id,
      size: i.size,
      from: { policy: opts.source, key: i.key },
      to: { policy: opts.target, key: targetKey },
    });

    if (tasks.length < 10) {
      logger.info(`add task: ${i.key} => ${targetKey}`);
    } else if (tasks.length === 10) {
      logger.info(`add tasks: ...`);
    }
  }

  logger.info(
    `task size: ${xbytes(taskSize)} / ${xbytes(
      files.reduce((p, v) => p + v.size, 0)
    )}`
  );

  if (!opts.testMode) {
    for (const task of tasks)
      TransferRequestExchange.publish(`${opts.source}.${opts.target}`, task);
  }

  await channel.close();
  logger.info("Done !");
};