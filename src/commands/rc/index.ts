import { utils } from "@bililive/rec-sdk";
import chalk from "chalk";
import { Command } from "commander";
import { getBorderCharacters, table } from "table";

import {
  getInstanceIds,
  getSecret,
  initBililiveRec,
  initRedis,
} from "../../infra.js";

const argInstanceId = [
  "<instance-id>",
  "instance id, find it by 'rc list'",
  async (id: string) => {
    const ids = await getInstanceIds();
    if (!ids.includes(id)) {
      console.error(`instance not exist: ${id}`);
      process.exit(1);
    }
    return id;
  },
] as const;

const argRoomIds = [
  "<room-ids...>",
  "room ids",
  (cur: string, prev: number[] = []) => {
    try {
      prev.push(utils.getRoomId(cur));
    } catch (e) {
      console.error(`can't parse as name: ${cur}`);
      process.exit(1);
    }
    return prev;
  },
] as const;

export const setCommand = (program: Command) => {
  const rc = program.command("rc").description("remote contorl");

  rc.command("list").action(async () => {
    console.log((await getInstanceIds()).join("\n"));
  });

  rc.command("stats").action(async () => {
    for (const id of await getInstanceIds()) {
      const secret = await getSecret(id);
      if (!secret.bililive_rec) continue;

      const instanceName = chalk.bgBlueBright.black(`📼 ${id} `);

      const rec = await initBililiveRec(id);
      const rooms = await rec.listRooms();
      if (!rooms.length) {
        console.log(instanceName + " (no rooms)");
        console.log("");
        continue;
      }
      console.log(
        instanceName +
          chalk.blueBright("═".repeat(15) + ">") +
          ` [${secret.remote.bucket}](${secret.remote.prefix})`
      );

      const data = rooms.map((i) => [
        i.recording ? chalk.green("▶️") : "⏸️",
        i.roomId + (i.shortId ? ` (${i.shortId})` : ""),
        i.name,
        i.title,
        i.areaNameParent,
      ]);
      data.unshift(["⏺️", "房间号", "UP主", "标题", "分区"]);
      const tableOutput = table(data, {
        border: {
          ...getBorderCharacters("void"),
          bottomBody: chalk.blueBright("═"),
        },
        columnDefault: { paddingLeft: 0, paddingRight: 2 },
        drawHorizontalLine: (index, size) => {
          return index === size;
        },
      });
      console.log(tableOutput);
    }
  });

  rc.command("add")
    .argument(...argInstanceId)
    .argument(...argRoomIds)
    .action(async (_instanceId: Promise<string>, toAddRoomIds: number[]) => {
      const instanceId = await _instanceId;
      const { roomIds } = await initRedis(instanceId);
      await roomIds.add(...toAddRoomIds);
      roomIds.ctx.redis.disconnect();
    });

  rc.command("rm")
    .option(
      "-f, --force",
      "force remove, regardless of whether it is recording or not"
    )
    .argument(...argInstanceId)
    .argument(...argRoomIds)
    .action(
      async (
        _instanceId: Promise<string>,
        toDeleteRoomIds: number[],
        options: { force?: true }
      ) => {
        const instanceId = await _instanceId;

        const rec = await initBililiveRec(instanceId);
        const remoteRooms = await rec.listRooms();
        const { roomIds } = await initRedis(instanceId);

        for (const toDeleteRoomId of toDeleteRoomIds) {
          const logPrefix = `Room ${toDeleteRoomId}\t `;

          const toDeleteRoom = remoteRooms.find(
            (i) => i.roomId === toDeleteRoomId
          );

          if (!toDeleteRoom) {
            console.log(logPrefix + "not exist");
            continue;
          }

          await roomIds.delete(toDeleteRoomId);
          if (!toDeleteRoom.recording) {
            console.log(logPrefix + "removed");
            continue;
          }

          if (options.force) {
            await toDeleteRoom.remove();
            console.log(logPrefix + "force removed when recording");
            continue;
          }

          console.log(
            logPrefix + "is recording, it will auto remove after stream end"
          );
        }

        roomIds.ctx.redis.disconnect();
      }
    );
};
