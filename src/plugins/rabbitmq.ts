import { initRabbitmq } from "@gtr-infra/rabbitmq";
import { onceAsync } from "@gtr/utils";

import { instanceId } from "../config.js";

import { getReliveEdgeSecret } from "./edge-secret.js";

const initMq = async () => {
  const secret = await getReliveEdgeSecret();
  const rabbitmq = await initRabbitmq(secret.rabbitmq.credential);

  const exchange = {
    RecEvent: "rec-events",
    UploadEvent: "edge-upload",
  } as const;

  const queueUploadPrefix = "edge-upload-tasks";
  const queue = {
    ThisUpload: `${queueUploadPrefix}.${instanceId}`,
    Transcode: "edge-transcode-tasks",
  } as const;

  const channel = await rabbitmq.createChannel();
  await channel.assertExchange(exchange.RecEvent, "topic", {
    durable: true,
  });
  await channel.assertQueue(queue.ThisUpload, { durable: true });
  await channel.bindQueue(
    queue.ThisUpload,
    exchange.RecEvent,
    `${instanceId}.FileClosed`
  );

  await channel.assertExchange(exchange.UploadEvent, "topic", {
    durable: true,
  });
  await channel.assertQueue(queue.Transcode, { durable: true });
  await channel.bindQueue(
    queue.Transcode,
    exchange.UploadEvent,
    "VIDEO_WITH_DANMAKU"
  );

  return {
    channel,
    exchange,
    queue,
  };
};

export const getMq = onceAsync(initMq);
