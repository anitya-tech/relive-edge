import { initRedis, RedisStackBuilder } from "@gtr-infra/redis";
import { onceAsync } from "@gtr/utils";

import { instanceId } from "../config";

import { getReliveEdgeSecret } from "./edge-secret";

export const getRedis = onceAsync(async () => {
  const secret = await getReliveEdgeSecret();
  const redis = await initRedis(secret.redis.credential);
  const rsb = new RedisStackBuilder(redis, `edge:${instanceId}`);

  const config = rsb.mkChild("config");
  return {
    redis,
    roomIds: config.set("room-ids"),
    cuttingDuration: config.number("cutting-duration"),
  };
});
