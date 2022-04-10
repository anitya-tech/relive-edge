import { Api } from "@bililive/rec-sdk";
import { BililiveRecService } from "@bililive/rec-sdk/dist/service";
import { onceAsync } from "@gtr/utils";

import { filenameTemplate, workdir } from "../config";

const initService = async () => {
  const service = await BililiveRecService.create({
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
      value: "20000,10000,401,400,250,150,80",
    },
  });

  return service;
};

export const getService = onceAsync(initService);
