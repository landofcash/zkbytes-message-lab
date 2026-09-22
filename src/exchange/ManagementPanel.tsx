import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { ZkbytesReference } from "@zkbytes/sdk";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { configuration } from "@/config/env";
import { useSession } from "@/wallet/session-store";
import {
  importReference,
  prepareDeletion,
  recoverReference,
  recoveryMessages,
  type PreparedDeletion,
} from "./management";

export function ManagementPanel({ mode }: { mode: "recover" | "delete" }) {
  const { session, busy, runOperation } = useSession();
  const [text, setText] = useState("");
  const [reference, setReference] = useState<ZkbytesReference | null>(null);
  const [review, setReview] = useState<{
    publicKey: string;
    managerIndex: number;
  } | null>(null);
  const [status, setStatus] = useState<keyof typeof recoveryMessages | null>(
    null,
  );
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [polling, setPolling] = useState<ZkbytesReference | null>(null);
  const prepared = useRef<PreparedDeletion | null>(null);
  const generation = useRef(0);
  const active = useRef(false);
  useEffect(
    () => () => {
      generation.current++;
      prepared.current?.dispose();
    },
    [],
  );
  useEffect(() => {
    const client = configuration.client;
    if (!polling || !client) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    async function poll() {
      if (!client || !polling) return;
      try {
        const next = await recoverReference(client, polling);
        if (cancelled) return;
        if (next === "deleted" || next === "expired" || next === "not-found") {
          setStatus(next);
          setError("");
          setPolling(null);
          return;
        }
      } catch {
        /* A failed read never disproves an accepted deletion. */
      }
      if (cancelled) return;
      if (++attempts >= 10) {
        setPolling(null);
        return;
      }
      timer = setTimeout(() => void poll(), 3000);
    }
    timer = setTimeout(() => void poll(), 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [polling]);
  function clear() {
    generation.current++;
    prepared.current?.dispose();
    prepared.current = null;
    setReview(null);
    setReference(null);
    setStatus(null);
    setError("");
    setPolling(null);
  }
  async function execute(kind: "status" | "prepare" | "delete") {
    const client = configuration.client;
    if (!client || active.current || busy || polling) return;
    active.current = true;
    setWorking(true);
    setError("");
    if (kind === "delete") setStatus(null);
    const id = generation.current;
    const current = () => generation.current === id;
    try {
      let ref = reference;
      if (!ref) {
        try {
          ref = importReference(text, client);
        } catch {
          setError(
            "Invalid sender reference. Paste the exported reference JSON for this site's configured storage service.",
          );
          return;
        }
      }
      setReference(ref);
      if (kind === "status") {
        const next = await recoverReference(client, ref);
        if (current()) setStatus(next);
      } else if (kind === "prepare") {
        await runOperation(
          async (signer, sessionCurrent) => {
            const next = await prepareDeletion(
              client,
              ref,
              signer,
              () => current() && sessionCurrent(),
            );
            if (!current() || !sessionCurrent()) {
              next.dispose();
              return;
            }
            prepared.current = next;
            setReview({
              publicKey: next.publicKey,
              managerIndex: next.managerIndex,
            });
          },
          { action: "delete" },
        );
      } else {
        const candidate = prepared.current;
        if (!candidate) return;
        await runOperation(async (_signer, sessionCurrent) => {
          await candidate.submit(() => current() && sessionCurrent());
          if (current() && sessionCurrent()) setStatus("deleted");
        });
      }
    } catch (cause) {
      if (current()) {
        if (kind === "status") setStatus(null);
        setError(
          kind === "status"
            ? "Status could not be verified. Keep the original reference and check again. Do not resend."
            : kind === "delete"
              ? "Deletion could not be confirmed. Check status before attempting deletion again."
              : cause instanceof Error && cause.message === "NO_MANAGER"
                ? "This wallet has no deletion authority, or the item has no managers. No deletion challenge was requested."
                : "Could not verify deletion authority. Check the reference, connected wallet and signature approval.",
        );
      }
    } finally {
      if (kind === "delete") {
        prepared.current?.dispose();
        prepared.current = null;
        if (current()) {
          setReview(null);
          setPolling(reference);
        }
      }
      active.current = false;
      if (current()) setWorking(false);
    }
  }
  return (
    <Card>
      <div className="card-head">
        <h2>
          {mode === "recover" ? "Recover an upload" : "Delete a stored item"}
        </h2>
      </div>
      <div className="card-body stack">
        <p>
          Paste the original sender reference exported from Encrypt. A
          recipient's sealed link is not a sender reference.
        </p>
        {!configuration.client && <p role="status">{configuration.message}</p>}
        <label htmlFor="sender-reference">Sender reference JSON</label>
        <Textarea
          id="sender-reference"
          rows={7}
          maxLength={4096}
          value={text}
          disabled={working || !!review || !!polling}
          onChange={(event) => {
            clear();
            setText(event.target.value);
          }}
        />
        <Button
          disabled={
            !configuration.client ||
            !text.trim() ||
            working ||
            busy ||
            !!review ||
            !!polling
          }
          onClick={() => void execute("status")}
        >
          {working ? "Working…" : "Check status"}
        </Button>
        {mode === "delete" && (
          <>
            <p>
              Deletion requires a listed manager's wallet. Receiving keys do not
              grant deletion authority. Checking authority requests one wallet
              signature; it does not delete the item.
            </p>
            {!session && <p>Use Connect wallet at the top to continue.</p>}
            {!review && (
              <Button
                disabled={
                  !configuration.client ||
                  !session ||
                  !text.trim() ||
                  busy ||
                  working ||
                  !!polling ||
                  status === "deleted" ||
                  status === "expired"
                }
                onClick={() => void execute("prepare")}
              >
                Check deletion authority
              </Button>
            )}
          </>
        )}
        {review && reference && (
          <section className="stack" aria-label="Confirm item deletion">
            <h3>Confirm deletion</h3>
            <p className="mono break-all">Seed: {reference.seed}</p>
            <p>Expires at: {reference.expiresAt}</p>
            <p>Manager index: {review.managerIndex}</p>
            <p className="mono break-all">
              Manager public key: {review.publicKey}
            </p>
            <p>
              This permanently deletes the stored item. Cached copies may remain
              available for up to 60 seconds.
            </p>
            <Button
              disabled={working || busy}
              onClick={() => void execute("delete")}
            >
              Confirm deletion
            </Button>
            <Button variant="outline" disabled={working} onClick={clear}>
              Cancel
            </Button>
          </section>
        )}
        {status && (
          <p role="status" className={status === "active" ? "success" : ""}>
            {recoveryMessages[status]}
          </p>
        )}
        {polling && (
          <p role="status">
            Checking authoritative status. Only status reads are retried;
            deletion is never repeated automatically.
          </p>
        )}
        {status === "not-found" && (
          <Link to="/send">Prepare a new message</Link>
        )}
        {error && <p role="alert">{error}</p>}
        <Button
          variant="outline"
          disabled={working}
          onClick={() => {
            clear();
            setText("");
          }}
        >
          Clear reference
        </Button>
      </div>
    </Card>
  );
}
