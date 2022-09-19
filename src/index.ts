import "dotenv/config";

import { readFile } from "fs/promises";
import path from "path";

import { parseMeta } from "@gtr/utils";
import { program } from "commander";

import { getLogger } from "./log.js";

const logger = getLogger("entry");

const start = async () => {
  const { __dirname } = parseMeta(import.meta);
  const pkg = JSON.parse(
    await readFile(path.resolve(__dirname, "../package.json"), "utf-8")
  );

  program.version(pkg.version).description("无常录播，为您服务");

  await import("./commands/rec.js").then((i) => i.setCommand(program, logger));
  await import("./commands/transfer.js").then((i) =>
    i.setCommand(program, logger)
  );
  await import("./commands/rc/index.js").then((i) => i.setCommand(program));

  program.parseAsync(process.argv);

  if (!process.argv.slice(2).length) program.help();
};

start();
