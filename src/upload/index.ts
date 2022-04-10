import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";

import { FileClosedData } from "@bililive/rec-sdk/dist/webhook/types";

import { workdir } from "../config.js";
import { getLogger } from "../plugins/log.js";
import { getMq } from "../plugins/rabbitmq.js";
import { getS3 } from "../plugins/s3.js";
import { RecPath } from "../utils.js";

const logger = getLogger("upload");

const upload = async (event: FileClosedData) => {
  const { channel, exchange } = await getMq();
  const [bucket, prefix] = await getS3();

  const recPath = RecPath.fromRecFile(event.RelativePath);

  const uploadFile = async (ext: string) => {
    const objKey = path.posix.join(prefix, recPath.toObjectKey(ext));
    const filePath = path.join(workdir, recPath.toRecFile(ext));

    const obj = bucket.mkObject(objKey);
    await obj.putObject({ Body: createReadStream(filePath) });

    const remoteSize = (await obj.headObject({})).ContentLength;
    const localSize = (await fs.stat(filePath)).size;
    if (remoteSize !== localSize) {
      logger.error(
        `file size not match object size: ${event.RelativePath}(${localSize}) => (${remoteSize})`
      );
      throw "file size not match";
    }
    return { filePath, objKey };
  };
  const [flv, xml] = await Promise.all([uploadFile("flv"), uploadFile("xml")]);

  channel.publish(
    exchange.UploadEvent,
    "VIDEO_WITH_DANMAKU",
    Buffer.from(
      JSON.stringify({
        event,
        bucket,
        video: flv.objKey,
        xml: xml.objKey,
      })
    ),
    { persistent: true }
  );

  await Promise.all([fs.unlink(flv.filePath), fs.unlink(xml.filePath)]);
};

export const startUpload = async () => {
  logger.info("init rabbitmq");
  const { channel, queue } = await getMq();

  await channel.prefetch(2);
  await channel.consume(
    queue.ThisUpload,
    async (msg) => {
      if (!msg) return;

      const event = JSON.parse(msg.content.toString()) as FileClosedData;

      logger.info(
        `new upload task: [${event.Name}] ${event.Title} (${event.RelativePath})`
      );

      try {
        await upload(event);
        channel.ack(msg);
      } catch (e) {
        channel.nack(msg, false, true);
        logger.error("task failed");
      }
    },
    { noAck: false }
  );
};
