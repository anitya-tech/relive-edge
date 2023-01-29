import { Command, Option } from "commander";
import { Logger } from "log4js";

import { TransferOptions } from './../transfer/index';

export const setCommand = (program: Command, logger: Logger) => {
  program
    .command("transfer")
    .description("读取并执行队列中的传输任务")
    .addOption(new Option('--light-load-parallel <number>', 'concurrent tasks for small files').default(16))
    .addOption(new Option('--heavy-load-parallel <number>', 'concurrent tasks for large files').default(4))
    .action(async (options: TransferOptions) => {
      logger.info("start transfer");
      const { listenTransferTasks } = await import("../transfer/index.js");
      await listenTransferTasks(options)
        .then(() => logger.info("success started"))
        .catch((e) => {
          logger.error("failed to start:", e);
          process.exit(0);
        });
    });
};
