import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { walletNetwork } from "@/config/wallet";
import { useSession } from "./session-store";
import { walletActionProgress } from "./WalletApprovalNotice";
export function CompatibilityPanel() {
  const { session, busy, compatibility, testCompatibility, walletActivity } =
    useSession();
  return (
    <>
      <Card>
        <div className="card-head">
          <h2>
            <ShieldCheck size={18} />
            Signing compatibility
          </h2>
          <span className="badge">OPTIONAL</span>
        </div>
        <div className="card-body">
          <p className="section-intro">
            This optional check tests whether your wallet returns reproducible
            signatures. It signs the same message twice and compares the derived
            keys.
          </p>
          <div className="check-row">
            <span
              className={
                compatibility === "compatible"
                  ? "check-status success"
                  : "check-status"
              }
              role="status"
            >
              {compatibility === "untested"
                ? "Not checked"
                : compatibility === "checking"
                  ? "Checking signatures…"
                  : compatibility === "compatible"
                    ? "Compatible · reproducible keys"
                    : compatibility === "nondeterministic"
                      ? "Incompatible · signatures differ"
                      : "Check failed"}
            </span>
            <Button
              disabled={
                !session ||
                busy ||
                (session.kind === "metamask" &&
                  session.chainId !== walletNetwork.chainId)
              }
              onClick={() => void testCompatibility()}
            >
              {walletActivity?.action === "compatibility"
                ? walletActionProgress(walletActivity)
                : "Check compatibility"}
              <ArrowRight size={16} />
            </Button>
          </div>
          <p className="small muted">
            Your wallet will request two explicit signature approvals. No
            transaction or upload occurs.
          </p>
        </div>
      </Card>
    </>
  );
}
