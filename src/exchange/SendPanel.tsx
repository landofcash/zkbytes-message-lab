import { useEffect, useRef, useState } from "react";
import { canonicalTimestamp } from "@zkbytes/sdk";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { TextOutput } from "@/components/ui/text-output";
import { configuration } from "@/config/env";
import { useSession } from "@/wallet/session-store";
import { walletActionProgress } from "@/wallet/WalletApprovalNotice";
import { walletErrorKind, walletErrorMessages } from "@/wallet/errors";
import { ReceiveCardImport } from "./IdentityPanel";
import {
  parseReceiveCard,
  serializeReceiveCard,
  type ReceiveCard,
} from "./receive-card";
import { sealedSeedLink } from "./sealed-seed";
import {
  MAX_MESSAGE_BYTES,
  prepareMessage,
  recoverCandidate,
  uploadCandidate,
  type Candidate,
  type UploadState,
} from "./send";

function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], {
      type: "application/json",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const messages: Record<UploadState, string> = {
  ready: "Encrypted and ready for review. Nothing has been uploaded.",
  active: "Upload complete. The sealed link is ready to share.",
  pending:
    "Storage is still processing this message. Check its status; do not send another copy.",
  uncertain:
    "The upload outcome is unknown. Do not resend. Check status using the original reference.",
  rejected:
    "Storage rejected this request. Check status before deciding whether to retry.",
  "not-found":
    "Storage confirms this item was not found. You can retry the exact prepared message.",
  deleted: "This item was deleted. A sealed link is unavailable.",
  expired: "This item has expired. A sealed link is unavailable.",
};
export function SendPanel({
  initialRecipientText = "",
}: {
  initialRecipientText?: string;
}) {
  const { session, busy, runOperation, walletActivity } = useSession();
  const client = configuration.client;
  const [message, setMessage] = useState("");
  const [recipient, setRecipient] = useState<ReceiveCard | null>(() => {
    try {
      return parseReceiveCard(initialRecipientText);
    } catch {
      return null;
    }
  });
  const [hours, setHours] = useState("24");
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [status, setStatus] = useState<UploadState>("ready");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [includeRecipient, setIncludeRecipient] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const generation = useRef(0);
  const operationLock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
    };
  }, []);
  useEffect(() => {
    if (!candidate) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [candidate]);
  const disabled = working || busy;
  const canOperate = Boolean(client && session && !disabled);
  async function operate(action: "prepare" | "upload" | "recover") {
    if (!client || operationLock.current || !canOperate) return;
    if (action === "prepare" && (candidate || !recipient)) return;
    if (action !== "prepare" && !candidate) return;
    if (action === "upload" && status !== "ready" && status !== "not-found")
      return;
    operationLock.current = true;
    setWorking(true);
    setError("");
    const id = generation.current;
    const localCurrent = () => mounted.current && generation.current === id;
    try {
      await runOperation(
        async (selected, sessionCurrent) => {
          const isCurrent = () => localCurrent() && sessionCurrent();
          if (action === "prepare") {
            if (
              !message.trim() ||
              new TextEncoder().encode(message).length > MAX_MESSAGE_BYTES
            ) {
              setError("Enter a message up to 64 KiB.");
              return;
            }
            const expiresAt = canonicalTimestamp(
              new Date(Date.now() + Number(hours) * 3600000),
            );
            const next = await prepareMessage(
              client,
              message,
              serializeReceiveCard(recipient!),
              expiresAt,
              selected,
              isCurrent,
            );
            if (isCurrent()) {
              setCandidate(next);
              setMessage("");
              setStatus("ready");
            }
          } else {
            if (!isCurrent()) return;
            const next =
              action === "upload"
                ? await uploadCandidate(client, candidate!)
                : await recoverCandidate(client, candidate!);
            if (isCurrent()) {
              setStatus(next);
              setCopied(false);
            }
          }
        },
        { action: "encrypt" },
      );
    } catch (cause) {
      if (localCurrent())
        setError(
          action === "prepare"
            ? walletErrorMessages[walletErrorKind(cause)]
            : "Status could not be verified. Keep the original reference and check again. Do not resend.",
        );
    } finally {
      operationLock.current = false;
      if (localCurrent()) setWorking(false);
    }
  }
  function clear() {
    generation.current++;
    setCandidate(null);
    setMessage("");
    setRecipient(null);
    setStatus("ready");
    setError("");
    setCopied(false);
    setConfirmClear(false);
    setIncludeRecipient(false);
    setFormVersion((value) => value + 1);
  }
  const link =
    candidate && status === "active"
      ? sealedSeedLink(
          window.location.origin,
          candidate.envelope,
          includeRecipient,
        )
      : "";
  return (
    <div className="stack">
      {!candidate && (
        <ReceiveCardImport
          key={formVersion}
          initialText={formVersion === 0 ? initialRecipientText : ""}
          card={recipient}
          disabled={disabled}
          onChange={setRecipient}
        />
      )}
      <Card>
        <div className="card-head">
          <h2>
            {status === "active"
              ? "Message saved"
              : candidate
                ? "Review and upload"
                : "New message"}
          </h2>
        </div>
        <div className="card-body stack">
          {!client && <p role="status">{configuration.message}</p>}
          {!candidate ? (
            <>
              <label htmlFor="message">Message</label>
              <Textarea
                id="message"
                value={message}
                maxLength={MAX_MESSAGE_BYTES}
                disabled={disabled}
                onChange={(event) => setMessage(event.target.value)}
              />
              <label htmlFor="expiration">Expiration</label>
              <select
                id="expiration"
                className="field"
                value={hours}
                disabled={disabled}
                onChange={(event) => setHours(event.target.value)}
              >
                <option value="1">1 hour</option>
                <option value="24">24 hours</option>
                <option value="168">7 days</option>
              </select>
              <p className="small muted">
                Review the recipient and message before signing. Your wallet
                will request one signature. The sender retains access and is the
                deletion manager. Storage may restrict the selected expiration.
              </p>
              {client && (
                <p className="small muted">
                  Upload: {client.apiOrigin}
                  <br />
                  Download: {client.downloadOrigin}
                </p>
              )}
              <Button
                disabled={!canOperate || !recipient || !message.trim()}
                onClick={() => void operate("prepare")}
              >
                {working && walletActivity?.action === "encrypt"
                  ? walletActionProgress(walletActivity)
                  : "Confirm & sign to encrypt"}
              </Button>
              <Button
                disabled={disabled || !message}
                onClick={() => setMessage("")}
              >
                Clear draft
              </Button>
            </>
          ) : (
            <>
              <div
                role="status"
                className={status === "active" ? "upload-success" : undefined}
              >
                {status === "active" && (
                  <CheckCircle2 aria-hidden="true" size={28} />
                )}
                <div>
                  {status === "active" && (
                    <strong>Your encrypted message is saved.</strong>
                  )}
                  <p>{messages[status]}</p>
                  {status === "active" && (
                    <p>
                      Copy the sealed link below and share it with your
                      recipient.
                    </p>
                  )}
                </div>
              </div>
              {status !== "active" && <MessageDetails candidate={candidate} />}
              {(status === "ready" || status === "not-found") && (
                <Button
                  disabled={!canOperate}
                  onClick={() => void operate("upload")}
                >
                  {status === "ready"
                    ? "Confirm upload"
                    : "Retry same encrypted message"}
                </Button>
              )}
              {status !== "ready" &&
                status !== "deleted" &&
                status !== "expired" && (
                  <Button
                    variant="outline"
                    disabled={!canOperate}
                    onClick={() => void operate("recover")}
                  >
                    Check upload status
                  </Button>
                )}
              {link && (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={includeRecipient}
                      onChange={(event) => {
                        setIncludeRecipient(event.target.checked);
                        setCopied(false);
                      }}
                    />{" "}
                    Include recipient public key in link
                  </label>
                  <p className="small muted">
                    {includeRecipient
                      ? "Includes the public key to help identify the matching receiving identity."
                      : "Shortest link. The recipient selects their receiving identity to open it."}
                  </p>
                  <TextOutput id="sealed-link" label="Sealed link">
                    {link}
                  </TextOutput>
                  <Button
                    onClick={() => {
                      void navigator.clipboard.writeText(link).then(
                        () => setCopied(true),
                        () =>
                          setError(
                            "Copy unavailable. Select and copy the link above.",
                          ),
                      );
                    }}
                  >
                    Copy sealed link
                  </Button>
                  <p className="small muted">
                    Share this link with the recipient. They can restore their
                    receiving identity directly on Decrypt to open it.
                  </p>
                </>
              )}
              {status === "active" && (
                <details className="message-details-disclosure">
                  <summary>View details</summary>
                  <MessageDetails candidate={candidate} />
                </details>
              )}
              <p className="small muted">
                Export the sender reference before leaving this page or changing
                wallets. It contains the storage location hidden by the sealed
                link. It is not saved automatically.
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  download("sender-reference.json", candidate.reference)
                }
              >
                Export sender reference
              </Button>
              <Button
                variant="outline"
                disabled={disabled}
                onClick={() => setConfirmClear(true)}
              >
                Clear this exchange
              </Button>
              {confirmClear && (
                <div role="alert">
                  <p>
                    Clear exchange {candidate.reference.seed}? The local
                    reference and prepared message will be discarded. An
                    uploaded message is not deleted.
                  </p>
                  <Button onClick={clear}>Confirm clear</Button>
                  <Button onClick={() => setConfirmClear(false)}>Cancel</Button>
                </div>
              )}
            </>
          )}
          {working && <p role="status">Working…</p>}
          {error && <p role="alert">{error}</p>}
          {copied && <p role="status">Sealed link copied.</p>}
        </div>
      </Card>
    </div>
  );
}

