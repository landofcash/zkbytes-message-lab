import {
  decodeBase64,
  encodeBase64,
  parseStrictJson,
  validateX25519PublicKey,
} from "@zkbytes/sdk";
import { IDENTITY_PROFILE } from "./identity";
export type ReceiveCard = {
  format: "zkbytes-receive-card";
  version: 1;
  profile: typeof IDENTITY_PROFILE;
  algorithm: "X25519";
  publicKey: string;
};
export function createReceiveCard(publicKey: string): ReceiveCard {
  const key = decodeBase64(publicKey);
  validateX25519PublicKey(key);
  if (key.every((byte) => byte === 0)) throw new Error("Invalid public key.");
  if (encodeBase64(key) !== publicKey)
    throw new Error("Noncanonical public key.");
  return {
    format: "zkbytes-receive-card",
    version: 1,
    profile: IDENTITY_PROFILE,
    algorithm: "X25519",
    publicKey,
  };
}
export function parseReceiveCard(text: string): ReceiveCard {
  if (new TextEncoder().encode(text).length > 2048)
    throw new Error("Receive card is too large.");
  const card = parseStrictJson(text);
  if (
    !card ||
    typeof card !== "object" ||
    Array.isArray(card) ||
    Object.keys(card).sort().join(",") !==
      "algorithm,format,profile,publicKey,version"
  )
    throw new Error("Invalid Receive card.");
  const value = card as Record<string, unknown>;
  if (
    value.format !== "zkbytes-receive-card" ||
    value.version !== 1 ||
    value.profile !== IDENTITY_PROFILE ||
    value.algorithm !== "X25519" ||
    typeof value.publicKey !== "string"
  )
    throw new Error("Unsupported Receive card.");
  return createReceiveCard(value.publicKey);
}
