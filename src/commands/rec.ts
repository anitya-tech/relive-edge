import { Command } from "commander";
import { Logger } from "log4js";

export const setCommand = (program: Command, logger: Logger) => {
  program
    .command("rec")
    .description("录制并上传到指定存储桶")
    .action(async () => {
      logger.info("start recording");
      const { startRec } = await import("../rec/index.js");
      const { startUpload } = await import("../upload/index.js");
      await Promise.all([startRec(), startUpload()])
        .then(() => logger.info("success started"))
        .catch((e) => {
          logger.error("failed to start:", e);
          process.exit(0);
        });
    });
};
