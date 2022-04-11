import "dotenv/config";
import { mkdirSync } from "fs";
import os from "os";
import path from "path";

import { env } from "@gtr/utils";


export const workdir = env("RELIVE_EDGE_WORKDIR") ?? path.join(os.homedir(), "relive-edge");
mkdirSync(workdir, { recursive: true });

export const filenameTemplate =
  '{{ roomId }}-{{ "now" | format_date: "yyyyMMdd-HHmmss" }}.flv';

export const instanceId = env("INSTANCE_ID") ?? "develop";
export const secretPath = `projects/relive/edge/${instanceId}`;
