import { BililiveRec } from "@bililive/rec-sdk";
import { initMinio, S3Service } from "@gtr-infra/minio";
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
  const { EzRedis } = await import("@gtr-infra/redis");
  const vault = await getVault();
  const secret = await getSecret(id);

  const redis = EzRedis.fromSecret(vault.get(secret.redis.credential));
  const config = (await redis).fork(`edge:${id}:config`);

  return {
    redis,
    roomIds: config.createNumberSet("room-ids"),
    cuttingDuration: config.createNumber("cutting-duration"),
  };
});
export const getDefaultRedis = cache(() => initRedis(instanceId));

// RabbitMQ
export const initMQ = cacheWrap(async (id: string) => {
  const { Rabbitmq } = await import("@gtr-infra/rabbitmq");
  const vault = await getVault();
  const secret = await getSecret(id);

  const rabbitmq = await Rabbitmq.fromSecret(
    vault.get(secret.rabbitmq.credential)
  );
  const channel = await rabbitmq.createChannel();

  const RecExchange = await channel.createExchange("rec-events", "topic", {
    durable: true,
  });
  const UploadExchange = await channel.createExchange("rec-events", "topic", {
    durable: true,
  });

  const queueUploadPrefix = "edge-upload-tasks";
  const ThisUploadQueue = await channel.createQueue(
    `${queueUploadPrefix}.${id}`,
    {
      durable: true,
    }
  );
  const TranscodeQueue = await channel.createQueue("edge-transcode-tasks", {
    durable: true,
  });

  ThisUploadQueue.bind(RecExchange, `${id}.FileClosed`);
  TranscodeQueue.bind(UploadExchange, "VIDEO_WITH_DANMAKU");

  return {
    channel,
    RecExchange,
    UploadExchange,
    ThisUploadQueue,
    TranscodeQueue,
  };
});
export const getDefaultMQ = cache(() => initMQ(instanceId));

// S3
export const initS3 = cacheWrap(async (id: string) => {
  const secret = await getSecret(id);
  const s3 = new S3Service(initMinio(await getVault(), secret.remote.credential));
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
