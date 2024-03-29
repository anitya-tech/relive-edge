import { unixTs } from "@gtr/utils";

import { instanceId } from "../config.js";
import { getDefaultMQ } from "../infra.js";
import { getLogger } from "../log.js";

import { getService } from "./bililive-rec.js";
import { watchRedisConfig } from "./sync-config.js";

const logger = getLogger("rec");

export const startRec = async () => {
  logger.info("init new bililiveRec process and set default config:");
  const service = await getService();

  logger.info(
    "read config from redis and apply to bililiveRec process, and keep sync it:"
  );
  await watchRedisConfig(service);

  logger.info("init rabbitmq");
  const { RecExchange } = await getDefaultMQ();

  logger.info("init webhook listen, push events to rebbitmq");
  service.webhook?.on("all", async ({ EventType, EventData, EventTimestamp }) =>
    RecExchange.publish(`${instanceId}.${EventType}`, EventData, {
      timestamp: unixTs(EventTimestamp),
      persistent: EventType === "FileClosed",
    })
  );

  return service;
};
