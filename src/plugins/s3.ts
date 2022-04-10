import { initMinio, S3Service } from "@gtr-infra/minio";
import { onceAsync } from "@gtr/utils";

import { getReliveEdgeSecret } from "./edge-secret.js";

const initS3 = async () => {
  const secret = await getReliveEdgeSecret();
  const s3 = new S3Service(initMinio(secret.remote.credential));
  const bucket = s3.mkBucket(secret.remote.bucket);
  const prefix = secret.remote.prefix;
  return [bucket, prefix, s3] as const;
};

export const getS3 = onceAsync(initS3);
