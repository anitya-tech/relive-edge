import { StorageFile } from "@gtr/relive-db/dist/models/StorageFile.js";
import { FilterQuery } from "mongoose";

import { getLogger } from "../log.js";

import { initInfra } from "./infra.js";

const logger = getLogger("transfer/move");

export const vertify = async () => {
  const { db } = await initInfra();

  const query: FilterQuery<StorageFile> = {
    $and: [
      { key: { $regex: /stream\/encoded\/.*/ } },
    ],
  };

  const files = await db.StorageFile.find(query);
  logger.info(`total files: ${files.length}`);

  const kMap: Record<string, true> = {}
  for (const f of files) {
    const key = f.storagePolicy + ":" + f.key
    if (kMap[key]) {
      console.log(key)
    } else {
      kMap[key] = true
    }
  }
  console.log("done")
};

vertify()