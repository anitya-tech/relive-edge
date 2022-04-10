import fs from "fs/promises";
import path from "path";

import { workdir } from "../config";
import { getLogger } from "../plugins/log";

const logger = getLogger("rec.reset");

export const resetBililiveRec = async () => {
  logger.info("start reset");
  for (const file of await fs.readdir(workdir)) {
    if (file.match(/^config\.(.+\.)?json$/)) {
      logger.info(`delete ${file}...`);
      await fs.unlink(path.join(workdir, file));
    }
  }
};
