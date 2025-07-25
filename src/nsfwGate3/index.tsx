import { ExtensionWebExports } from "@moonlight-mod/types";

export const patches: ExtensionWebExports["patches"] = [
  {
    find: ".nsfwAllowed=null",
    replace: [
      {
        match: /(?<=\.nsfwAllowed=)null!=.+?(?=[,;])/,
        replacement: "true"
      },
      {
        match: /(?<=\.ageVerificationStatus=)null!=.+?(?=[,;])/,
        replacement: "3"
      }
    ]
  }
];
