import { Command } from "commander";
import { Logger } from "log4js";

export const setCommand = (program: Command, logger: Logger) => {
  program
    .command("transfer")
    .description("读取并执行队列中的传输任务")
    .action(async () => {
      logger.info("start transfer");
      const { listenTransferTasks } = await import("../transfer/index.js");
      await listenTransferTasks()
        .then(() => logger.info("success started"))
        .catch((e) => {
          logger.error("failed to start:", e);
          process.exit(0);
        });
    });
};
