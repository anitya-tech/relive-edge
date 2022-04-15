import { BililiveRec } from "@bililive/rec-sdk";
import { initMinio, S3Service } from "@gtr-infra/minio";
import { initRabbitmq } from "@gtr-infra/rabbitmq";
import { Vault } from "@gtr/config";
import { cache, cacheWrap } from "@gtr/utils";
import { instanceId, vaultPrefix } from "./config.js";

// Vault
export interface ReliveEdgeSecret {
  remote: { type: "minio"; prefix: string; bucket: string; credential: string };
  rabbitmq: { credential: string };
  redis: { credential: string };
  bililive_rec: { url: string };
}
export const getVault = cache(() => Vault.fromEnv({ prefix: vaultPrefix }));
export const getInstanceIds = cache(() => getVault().then((v) => v.list()));
export const getSecret = cacheWrap((id: string) =>
  getVault().then((v) => v.get<ReliveEdgeSecret>(id))
);

// Redis
export const initRedis = cacheWrap(async (id: string) => {
  const { initRedis, RedisStackBuilder } = await import("@gtr-infra/redis");

  const secret = await getSecret(id);
  const redis = await initRedis(secret.redis.credential);
  const rsb = new RedisStackBuilder(redis, `edge:${id}`);

  const config = rsb.mkChild("config");
  return {
    redis,
    roomIds: config.set("room-ids"),
    cuttingDuration: config.number("cutting-duration"),
  };
});
export const getDefaultRedis = cache(() => initRedis(instanceId));

// RabbitMQ
const cachedInitRabbitmq = cacheWrap(initRabbitmq);
export const initMQ = cacheWrap(async (id: string) => {
  const secret = await getSecret(id);
  const rabbitmq = await cachedInitRabbitmq(secret.rabbitmq.credential);

  const exchange = {
    RecEvent: "rec-events",
    UploadEvent: "edge-upload",
  } as const;
  const queueUploadPrefix = "edge-upload-tasks";
  const queue = {
    ThisUpload: `${queueUploadPrefix}.${id}`,
    Transcode: "edge-transcode-tasks",
  } as const;

  const channel = await rabbitmq.createChannel();

  await channel.assertExchange(exchange.RecEvent, "topic", { durable: true });
  await channel.assertQueue(queue.ThisUpload, { durable: true });
  await channel.bindQueue(
    queue.ThisUpload,
    exchange.RecEvent,
    `${id}.FileClosed`
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

  return { channel, exchange, queue };
});
export const getDefaultMQ = cache(() => initMQ(instanceId));

// S3
export const initS3 = cacheWrap(async (id: string) => {
  const secret = await getSecret(id);
  const s3 = new S3Service(initMinio(secret.remote.credential));
  const bucket = s3.mkBucket(secret.remote.bucket);
  const prefix = secret.remote.prefix;
  return [bucket, prefix, s3] as const;
});
export const getDefaultS3 = cache(() => initS3(instanceId));

// BililiveRec
export const initBililiveRec = cacheWrap(async (id: string) => {
  const secret = await getSecret(id);
  return new BililiveRec({ httpUrl: secret.bililive_rec.url });
});
