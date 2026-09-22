import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { CopyableField } from "@/components/ui/copyable-field";
import { useSession } from "@/wallet/session-store";
import { walletActionProgress } from "@/wallet/WalletApprovalNotice";
import {
  createReceiveCard,
  parseReceiveCard,
  receiveLink,
  signReceiveCard,
  type ReceiveCard,
} from "./receive-card";

export function IdentityPanel() {
  const {
    identities,
    restoreIdentity,
    lockIdentities,
    busy,
    session,
    sessionEpoch,
    identityEpoch,
    walletActivity,
  } = useSession();
  const [label, setLabel] = useState("personal");
  const [copyStatus, setCopyStatus] = useState("");
  return (
    <Card>
      <div className="card-head">
        <h2>Create or restore an identity</h2>
      </div>
      <div className="card-body stack">
        <p className="small muted">
          Restore with the same wallet account and exact label, including
          capitalization. Labels are not passwords. Keys stay in memory until
          locked or the wallet changes. Your wallet address, label and public
          key are saved in this browser after restoration.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setCopyStatus("");
            void restoreIdentity(label);
          }}
        >
          <label htmlFor="identity-label">Key label</label>
          <Input
            id="identity-label"
            value={label}
            maxLength={64}
            onChange={(event) => setLabel(event.target.value)}
            disabled={busy}
          />
          <p className="small muted">
            One signature approval. Use letters, numbers, spaces, dots,
            underscores or hyphens. Start with a letter or number; no trailing
            spaces.
          </p>
          <Button type="submit" disabled={busy || !session}>
            {walletActivity?.action === "restore" &&
            walletActivity.label === label
              ? walletActionProgress(walletActivity)
              : "Create / restore keys"}
          </Button>
        </form>
        <p className="small muted">
          Compatibility testing is optional under Tools. Restoring the same keys
          requires your wallet to return a reproducible signature.
        </p>
        {identities.map((identity) => (
          <ReceiveCardDisplay
            key={`${sessionEpoch}:${identityEpoch}:${identity.publicKey}`}
            identity={identity}
          />
        ))}
        {identities.length > 0 && (
          <Button
            onClick={() => {
              lockIdentities();
              setCopyStatus("");
            }}
          >
            Lock / clear keys
          </Button>
        )}
        {copyStatus && <p role="status">{copyStatus}</p>}
      </div>
    </Card>
  );
}

export function ReceiveCardImport({
  disabled = false,
  initialText = "",
  card,
  onChange,
}: {
  disabled?: boolean;
  initialText?: string;
  card: ReceiveCard | null;
  onChange: (card: ReceiveCard | null) => void;
}) {
  const [text, setText] = useState(initialText);
  const invalidMessage =
    "Invalid Receive link or wallet signature. Ask the recipient for a fresh link.";
  const [error, setError] = useState(
    initialText && !card ? invalidMessage : "",
  );
  return (
    <Card>
      <div className="card-head">
        <h2>Recipient</h2>
      </div>
      <div className="card-body stack">
        <label htmlFor="recipient-card">Paste a Receive link</label>
        <Textarea
          id="recipient-card"
          className="recipient-field"
          disabled={disabled}
          value={text}
          maxLength={2048}
          rows={2}
          placeholder="https://…/send#zkbytes.v1.…"
          spellCheck={false}
          autoCapitalize="none"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "recipient-error" : undefined}
          onChange={(event) => {
            setText(event.target.value);
            onChange(null);
            setError("");
          }}
        />
        <Button
          disabled={disabled}
          onClick={() => {
            try {
              const next = parseReceiveCard(text);
              onChange(next);
              setError("");
            } catch {
              onChange(null);
              setError(invalidMessage);
            }
          }}
        >
          Use recipient
        </Button>
        {error && (
          <p id="recipient-error" role="alert">
            {error}
          </p>
        )}
        {card && (
          <>
            <p role="status">
              Receive link valid. Confirm this public key with your recipient.
            </p>
            <code style={{ overflowWrap: "anywhere" }}>{card.publicKey}</code>
            <p className="small muted">
              {card.endorsement
                ? `Receiving key endorsed by ${card.endorsement.walletAddress}`
                : "Receiving key · wallet identity unverified"}
            </p>
            {card.endorsement && (
              <p className="small muted">
                The wallet endorsed this key. This does not verify a person's
                identity, possession of the receiving private key, or the sender
                of a message.
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function ReceiveCardDisplay({
  identity,
}: {
  identity: { label: string; publicKey: string };
}) {
  const { busy, runOperation, walletActivity } = useSession();
  const [signed, setSigned] = useState<ReceiveCard | null>(null);
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const active = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const card = receiveLink(
    window.location.origin,
    signed ?? createReceiveCard(identity.publicKey),
  );
  async function sign() {
    if (busy || active.current) return;
    active.current = true;
    setError("");
    try {
      await runOperation(
        async (signer, sessionCurrent) => {
          const current = () => mounted.current && sessionCurrent();
          const next = await signReceiveCard(
            identity.publicKey,
            signer,
            current,
          );
          if (current()) setSigned(next);
        },
        { action: "endorse", label: identity.label },
      );
    } catch {
      if (mounted.current)
        setError(
          "Link signing failed or was rejected. Your unsigned link remains available.",
        );
    } finally {
      active.current = false;
    }
  }
  return (
    <section className="stack">
      <h3>{identity.label}</h3>
      <p className="small muted" style={{ overflowWrap: "anywhere" }}>
        {signed
          ? `Receiving key endorsed by ${signed.endorsement!.walletAddress}`
          : "Receiving key · wallet identity unverified"}
      </p>
      <CopyableField
        label={`Receive link for ${identity.label}`}
        value={card}
      />
      <p className="small muted">
        Click to copy, then share this link so someone can open Encrypt with you
        as the recipient.
      </p>
      {signed ? (
        <>
          <p className="small muted">
            Wallet endorsement verified. This does not prove a person's identity
            or ownership of the receiving private key.
          </p>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              setSigned(null);
            }}
          >
            Use unsigned link
          </Button>
        </>
      ) : (
        <>
          <p className="small muted">
            Optional: endorse this key with your wallet. One additional
            signature; your wallet address will be included in the shared link.
          </p>
          <Button variant="outline" disabled={busy} onClick={() => void sign()}>
            {walletActivity?.action === "endorse" &&
            walletActivity.label === identity.label
              ? walletActionProgress(walletActivity)
              : "Sign Receive link"}
          </Button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
