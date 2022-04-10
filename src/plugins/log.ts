import { env } from "@gtr/utils";
import { configure, getLogger } from "log4js";

configure({
  appenders: {
    console: { type: "console" },
  },
  categories: {
    default: { appenders: ["console"], level: env("LOG_LEVEL") ?? "error" },
  },
});

export { getLogger };
