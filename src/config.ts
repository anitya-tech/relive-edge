import "dotenv/config";
import { mkdirSync } from "fs";
import os from "os";
import path from "path";

import { env } from "@gtr/utils";

export const workdir = env.str(
  "RELIVE_EDGE_WORKDIR",
  path.join(os.homedir(), "relive-edge")
);
mkdirSync(workdir, { recursive: true });

export const filenameTemplate =
  '{{ roomId }}-{{ "now" | time_zone: "Asia/Shanghai" | format_date: "yyyyMMdd-HHmmss-fff" }}.flv';

export const instanceId = env.str("INSTANCE_ID", "develop");
export const vaultPrefix = "projects/relive/edge";
export const defaultSecretPath = `${vaultPrefix}/${instanceId}`;
