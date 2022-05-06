import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";

import { FileClosedData } from "@bililive/rec-sdk/dist/webhook/types";

import { workdir } from "../config.js";
import { getLogger } from "../log.js";
import { RecPath } from "../utils.js";
import { getDefaultMQ, getDefaultS3 } from "../infra.js";

const logger = getLogger("upload");

const upload = async (event: FileClosedData) => {
  const { UploadExchange } = await getDefaultMQ();
  const [bucket, prefix] = await getDefaultS3();

  let recPath: RecPath;
  try {
    recPath = RecPath.fromRecFile(event.RelativePath);
  } catch (e) {
    logger.warn("found issue path:", event.RelativePath);
    try {
      recPath = RecPath.fromFallbackRecFile(event.RelativePath);
    } catch (e) {
      logger.error("unknown path:", event.RelativePath);
      throw Error("unknown path");
    }
  }

  const uploadFile = async (ext: string) => {
    const objKey = path.posix.join(prefix, recPath.toObjectKey(ext));
    const filePath = path.join(workdir, event.RelativePath);

    const obj = bucket.mkObject(objKey);
    await obj.putObject({ Body: createReadStream(filePath) });

    // TODO: hash check
    const [remoteSize, localSize] = await Promise.all([
      obj.headObject({}).then((i) => i.ContentLength),
      fs.stat(filePath).then((i) => i.size),
    ]);

    if (remoteSize !== localSize) {
      logger.error(
        `file size not match object size: ${filePath}(${localSize}) => (${remoteSize})`
      );
      throw "file size not match";
    }
    return { filePath, objKey };
  };
  const [flv, xml] = await Promise.all([uploadFile("flv"), uploadFile("xml")]);

  UploadExchange.publish(
    "VIDEO_WITH_DANMAKU",
    {
      event,
      bucket,
      video: flv.objKey,
      xml: xml.objKey,
    },
    { persistent: true }
  );

  await Promise.all([fs.unlink(flv.filePath), fs.unlink(xml.filePath)]);
};

export const startUpload = async () => {
  logger.info("init rabbitmq");
  const { channel, ThisUploadQueue } = await getDefaultMQ();

  await channel.prefetch(2);
  await ThisUploadQueue.consume<FileClosedData>(
    async (msg) => {
      const event = msg.content;
      logger.info(
        `new upload task: [${event.Name}] ${event.Title} (${event.RelativePath})`
      );

      try {
        await upload(event);
        msg.ack();
      } catch (e) {
        msg.nack(false, true);
        logger.error("task failed");
      }
    },
    { noAck: false }
  );
};
