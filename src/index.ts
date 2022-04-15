import "dotenv/config";

import { getLogger } from "./log.js";
import { program } from "commander";
import { parseMeta } from "@gtr/utils";
import path from "path";
import { readFile } from "fs/promises";

const logger = getLogger("entry");

const start = async () => {
  const { __dirname } = parseMeta(import.meta);
  const pkg = JSON.parse(
    await readFile(path.resolve(__dirname, "../package.json"), "utf-8")
  );

  program.version(pkg.version).description("无常录播，为您服务");

  await import("./commands/rec.js").then((i) => i.setCommand(program, logger));
  await import("./commands/rc/index.js").then((i) => i.setCommand(program));

  program.parseAsync(process.argv);

  if (!process.argv.slice(2).length) program.help();
};

start();
