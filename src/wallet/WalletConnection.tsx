import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { walletNetwork } from "@/config/wallet";
import { useSession } from "./session-store";

export function WalletConnection({
  onManageWallet,
  description,
  optional = false,
}: {
  onManageWallet(): void;
  description: string;
  optional?: boolean;
}) {
  const { session, busy, error, notice, switchNetwork } = useSession();
  const needsNetwork =
    !optional &&
    session?.kind === "metamask" &&
    session.chainId !== walletNetwork.chainId;
  return (
    <section
      className={
        session
          ? "wallet-connection wallet-connection-compact"
          : "wallet-connection"
      }
      aria-label="Wallet connection"
    >
      <div className="wallet-connection-row">
        <div className="wallet-connection-details">
          <strong>
            <span className={session ? "dot connected" : "dot"} />
            {session
              ? session.walletName
              : optional
                ? "Wallet optional"
                : "Connect your wallet"}
          </strong>
          {session && (
            <p className="small muted">
              <span title={session.address}>
                {session.address.slice(0, 6)}…{session.address.slice(-4)}
              </span>
              {session.chainId && (
                <>
                  {" "}
                  ·{" "}
                  {session.chainId === walletNetwork.chainId
                    ? walletNetwork.name
                    : `Network ${session.chainId}`}
                </>
              )}
            </p>
          )}
          {!session && <p className="small muted">{description}</p>}
        </div>
        <Button
          variant={session || optional ? "outline" : "default"}
          onClick={onManageWallet}
          aria-haspopup="dialog"
          disabled={busy}
        >
          <Wallet size={16} aria-hidden="true" />
          {session ? "Manage wallet" : busy ? "Connecting…" : "Connect wallet"}
        </Button>
      </div>
      {needsNetwork && (
        <div className="wallet-connection-row wallet-network">
          <p className="small muted">
            Switch to {walletNetwork.name} to sign messages. No funds are
            needed.
          </p>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void switchNetwork()}
          >
            Switch to {walletNetwork.name}
          </Button>
        </div>
      )}
      {notice && (
        <p className="small muted" role="status">
          {notice}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
