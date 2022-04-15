import { env } from "@gtr/utils";
import log4js from "log4js";

log4js.configure({
  appenders: {
    console: { type: "console" },
  },
  categories: {
    default: { appenders: ["console"], level: env("LOG_LEVEL") ?? "error" },
  },
});

export const getLogger = log4js.getLogger;
