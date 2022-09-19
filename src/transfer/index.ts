import { Message } from "@gtr-infra/rabbitmq";
import xbytes from "xbytes";

import { getLogger } from "../log.js";

import { initInfra, TransferRequest } from "./infra.js";
import { resolveStorage } from "./storage-helper.js";

const logger = getLogger("transfer");

export const listenTransferTasks = async () => {
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

    const obj = await from.helper.read(req.from.key);

    try {
      await to.helper.write(req.to.key, obj.stream);
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

  let lightLoadParallel = 16;
  let heavyLoadParallel = 4;

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
          thread();
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
          thread();
        });
      thread();
    }
  };

  thread();
};
