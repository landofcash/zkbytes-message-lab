import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSession } from "@/wallet/session-store";
import { walletActionProgress } from "@/wallet/WalletApprovalNotice";
import { WalletConnection } from "@/wallet/WalletConnection";
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
    storageError,
    restoreIdentity,
    walletActivity,
  } = useSession();
  const [label, setLabel] = useState("");
  const [restoring, setRestoring] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const selectedIdentity = session
    ? identities.find((identity) => identity.publicKey === selected)
    : undefined;
  const collapsed = !!selectedIdentity && !editing;
  const controlsId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const wasCollapsed = useRef(collapsed);
  useEffect(() => {
    // Keep keyboard focus available when a restore/select button is hidden.
    if (collapsed && !wasCollapsed.current) toggle.current?.focus();
    wasCollapsed.current = collapsed;
  }, [collapsed]);
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
      if (mounted.current && publicKey) {
        onSelect(publicKey);
        setEditing(false);
      }
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
      <div className="card-head identity-setup-header">
        <div className="identity-setup-heading">
          <h2>
            <KeyRound size={18} />
            Your receiving identity
          </h2>
          {selectedIdentity && (
            <p className="small muted identity-setup-summary">
              <strong>{selectedIdentity.label}</strong>
              <span className="badge">READY</span>
              <span title={session!.address}>
                {session!.address.slice(0, 6)}…{session!.address.slice(-4)}
              </span>
            </p>
          )}
        </div>
        {selectedIdentity && (
          <Button
            ref={toggle}
            variant="outline"
            aria-expanded={!collapsed}
            aria-controls={controlsId}
            onClick={() => setEditing(!editing)}
          >
            {collapsed ? "Change identity" : "Done"}
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </Button>
        )}
      </div>
      <div id={controlsId} hidden={collapsed}>
        <div className="card-body stack">
          <WalletConnection
            onManageWallet={onConnectWallet}
            description="Connect the wallet you used to create your Receive link."
          />
          <div>
            <h3>Choose your identity</h3>
            {!entries.length && (
              <p className="small muted">
                No saved identities in this browser. Enter your existing
                identity label below.
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
                      <span className="badge">
                        {ready ? "READY" : "LOCKED"}
                      </span>
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
                        onClick={() => {
                          onSelect(item.publicKey);
                          setEditing(false);
                        }}
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
                Enter the exact label used to create your Receive link,
                including capitalization. It does not need to be saved in this
                browser.
              </p>
            </div>
            <Button type="submit" disabled={!session || busy || !label}>
              {restoring === label ? progress : "Restore identity"}
            </Button>
          </form>
        </div>
      </div>
      {storageError && (
        <p className="card-body" role="alert">
          {storageError}
        </p>
      )}
    </Card>
  );
}
