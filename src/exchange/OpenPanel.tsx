import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { TextOutput } from "@/components/ui/text-output";
import { configuration } from "@/config/env";
import { useSession } from "@/wallet/session-store";
import { openMessage, openMessageError, type OpenedMessage } from "./open";
import { OpenIdentitySetup } from "./OpenIdentitySetup";

export function OpenPanel({
  onConnectWallet,
}: {
  onConnectWallet: () => void;
}) {
  const location = useLocation();
  const { sessionEpoch, identityEpoch } = useSession();
  const [text, setText] = useState(
    () =>
      location.hash ||
      (typeof location.state?.sealedInput === "string"
        ? location.state.sealedInput.slice(0, 12000)
        : ""),
  );
  return (
    <OpenPanelContent
      key={`${sessionEpoch}:${identityEpoch}`}
      text={text}
      setText={setText}
      onConnectWallet={onConnectWallet}
    />
  );
}
function OpenPanelContent({
  text,
  setText,
  onConnectWallet,
}: {
  text: string;
  setText(value: string): void;
  onConnectWallet(): void;
}) {
  const { identities, busy, runIdentityOperation } = useSession();
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<OpenedMessage | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const generation = useRef(0);
  const mounted = useRef(true);
  const active = useRef(false);
  const publicKey = selected || identities[0]?.publicKey || "";
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
    };
  }, []);
  function clearResult() {
    generation.current++;
    setResult(null);
    setError("");
  }
  async function decrypt() {
    const client = configuration.client;
    if (!client || !publicKey || busy || active.current) return;
    active.current = true;
    setWorking(true);
    clearResult();
    const id = generation.current;
    const current = () => mounted.current && id === generation.current;
    try {
      await runIdentityOperation(
        publicKey,
        async (privateKey, sessionCurrent) => {
          const isCurrent = () => current() && sessionCurrent();
          const opened = await openMessage(text, privateKey, client, isCurrent);
          if (isCurrent()) setResult(opened);
        },
      );
    } catch (cause) {
      if (current()) setError(openMessageError(cause));
    } finally {
      active.current = false;
      if (mounted.current) setWorking(false);
    }
  }
  return (
    <div className="stack">
      <OpenIdentitySetup
        selected={publicKey}
        onSelect={(key) => {
          clearResult();
          setSelected(key);
        }}
        onConnectWallet={onConnectWallet}
      />
      <Card>
        <div className="card-head">
          <h2>Decrypt a message</h2>
        </div>
        <div className="card-body stack">
          <p>
            Paste a sealed link or the contents of a sealed-seed file. Choose a
            restored receiving identity, then decrypt explicitly.
          </p>
          {!configuration.client && (
            <p role="status">{configuration.message}</p>
          )}
          <label htmlFor="sealed-input">Sealed link or encrypted seed</label>
          <Textarea
            id="sealed-input"
            rows={4}
            maxLength={12000}
            value={text}
            disabled={working}
            onChange={(event) => {
              clearResult();
              setText(event.target.value);
            }}
          />
          <p className="small muted">
            {publicKey
              ? `Receiving identity: ${identities.find((identity) => identity.publicKey === publicKey)?.label}`
              : "Connect your wallet and restore an identity above to decrypt."}
          </p>
          <Button
            disabled={
              !configuration.client ||
              !publicKey ||
              !text.trim() ||
              busy ||
              working
            }
            onClick={() => void decrypt()}
          >
            {working ? "Decrypting…" : "Decrypt message"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              clearResult();
              setText("");
            }}
          >
            Clear message
          </Button>
          {error && <p role="alert">{error}</p>}
          {result && (
            <section className="stack">
              <p role="status" className="success">
                Message verified and decrypted.
              </p>
              <p>Sender identity unverified</p>
              {result.expired && (
                <p role="status">
                  This authentic message has expired. Cached content may remain
                  available temporarily.
                </p>
              )}
              <p className="small muted">
                Expires at (UTC): {result.expiresAt}
              </p>
              <TextOutput
                id="decrypted-message"
                label="Decrypted message"
                prose
              >
                {result.plaintext}
              </TextOutput>
            </section>
          )}
        </div>
      </Card>
      <Link
        className="identity-setup-link"
        to="/identities"
        state={{ sealedInput: text }}
      >
        Manage saved identities
      </Link>
    </div>
  );
}
