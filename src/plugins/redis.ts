import { initRedis, RedisStackBuilder } from "@gtr-infra/redis";
import { onceAsync } from "@gtr/utils";

import { instanceId } from "../config.js";

import { getReliveEdgeSecret } from "./edge-secret.js";

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
