import { useEffect, useRef, useState } from "react";
import { KeyRound, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSession } from "@/wallet/session-store";
import { walletActionProgress } from "@/wallet/WalletApprovalNotice";
import { identityId } from "./saved-identities";
import { IDENTITY_PROFILE } from "./identity";

export function OpenIdentitySetup({
  selected,
  onSelect,
  onConnectWallet,
}: {
  selected: string;
  onSelect(publicKey: string): void;
  onConnectWallet(): void;
}) {
  const {
    session,
    identities,
    savedIdentities,
    busy,
    error,
    storageError,
    notice,
    restoreIdentity,
    walletActivity,
  } = useSession();
  const [label, setLabel] = useState("");
  const [restoring, setRestoring] = useState<string | null>(null);
  const mounted = useRef(true);
  const active = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const address = session?.address.toLowerCase();
  // Include unlocked identities even if saving them in this browser failed.
  const entries = [...savedIdentities];
  if (session)
    for (const identity of identities) {
      if (
        !entries.some(
          (item) =>
            item.walletAddress === address && item.label === identity.label,
        )
      )
        entries.push({
          ...identity,
          walletAddress: address!,
          walletKind: session.kind,
          profile: IDENTITY_PROFILE,
        });
    }
  entries.sort(
    (a, b) =>
      Number(b.walletAddress === address) - Number(a.walletAddress === address),
  );
  async function restore(nextLabel: string) {
    if (!session || busy || active.current) return;
    active.current = true;
    setRestoring(nextLabel);
    try {
      const publicKey = await restoreIdentity(nextLabel);
      if (mounted.current && publicKey) onSelect(publicKey);
    } finally {
      active.current = false;
      if (mounted.current) setRestoring(null);
    }
  }
  const progress =
    walletActivity?.action === "restore"
      ? walletActionProgress(walletActivity)
      : "Restoring identity…";
  return (
    <Card>
      <div className="card-head">
        <h2>
          <KeyRound size={18} />
          Your receiving identity
        </h2>
      </div>
      <div className="card-body stack">
        <section className="open-wallet" aria-label="Wallet connection">
          <div>
            <strong>
              {session ? session.walletName : "Connect your wallet"}
            </strong>
            <p className="small muted">
              {session ? (
                <span title={session.address}>
                  {session.address.slice(0, 6)}…{session.address.slice(-4)}
                </span>
              ) : (
                "Connect the wallet you used to create your Receive link."
              )}
            </p>
          </div>
          <Button
            variant={session ? "outline" : "default"}
            onClick={onConnectWallet}
            aria-haspopup="dialog"
          >
            <Wallet size={16} />
            {session ? "Manage wallet" : "Connect wallet"}
          </Button>
        </section>
        <div>
          <h3>Choose your identity</h3>
          {!entries.length && (
            <p className="small muted">
              No saved identities in this browser. Enter your existing identity
              label below.
            </p>
          )}
          <ul
            className="open-identities-list"
            aria-label="Receiving identities"
          >
            {entries.map((item) => {
              const matching = item.walletAddress === address;
              const ready =
                matching &&
                identities.some(
                  (identity) => identity.publicKey === item.publicKey,
                );
              const chosen = ready && selected === item.publicKey;
              const pending = matching && restoring === item.label;
              return (
                <li
                  key={identityId(item)}
                  className={
                    chosen ? "open-identity selected" : "open-identity"
                  }
                >
                  <div className="open-identity-description">
                    <strong>{item.label}</strong>
                    <span className="badge">{ready ? "READY" : "LOCKED"}</span>
                    {!matching && (
                      <p className="small muted">
                        Connect the matching wallet{" "}
                        <span title={item.walletAddress}>
                          {item.walletAddress.slice(0, 6)}…
                          {item.walletAddress.slice(-4)}
                        </span>
                        .
                      </p>
                    )}
                  </div>
                  {ready ? (
                    <Button
                      variant="outline"
                      disabled={busy}
                      aria-label={`Use ${item.label}`}
                      aria-pressed={chosen}
                      onClick={() => onSelect(item.publicKey)}
                    >
                      {chosen ? "Selected" : "Use identity"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      disabled={!matching || busy}
                      aria-label={`Restore ${item.label}`}
                      onClick={() => void restore(item.label)}
                    >
                      {pending ? progress : "Restore"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <form
          className="stack other-identity"
          onSubmit={(event) => {
            event.preventDefault();
            void restore(label);
          }}
        >
          <div>
            <label htmlFor="other-identity-label">Other identity label</label>
            <Input
              id="other-identity-label"
              value={label}
              maxLength={64}
              disabled={busy}
              placeholder="e.g. personal"
              autoCapitalize="none"
              spellCheck={false}
              onChange={(event) => setLabel(event.target.value)}
              aria-describedby="other-identity-help"
            />
            <p id="other-identity-help" className="small muted">
              Enter the exact label used to create your Receive link, including
              capitalization. It does not need to be saved in this browser.
            </p>
          </div>
          <Button type="submit" disabled={!session || busy || !label}>
            {restoring === label ? progress : "Restore identity"}
          </Button>
        </form>
        {notice && (
          <p role="status" className="small muted">
            {notice}
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        {storageError && <p role="alert">{storageError}</p>}
      </div>
    </Card>
  );
}
