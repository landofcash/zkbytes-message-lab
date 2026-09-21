import { useEffect, useRef } from "react";
import { FlaskConical, Wallet, Unplug, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { walletNetwork } from "@/config/wallet";
import { reownProjectId } from "@/config/reown";
import { useSession } from "./session-store";

export function WalletModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const mounted = useRef(true);
  const {
    session,
    busy,
    error,
    notice,
    connectMetaMask,
    connectWalletConnect,
    connectFixture,
    disconnect,
    switchNetwork,
  } = useSession();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);
  async function connect(action: () => Promise<void>) {
    // Release the native dialog's top layer before the wallet's own QR/modal UI opens.
    dialog.current?.close();
    onOpenChange(false);
    try {
      await action();
    } finally {
      if (mounted.current) onOpenChange(true);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="wallet-modal"
      aria-labelledby="wallet-modal-title"
      onCancel={() => onOpenChange(false)}
      onClose={() => {
        if (!dialog.current?.open) onOpenChange(false);
      }}
    >
      <div className="wallet-modal-head">
        <h2 id="wallet-modal-title">
          {session ? "Manage wallet" : "Connect wallet"}
        </h2>
        <Button
          variant="outline"
          aria-label="Close wallet management"
          onClick={() => onOpenChange(false)}
          autoFocus
        >
          <X size={18} />
        </Button>
      </div>
      <Card>
        <div className="card-head">
          <h2>
            <Wallet size={18} />
            Wallet connection
          </h2>
          <span className="badge">WALLET</span>
        </div>
        <div className="card-body">
          <p className="section-intro">
            Choose how to connect. Connection alone never requests a signature.
          </p>
          <div className="wallet-options">
            <button
              className="wallet-option"
              disabled={busy || !!session}
              onClick={() => void connect(connectMetaMask)}
            >
              <span className="wallet-icon">M</span>
              <span>
                <strong>MetaMask</strong>
                <small>Extension & mobile · Monad Testnet</small>
              </span>
              <span className="badge">
                {session?.kind === "metamask" ? "Connected" : "Connect"}
              </span>
            </button>
            <button
              className="wallet-option"
              disabled={busy || !!session || !reownProjectId}
              onClick={() => void connect(connectWalletConnect)}
            >
              <Wallet className="wallet-icon" size={22} />
              <span>
                <strong>WalletConnect</strong>
                <small>Connect with your wallet</small>
              </span>
              <span className="badge">
                {!reownProjectId
                  ? "Setup needed"
                  : session?.kind === "walletconnect"
                    ? "Connected"
                    : "Connect"}
              </span>
            </button>
          </div>
          {!reownProjectId && (
            <p className="small muted">
              WalletConnect is unavailable. Ask the app administrator to
              configure WalletConnect.
            </p>
          )}
          {session && (
            <div className="session-details">
              <div>
                <strong>{session.walletName}</strong>
                <p className="account-address">{session.address}</p>
                {session.chainId && (
                  <p className="small muted">
                    Network:{" "}
                    {session.chainId === walletNetwork.chainId
                      ? walletNetwork.name
                      : session.chainId}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void disconnect()}
              >
                <Unplug size={15} />
                Disconnect
              </Button>
            </div>
          )}
          {session?.kind === "metamask" &&
            session.chainId !== walletNetwork.chainId && (
              <div className="config-note">
                <p>
                  Add or select Monad Testnet in MetaMask to sign messages. No
                  funds are needed.
                </p>
                <Button disabled={busy} onClick={() => void switchNetwork()}>
                  Switch to Monad Testnet
                </Button>
              </div>
            )}
          {notice && (
            <p className="config-note" role="status">
              {notice}
              {busy
                ? " Finish or dismiss the open wallet request before starting another."
                : ""}
            </p>
          )}
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
          {import.meta.env.DEV && !session && (
            <div className="fixture-box">
              <div>
                <FlaskConical size={17} />
                <strong>Development fixture</strong>
              </div>
              <p>
                A public test identity for local checks. Never use it for
                private messages or funds. No wallet approvals appear in this
                mode.
              </p>
              <Button
                variant="outline"
                onClick={() => void connect(connectFixture)}
                disabled={busy}
              >
                <FlaskConical size={15} />
                Connect fixture
              </Button>
            </div>
          )}
        </div>
      </Card>
    </dialog>
  );
}
