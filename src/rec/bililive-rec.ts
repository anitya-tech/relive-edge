import { Api } from "@bililive/rec-sdk";
import { BililiveRecService } from "@bililive/rec-sdk/dist/service.js";
import { cache } from "@gtr/utils";

import { filenameTemplate, workdir } from "../config.js";

const initService = async () => {
  const service = await BililiveRecService.create({
    portable: true,
    workdir,
    webhook: true,
    extArgs: ["--flog", "Fatal"],
  });

  await service.bililiveRec.setConfig({
    optionalFileNameRecordTemplate: {
      hasValue: true,
      value: filenameTemplate,
    },
    optionalCuttingMode: {
      hasValue: true,
      value: Api.CuttingMode.ByTime,
    },
    optionalRecordDanmaku: {
      hasValue: true,
      value: true,
    },
    optionalRecordDanmakuRaw: {
      hasValue: true,
      value: true,
    },
    optionalRecordDanmakuSuperChat: {
      hasValue: true,
      value: true,
    },
    optionalRecordDanmakuGift: {
      hasValue: true,
      value: true,
    },
    optionalRecordDanmakuGuard: {
      hasValue: true,
      value: true,
    },
    optionalRecordingQuality: {
      hasValue: true,
      value: "10000,20000,30000,401,400,250,150,80",
    },
  });

  return service;
};

export const getService = cache(initService);
