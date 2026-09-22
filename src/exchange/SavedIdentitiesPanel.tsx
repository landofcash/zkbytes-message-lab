import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSession } from "@/wallet/session-store";
import { walletActionProgress } from "@/wallet/WalletApprovalNotice";
import {
  MAX_BACKUP_BYTES,
  identityId,
  mergeIdentities,
  parseIdentityBackup,
  serializeIdentityBackup,
  type SavedIdentity,
} from "./saved-identities";

export function SavedIdentitiesPanel() {
  const {
    savedIdentities,
    storageError,
    session,
    identities,
    busy,
    restoreIdentity,
    importIdentities,
    clearSavedIdentities,
    walletActivity,
  } = useSession();
  const [preview, setPreview] = useState<SavedIdentity[] | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  async function readFile(file: File | undefined) {
    const id = ++generation.current;
    setPreview(null);
    setError("");
    setMessage("");
    if (!file) return;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error();
      const imported = parseIdentityBackup(await file.text());
      mergeIdentities(savedIdentities, imported);
      if (id === generation.current) setPreview(imported);
    } catch {
      if (id === generation.current)
        setError(
          "Cannot import this backup. Check its format, size and whether a wallet/label conflicts with a saved public key. Nothing was changed.",
        );
    }
  }
  function exportAll() {
    const url = URL.createObjectURL(
      new Blob([serializeIdentityBackup(savedIdentities)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "zkbytes-identities.json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <Card>
      <div className="card-head">
        <h2>Saved identities</h2>
        <span className="badge">THIS BROWSER</span>
      </div>
      <div className="card-body stack">
        <p>
          Wallet addresses and exact labels are remembered here. Reconnect the
          same wallet and restore an identity with one signature.
        </p>
        <p className="small muted">
          Backups contain wallet addresses, labels and public keys. Keep the
          file private if you do not want to share that information. It contains
          no private keys or wallet credentials.
        </p>
        {storageError && <p role="alert">{storageError}</p>}
        {!savedIdentities.length && (
          <p className="small muted">
            Create an identity or import a backup to start your list.
          </p>
        )}
        <ul className="saved-identities-list">
          {savedIdentities.map((item) => {
            const matching =
              session?.address.toLowerCase() === item.walletAddress;
            const restored =
              matching &&
              identities.some(
                (identity) =>
                  identity.label === item.label &&
                  identity.publicKey === item.publicKey,
              );
            return (
              <li key={identityId(item)} className="saved-identity">
                <div className="saved-identity-title">
                  <strong>{item.label}</strong>
                  <span className="badge">
                    {restored ? "UNLOCKED" : "LOCKED"}
                  </span>
                </div>
                <code>{item.walletAddress}</code>
                <p className="small muted">
                  {item.walletKind === "fixture"
                    ? "Development fixture"
                    : item.walletKind === "metamask"
                      ? "MetaMask"
                      : "WalletConnect"}
                </p>
                <Button
                  variant="outline"
                  disabled={busy || !matching || restored}
                  onClick={() => void restoreIdentity(item.label)}
                  aria-label={`Restore ${item.label} for ${item.walletAddress}`}
                >
                  {matching &&
                  walletActivity?.action === "restore" &&
                  walletActivity.label === item.label
                    ? walletActionProgress(walletActivity)
                    : restored
                      ? "Keys available"
                      : "Restore identity"}
                </Button>
                {!matching && (
                  <p className="small muted">
                    Connect this wallet account using the wallet button above.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <Button
          variant="outline"
          disabled={!savedIdentities.length || busy}
          onClick={exportAll}
        >
          Export all identities
        </Button>
        <label htmlFor="identity-backup">Import identity backup</label>
        <input
          id="identity-backup"
          type="file"
          accept=".json,application/json"
          disabled={busy || confirmClear}
          onChange={(event) => {
            void readFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        {preview && (
          <section className="stack" aria-label="Review identity import">
            <h3>
              Import {preview.length}{" "}
              {preview.length === 1 ? "identity" : "identities"}
            </h3>
            <p className="small muted">
              Matching entries are merged. Import does not connect a wallet or
              unlock keys.
            </p>
            <ul className="saved-identities-list import-preview">
              {preview.map((item) => (
                <li key={identityId(item)} className="saved-identity">
                  <strong>{item.label}</strong>
                  <code>{item.walletAddress}</code>
                  <code>{item.publicKey}</code>
                </li>
              ))}
            </ul>
            <Button
              disabled={busy || !preview.length}
              onClick={() => {
                try {
                  importIdentities(serializeIdentityBackup(preview));
                  setPreview(null);
                  setMessage(
                    "Identity list imported. Connect the matching wallet to restore keys.",
                  );
                  setError("");
                } catch {
                  setError(
                    "Import could not be saved. Check browser storage or conflicting identities. Nothing was replaced.",
                  );
                }
              }}
            >
              Confirm import
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                generation.current++;
                setPreview(null);
              }}
            >
              Cancel import
            </Button>
          </section>
        )}
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            generation.current++;
            setPreview(null);
            setConfirmClear(true);
            setMessage("");
            setError("");
          }}
        >
          Clear saved identities
        </Button>
        {confirmClear && (
          <section
            className="stack"
            aria-label="Confirm clearing saved identities"
          >
            <h3>
              Clear {savedIdentities.length} saved identities from this browser?
            </h3>
            <p>
              This removes all wallet addresses, labels and public keys in the
              list above, and locks keys in memory. Export a backup first if you
              want to keep the list. Your wallet and stored messages are not
              deleted.
            </p>
            <Button
              disabled={busy}
              onClick={() => {
                try {
                  clearSavedIdentities();
                  setConfirmClear(false);
                  setMessage("Saved identities cleared and keys locked.");
                  setError("");
                } catch {
                  setError(
                    "Browser storage could not be cleared. The saved list has not been removed.",
                  );
                }
              }}
            >
              Confirm clear saved identities
            </Button>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
          </section>
        )}
        {message && <p role="status">{message}</p>}
        {error && <p role="alert">{error}</p>}
      </div>
    </Card>
  );
}
