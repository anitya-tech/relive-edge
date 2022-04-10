import { BililiveRecService } from "@bililive/rec-sdk/dist/service";
import { delay } from "@gtr/utils";

import { getLogger } from "../plugins/log";
import { getRedis } from "../plugins/redis";

const logger = getLogger("rec.sync-config");

export const watchRedisConfig = async ({
  bililiveRec: rec,
}: BililiveRecService) => {
  logger.info("init");
  const { cuttingDuration, roomIds } = await getRedis();

  const updateCuttingDuration = async () => {
    logger.info("sync cuttingDuration");
    await rec.setConfig({
      optionalCuttingNumber: {
        hasValue: true,
        value: await cuttingDuration.get(30),
      },
    });
  };

  let delayWork: NodeJS.Timeout | null = null;
  const updateRooms = async () => {
    if (delayWork) clearInterval(delayWork);
    logger.info("sync rooms");
    const [localRooms, expectedIds] = await Promise.all([
      rec.listRooms(),
      roomIds.values().then((v) => v.map((i) => Number(i))),
    ]);

    const localRoomIds = localRooms.map((r) => r.roomId);

    const toBeAddRoomIds = expectedIds.filter((i) => !localRoomIds.includes(i));
    const toBeRemovedRooms = localRooms.filter(
      (i) => !expectedIds.includes(i.roomId)
    );
    const immediatelyRemove = toBeRemovedRooms.filter((i) => !i.recording);
    const delayRemove = toBeRemovedRooms.filter((i) => i.recording);

    logger.info("apply room changes:", {
      add: toBeAddRoomIds,
      immediatelyRemove: immediatelyRemove.map((i) => i.roomId),
      delayRemove: delayRemove.map((i) => i.roomId),
    });

    const addWorks = toBeAddRoomIds.map((roomId) =>
      rec.addRoom({ roomId, autoRecord: true })
    );
    const removeWorks = immediatelyRemove.map((i) => i.remove());

    if (delayRemove.length) delayWork = setInterval(updateRooms, 60 * 1000);
    await Promise.all([...addWorks, ...removeWorks]);
  };

  await Promise.all([updateCuttingDuration(), updateRooms()]);

  roomIds.watch((action) => {
    if (action === "sadd" || action === "srem")
      updateRooms().catch((e) => logger.error(`updateRooms ${action}`, e));
  });

  cuttingDuration.watch((action) => {
    if (action === "set" || action === "delete")
      updateCuttingDuration().catch((e) =>
        logger.error(`updateCuttingDuration ${action}`, e)
      );
  });
};
