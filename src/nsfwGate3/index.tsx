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

// https://moonlight-mod.github.io/ext-dev/webpack/#webpack-module-insertion
export const webpackModules: ExtensionWebExports["webpackModules"] = {
  entrypoint: {
    dependencies: [
      {
        ext: "nsfwGate3",
        id: "someLibrary"
      }
    ],
    entrypoint: true
  },

  someLibrary: {
    // Keep this object, even if it's empty! It's required for the module to be loaded.
  }
};
