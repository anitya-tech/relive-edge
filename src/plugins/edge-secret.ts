import { vault } from "@gtr/config";
import { onceAsync } from "@gtr/utils";

import { secretPath } from "../config";

export interface ReliveEdgeSecret {
  remote: {
    type: "minio";
    prefix: string;
    bucket: string;
    credential: string;
  };
  rabbitmq: {
    credential: string;
  };
  redis: {
    credential: string;
  };
}

export const getReliveEdgeSecret = onceAsync(() =>
  vault.get<ReliveEdgeSecret>(secretPath)
);
