import "dotenv/config";

import { getLogger } from "./plugins/log.js";
import { startRec } from "./rec/index.js";
import { startUpload } from "./upload/index.js";

const logger = getLogger("entry");

const services = Array.from(
  new Set(process.argv.slice(2).map((i) => i.toLocaleLowerCase()))
);

const serviceMap: Record<string, () => Promise<unknown>> = {
  rec: startRec,
  upload: startUpload,
};

const unknownServices = services.filter((i) => !serviceMap[i]);
if (unknownServices.length) {
  logger.error("unknown services:", unknownServices);
  process.exit(1);
}

logger.info("start services:", services);

Promise.all(services.map((i) => serviceMap[i]?.()))
  .then(() => {
    logger.info("success started");
  })
  .catch((e) => {
    logger.error("failed to start:", e);
    process.exit(0);
  });
