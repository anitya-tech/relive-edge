import test from "ava";

import { RecPath } from "../src/utils.js";

const pure = (...args: [x: any, y: any]) =>
  args.map((i) => JSON.parse(JSON.stringify(i))) as [x: any, y: any];

test.serial("rec-path.object-key", (t) => {
  const path1 = RecPath.fromObjectKey("stream/raw/8643223/20211227/232438.flv");
  const meta1 = {
    room_id: "8643223",
    encode_state: "raw",
    date: "20211227",
    time: "232438",
    ms: "000",
    extension: "flv",
  };
  t.deepEqual(...pure(meta1, path1));

  const key2 = "stream/raw/8643223/20211227/232438-064.flv";
  const meta2 = {
    room_id: "8643223",
    encode_state: "raw",
    date: "20211227",
    time: "232438",
    ms: "064",
    extension: "flv",
  };
  const path2 = RecPath.fromObjectKey(key2);
  t.deepEqual(...pure(meta2, path2));
  t.is(path2.toObjectKey(), key2);

  const meta3 = {
    room_id: "8643223",
    // encode_state: "raw",
    date: "20211227",
    time: "232438",
    // ms: "064",
    extension: "flv",
  };
  const path3 = new RecPath(meta3);
  t.is(
    path3.toObjectKey(undefined, "raw"),
    "stream/raw/8643223/20211227/232438-000.flv"
  );
  t.throws(() => path3.toObjectKey(), { message: "encode_state not defined" });
});

test.serial("rec-path.from-recfile", (t) => {
  const path1 = RecPath.fromRecFile("5275-20220502-144015.xml");
  const meta1 = {
    room_id: "5275",
    encode_state: "raw",
    date: "20220502",
    time: "144015",
    ms: "000",
    extension: "xml",
  };
  t.deepEqual(...pure(meta1, path1));

  const path2 = RecPath.fromRecFile("5275-20220502-144015-751.xml");
  const meta2 = {
    room_id: "5275",
    encode_state: "raw",
    date: "20220502",
    time: "144015",
    ms: "751",
    extension: "xml",
  };
  t.deepEqual(...pure(meta2, path2));

  const path3 = RecPath.fromOriginRecFile(
    "14846654-小司无常/录制-14846654-20220430-060237-843-【？】早五点的101！ 友情局！.flv"
  );
  const meta3 = {
    room_id: "14846654",
    encode_state: "raw",
    date: "20220430",
    time: "060237",
    ms: "843",
    extension: "flv",
  };
  t.deepEqual(...pure(meta3, path3));
});
