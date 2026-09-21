import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useSession } from "@/wallet/session-store";
import {
  createReceiveCard,
  parseReceiveCard,
  serializeReceiveCard,
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
    error,
    sessionEpoch,
    identityEpoch,
  } = useSession();
  const [label, setLabel] = useState("personal");
  const [copyStatus, setCopyStatus] = useState("");
  return (
    <Card>
      <div className="card-head">
        <h2>Receiving identities</h2>
      </div>
      <div className="card-body stack">
        <p className="small muted">
          Restore with the same wallet account and exact label, including
          capitalization. Labels are not passwords. Keys stay in memory until
          locked or the wallet changes.
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
            Create / restore keys
          </Button>
        </form>
        {!session && (
          <p className="small muted">
            Use Connect wallet at the top to create or restore receiving keys.
          </p>
        )}
        <p className="small muted">
          Compatibility testing is optional under Tools. Restoring the same keys
          requires your wallet to return a reproducible signature.
        </p>
        {error && <p role="alert">{error}</p>}
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
  onChange,
}: {
  disabled?: boolean;
  onChange?: (card: ReceiveCard | null) => void;
}) {
  const [text, setText] = useState("");
  const [card, setCard] = useState<ReceiveCard | null>(null);
  const [error, setError] = useState("");
  return (
    <Card>
      <div className="card-head">
        <h2>Recipient Receive card</h2>
      </div>
      <div className="card-body stack">
        <label htmlFor="recipient-card">Paste a Receive card</label>
        <Textarea
          id="recipient-card"
          disabled={disabled}
          value={text}
          maxLength={2048}
          rows={4}
          placeholder="zkbytes.v1.…"
          onChange={(event) => {
            setText(event.target.value);
            setCard(null);
            onChange?.(null);
            setError("");
          }}
        />
        <Button
          disabled={disabled}
          onClick={() => {
            try {
              const next = parseReceiveCard(text);
              setCard(next);
              onChange?.(next);
              setError("");
            } catch {
              setCard(null);
              onChange?.(null);
              setError(
                "Invalid Receive card or wallet signature. Ask the recipient for a fresh export.",
              );
            }
          }}
        >
          Import Receive card
        </Button>
        {error && <p role="alert">{error}</p>}
        {card && (
          <>
            <p role="status">
              Receive card valid. Confirm this public key with your recipient.
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
  const { busy, runOperation } = useSession();
  const [signed, setSigned] = useState<ReceiveCard | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const active = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const card = serializeReceiveCard(
    signed ?? createReceiveCard(identity.publicKey),
  );
  async function sign() {
    if (busy || active.current) return;
    active.current = true;
    setError("");
    setStatus("");
    try {
      await runOperation(async (signer, sessionCurrent) => {
        const current = () => mounted.current && sessionCurrent();
        const next = await signReceiveCard(identity.publicKey, signer, current);
        if (current()) setSigned(next);
      });
    } catch {
      if (mounted.current)
        setError(
          "Card signing failed or was rejected. Your unsigned card remains available.",
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
      <label htmlFor={`card-${identity.label}`}>
        Receive card for {identity.label}
      </label>
      <Textarea
        id={`card-${identity.label}`}
        value={card}
        readOnly
        rows={signed ? 4 : 2}
      />
      <Button
        onClick={() => {
          void navigator.clipboard.writeText(card).then(
            () => {
              if (mounted.current) setStatus("Receive card copied.");
            },
            () => {
              if (mounted.current)
                setStatus("Copy unavailable. Select and copy the card above.");
            },
          );
        }}
      >
        Copy Receive card
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          const url = URL.createObjectURL(
            new Blob([card], { type: "text/plain" }),
          );
          const link = document.createElement("a");
          link.href = url;
          link.download = "receive-card.txt";
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}
      >
        Export Receive card
      </Button>
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
              setStatus("");
            }}
          >
            Use unsigned card
          </Button>
        </>
      ) : (
        <>
          <p className="small muted">
            Optional: endorse this key with your wallet. One additional
            signature; your wallet address will be included in the shared card.
          </p>
          <Button variant="outline" disabled={busy} onClick={() => void sign()}>
            Sign Receive card
          </Button>
        </>
      )}
      {status && <p role="status">{status}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
