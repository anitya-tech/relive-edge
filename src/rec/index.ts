import { unixTs } from "@gtr/utils";

import { instanceId } from "../config";
import { getLogger } from "../plugins/log";
import { getMq } from "../plugins/rabbitmq";

import { getService } from "./bililive-rec";
import { resetBililiveRec } from "./reset";
import { watchRedisConfig } from "./sync-config";

const logger = getLogger("rec");

export const startRec = async () => {
  logger.info("remove old bililiveRec config file:");
  await resetBililiveRec();

  logger.info("init new bililiveRec process and set default config:");
  const service = await getService();

  logger.info(
    "read config from redis and apply to bililiveRec process, and keep sync it:"
  );
  await watchRedisConfig(service);

  logger.info("init rabbitmq");
  const { channel, exchange } = await getMq();

  logger.info("init webhook listen, push events to rebbitmq");
  service.webhook?.on("all", async ({ EventType, EventData, EventTimestamp }) =>
    channel.publish(
      exchange.RecEvent,
      `${instanceId}.${EventType}`,
      Buffer.from(JSON.stringify(EventData)),
      {
        timestamp: unixTs(EventTimestamp),
        persistent: EventType === "FileClosed",
      }
    )
  );

  return service;
};