import { resolveStorage } from "./storage-helper.js";
import { initInfra } from "./infra.js";
import { getLogger } from "../log.js";

const logger = getLogger("transfer");

export const listenTransferTasks = async () => {
  const { db, channel, TransferQueue } = await initInfra();
  await channel.prefetch(2);

  TransferQueue.consume(async (msg) => {
    const req = msg.content;
    const from = await resolveStorage(req.from.policy);
    const to = await resolveStorage(req.to.policy);

    logger.info("transfer task start:", req.fileId, {
      from: { name: from.name, key: req.from.key },
      to: { name: to.name, key: req.to.key },
    });

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
  });
};
