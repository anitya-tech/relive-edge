import "dotenv/config";
import { Vault } from "@gtr/config";
import { cache, env } from "@gtr/utils";

interface ReliveEdgeTransfer {
  rabbitmq: { credential: string };
  redis: { credential: string };
  mongodb: { credential: string };
  policies_pairs: [from: string, to: string][];
}

interface MongoSecret {
  auth_database: string;
  hostname: string;
  password: string;
  port: string;
  ssl: boolean;
  username: string;
}

interface TransferRequest {
  fileId: string;
  from: {
    policy: string;
    key: string;
  };
  to: {
    policy: string;
    key: string;
  };
}

const instanceId = env.str("TRANSFER_INSTANCE_ID", "develop");
export const getVault = cache(() => Vault.fromEnv());

export const initInfra = cache(async () => {
  const { Rabbitmq } = await import("@gtr-infra/rabbitmq");
  const vault = await getVault();

  console.log(instanceId);
  await vault
    .get<ReliveEdgeTransfer>(`projects/relive/transfer/${instanceId}`)
    .catch((e) => console.log(e));
  const config = await vault.get<ReliveEdgeTransfer>(
    `projects/relive/transfer/${instanceId}`
  );

  // RabbitMQ
  const rabbitmq = await Rabbitmq.fromSecret(
    vault.get(config.rabbitmq.credential)
  );
  const channel = await rabbitmq.createChannel();
  // RabbitMQ - TransferReq
  const TransferRequestExchange = await channel.createExchange<TransferRequest>(
    "transfer-request",
    "topic",
    { durable: true }
  );

  // priority:
  // 0: periodic task
  // 1: unimportant biz
  // 2: important biz
  // 3: user submitted
  const TransferQueue = await channel.createQueue<TransferRequest>(
    `transfer.${instanceId}`,
    { durable: true, maxPriority: 8 }
  );

  for (const [from, to] of config.policies_pairs)
    await TransferQueue.bind(TransferRequestExchange, `${from}.${to}`);

  // MongoDb
  const mg = (await import("mongoose")).default;
  const { initDB } = await import("@gtr/relive-db");
  const mgsec = await vault.get<MongoSecret>(config.mongodb.credential);
  const conn = mg.createConnection(
    `mongodb://${mgsec.hostname}:${mgsec.port}/${mgsec.auth_database}`,
    { ssl: mgsec.ssl, user: mgsec.username, pass: mgsec.password }
  );
  const db = await initDB(conn);

  return { channel, TransferRequestExchange, TransferQueue, db, vault, config };
});
