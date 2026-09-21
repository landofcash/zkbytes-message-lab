import { expect, it, vi } from "vitest";
import { readConfiguration } from "@/config/env";

it("calls browser fetch with the global receiver when recovering an upload", async () => {
  const seed = "a".repeat(26);
  const browserFetch = vi.fn(function (this: unknown) {
    // Browser fetch can reject an SDK instance as its receiver before sending HTTP.
    if (this !== globalThis) throw new TypeError("Illegal invocation");
    return Promise.resolve(
      new Response(JSON.stringify({ seed, state: "pending" }), {
        status: 202,
      }),
    );
  });
  vi.stubGlobal("fetch", browserFetch);
  try {
    const { client } = readConfiguration({
      VITE_ZKBYTES_API_ORIGIN: "https://api.test.invalid",
      VITE_ZKBYTES_DOWNLOAD_ORIGIN: "https://files.test.invalid",
    });
    expect(client).not.toBeNull();
    await expect(
      client!.recoverUpload(seed, {
        signatureScheme: "zkbytes-ed25519-v1",
        publicKey: "unused-for-pending",
      }),
    ).resolves.toMatchObject({ outcome: "pending" });
    expect(browserFetch).toHaveBeenCalledWith(
      `https://api.test.invalid/v1/objects/${seed}/status`,
      { method: "GET" },
    );
  } finally {
    vi.unstubAllGlobals();
  }
});
