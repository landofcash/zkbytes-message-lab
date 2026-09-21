import { ZkbytesClient } from "@zkbytes/sdk";

type Environment = Record<string, string | boolean | undefined>;
export function readConfiguration(env: Environment) {
  const apiOrigin = env.VITE_ZKBYTES_API_ORIGIN;
  const downloadOrigin = env.VITE_ZKBYTES_DOWNLOAD_ORIGIN;
  if (
    typeof apiOrigin !== "string" ||
    typeof downloadOrigin !== "string" ||
    !apiOrigin ||
    !downloadOrigin ||
    /example\.com/.test(apiOrigin + downloadOrigin)
  ) {
    return {
      client: null,
      message:
        "Storage is not configured. Local wallet checks are available; sending and downloading are unavailable.",
    };
  }
  try {
    return {
      client: new ZkbytesClient({ apiOrigin, downloadOrigin }),
      message: null,
    };
  } catch {
    return {
      client: null,
      message:
        "Storage configuration is invalid. Both endpoints must be HTTPS origins without paths or trailing slashes.",
    };
  }
}
export const configuration = readConfiguration(import.meta.env);
