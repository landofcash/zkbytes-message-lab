import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useSession } from "@/wallet/session-store";
import {
  createReceiveCard,
  parseReceiveCard,
  type ReceiveCard,
} from "./receive-card";

export function IdentityPanel() {
  const { identities, restoreIdentity, lockIdentities, busy, compatibility } =
    useSession();
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
          <Button
            type="submit"
            disabled={busy || compatibility !== "compatible"}
          >
            Create / restore keys
          </Button>
        </form>
        {compatibility !== "compatible" && (
          <p className="small muted">
            Connect a wallet and pass the compatibility check first.
          </p>
        )}
        {identities.map((identity) => {
          const card = JSON.stringify(
            createReceiveCard(identity.publicKey),
            null,
            2,
          );
          return (
            <section key={identity.label} className="stack">
              <h3>{identity.label}</h3>
              <p className="small muted">
                Public encryption key · not proof of a person's identity
              </p>
              <code style={{ overflowWrap: "anywhere" }}>
                {identity.publicKey}
              </code>
              <label htmlFor={`card-${identity.label}`}>
                Receive card for {identity.label}
              </label>
              <Textarea
                id={`card-${identity.label}`}
                value={card}
                readOnly
                rows={8}
              />
              <Button
                onClick={() => {
                  void navigator.clipboard.writeText(card).then(
                    () => setCopyStatus("Receive card copied."),
                    () =>
                      setCopyStatus(
                        "Copy unavailable. Select and copy the Receive card above.",
                      ),
                  );
                }}
              >
                Copy Receive card
              </Button>
              <Button
                onClick={() => {
                  const url = URL.createObjectURL(
                    new Blob([card], { type: "application/json" }),
                  );
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "receive-card.json";
                  link.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                Export Receive card
              </Button>
            </section>
          );
        })}
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
          rows={8}
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
                "Invalid or unsupported Receive card. Ask the recipient for a fresh export.",
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
              This identifies an encryption key, not an authenticated person.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
