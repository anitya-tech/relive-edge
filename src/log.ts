import { env } from "@gtr/utils";
import log4js from "log4js";

log4js.configure({
  appenders: {
    console: { type: "console" },
  },
  categories: {
    default: { appenders: ["console"], level: env.str("LOG_LEVEL", "ERROR") },
  },
});

export const getLogger = log4js.getLogger;