function MessageDetails({ candidate }: { candidate: Candidate }) {
  const { reference, envelope } = candidate;
  const expiration = new Date(reference.expiresAt);
  const formatted = Number.isFinite(expiration.getTime())
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(expiration)
    : reference.expiresAt;
  return (
    <section className="message-details" aria-label="Message details">
      <div className="message-details-heading">
        <h3>Message details</h3>
        <span className="badge">ENCRYPTED</span>
      </div>
      <dl className="message-details-list">
        <div className="detail-expiration">
          <dt>Expires at (UTC)</dt>
          <dd>
            <time dateTime={reference.expiresAt}>{formatted} UTC</time>
          </dd>
        </div>
        <div>
          <dt>Recipient public key</dt>
          <dd>
            <code>{envelope.recipientPublicKey}</code>
          </dd>
        </div>
        <div>
          <dt>Seed</dt>
          <dd>
            <code>{reference.seed}</code>
          </dd>
        </div>
        <div>
          <dt>Expected creator</dt>
          <dd>
            <code>{reference.expectedCreator.publicKey}</code>
          </dd>
        </div>
      </dl>
      <dl className="message-details-origins">
        <div>
          <dt>Upload origin</dt>
          <dd>{reference.apiOrigin}</dd>
        </div>
        <div>
          <dt>Download origin</dt>
          <dd>{reference.downloadOrigin}</dd>
        </div>
      </dl>
    </section>
  );
}
