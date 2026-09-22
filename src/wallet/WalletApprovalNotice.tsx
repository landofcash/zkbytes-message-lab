import { LoaderCircle, Wallet } from "lucide-react";
import { useSession, type WalletActivity } from "./session-store";

const processing = {
  restore: "Restoring identity…",
  encrypt: "Encrypting message…",
  endorse: "Verifying signature…",
  compatibility: "Checking wallet compatibility…",
  delete: "Preparing deletion…",
  sign: "Finishing…",
};
export function walletActionProgress(activity: WalletActivity) {
  return activity.phase === "approval"
    ? "Waiting for wallet…"
    : processing[activity.action];
}
export function WalletApprovalNotice() {
  const { walletActivity } = useSession();
  if (!walletActivity) return null;
  const { action, label, walletName, phase } = walletActivity;
  const purpose = {
    restore: `restore “${label}”`,
    encrypt: "encrypt your message",
    endorse: "sign your Receive link",
    compatibility: "check signing compatibility",
    delete: "restore your deletion keys",
    sign: "continue",
  }[action];
  return (
    <aside
      className="wallet-approval-notice"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <Wallet size={22} aria-hidden="true" />
      <div>
        <strong>
          {phase === "approval" ? "Approve in your wallet" : processing[action]}
        </strong>
        <p>
          {phase === "approval"
            ? `Open ${walletName} and approve the signature to ${purpose}.`
            : "Signature received. Keep this page open while the action finishes."}
        </p>
        {phase === "approval" && (
          <p className="small muted">No transaction or gas fee is required.</p>
        )}
      </div>
      <LoaderCircle
        size={18}
        className="wallet-approval-spinner"
        aria-hidden="true"
      />
    </aside>
  );
}
