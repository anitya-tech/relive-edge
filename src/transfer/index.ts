import { Message } from "@gtr-infra/rabbitmq";
import xbytes from "xbytes";

import { getLogger } from "../log.js";

import { initInfra, TransferRequest } from "./infra.js";
import { resolveStorage, StorageHelperReader } from "./storage-helper.js";

const logger = getLogger("transfer");

export interface TransferOptions {
  lightLoadParallel: number;
  heavyLoadParallel: number;
}

export const listenTransferTasks = async (opts: TransferOptions) => {
  const { db, TransferQueue } = await initInfra();

  let prevNamePair = "";
  let taskCount = 0;

  const handleTransfer = async (msg: Message<TransferRequest, any>) => {
    const req = msg.content;
    const from = await resolveStorage(req.from.policy);
    const to = await resolveStorage(req.to.policy);

    const curNamePair = `${from.name} => ${to.name}`;

    logger.info(`transfer task start (${++taskCount}):`);
    if (curNamePair !== prevNamePair) logger.info(curNamePair);
    prevNamePair = curNamePair;
    logger.info(`${req.from.key} [${xbytes(msg.content.size)}]`);

    let obj: StorageHelperReader
    try {
      obj = await from.helper.read(req.from.key);
    } catch (e: any) {
      if (e?.Code === "NoSuchKey") {
        logger.warn("transfer task failed: NoSuchKey", req.from.key)
        msg.ack();
        return
      } else {
        throw e
      }
    }


    try {
      await to.helper.write(req.to.key, obj.stream, msg.content.size);
      await db.StorageFile.findByIdAndUpdate(req.fileId, {
        $set: {
          storagePolicy: req.to.policy,
          key: req.to.key,
        },
      });
      await obj.remove?.();
      msg.ack();
      logger.info("transfer task success:", req.fileId);
    } catch (e) {
      logger.error("transfer task failed:", req.fileId, e);
      msg.nack();
    } finally {
      await obj.clean?.();
    }
  };

  let lightLoadParallel = opts.lightLoadParallel;
  let heavyLoadParallel = opts.heavyLoadParallel;

  const lastTaskCheck = () => {
    if (lightLoadParallel === opts.lightLoadParallel && heavyLoadParallel === opts.heavyLoadParallel) {
      setTimeout(thread, 1000);
      return
    }
    thread();
  }

  const thread = async () => {
    if (heavyLoadParallel <= 0 || lightLoadParallel <= 0) return;

    const msg = await TransferQueue.get();

    if (!msg) return;
    const sizeInMB = msg.content.size / 1024 / 1024;

    if (sizeInMB < 10) {
      if (lightLoadParallel <= 0) return;

      lightLoadParallel -= 1;
      handleTransfer(msg)
        .catch((e) => logger.error(e))
        .finally(() => {
          lightLoadParallel += 1;
          lastTaskCheck();
        });
      thread();
    }

    if (sizeInMB >= 10) {
      if (heavyLoadParallel <= 0) return;

      heavyLoadParallel -= 1;
      handleTransfer(msg)
        .catch((e) => logger.error(e))
        .finally(() => {
          heavyLoadParallel += 1;
          lastTaskCheck();
        });
      thread();
    }
  };

  thread();
};
