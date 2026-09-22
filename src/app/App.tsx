import { useState } from "react";
import { HomePage } from "./HomePage";
import { IdentityPanel } from "@/exchange/IdentityPanel";
import { SavedIdentitiesPanel } from "@/exchange/SavedIdentitiesPanel";
import { SendPanel } from "@/exchange/SendPanel";
import { OpenPanel } from "@/exchange/OpenPanel";
import { ManagementPanel } from "@/exchange/ManagementPanel";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowRight,
  ChevronRight,
  KeyRound,
  LockKeyhole,
  Radio,
  RotateCcw,
  Send,
  ShieldCheck,
  Terminal,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { configuration } from "@/config/env";
import { walletNetwork } from "@/config/wallet";
import { WalletModal } from "@/wallet/WalletModal";
import { CompatibilityPanel } from "@/wallet/CompatibilityPanel";
import { useSession } from "@/wallet/session-store";
import { isTheme, setTheme, themes } from "./theme";

const primary = [
  { to: "/identities", label: "Create identity", icon: KeyRound },
  { to: "/send", label: "Encrypt", icon: Send },
  { to: "/open", label: "Decrypt", icon: ArrowDownToLine },
];
const secondary = [
  { to: "/compatibility", label: "Compatibility", icon: ShieldCheck },
  { to: "/recover", label: "Recover", icon: RotateCcw },
  { to: "/delete", label: "Delete", icon: Trash2 },
  { to: "/diagnostics", label: "Diagnostics", icon: Radio },
];
function Navigation({ items }: { items: typeof primary }) {
  return items.map(({ to, label, icon: Icon }) => (
    <NavLink
      key={to}
      to={to}
      end={to === "/"}
      className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
    >
      <Icon size={17} />
      <span>{label}</span>
      <ChevronRight size={13} className="nav-arrow" />
    </NavLink>
  ));
}
export function App() {
  const home = useLocation().pathname === "/";
  const { session } = useSession();
  const [walletOpen, setWalletOpen] = useState(false);
  const [theme, updateTheme] = useState(() => {
    const value = document.documentElement.dataset.theme;
    return isTheme(value) ? value : "terminal";
  });
  return (
    <div className={home ? "shell landing-shell" : "shell"}>
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      {!home && (
        <aside className="sidebar">
          <Link className="brand" to="/">
            <span className="brand-mark">
              <Terminal size={23} />
            </span>
            zkbytes<span className="brand-dot">.</span>
          </Link>
          <div className="brand-caption">MESSAGE LAB</div>
          <nav aria-label="Main navigation">
            <p className="nav-label">EXCHANGE</p>
            <Navigation items={primary} />
            <p className="nav-label tools-label">TOOLS</p>
            <Navigation items={secondary} />
          </nav>
          <div className="sidebar-foot">
            <LockKeyhole size={18} />
            <p>
              Private by design.
              <br />
              <span>Your keys stay with you.</span>
            </p>
            <div className="version">
              MESSAGE LAB <span>v0.1</span>
            </div>
          </div>
        </aside>
      )}
      <div className="workspace">
        <header className="topbar">
          {home ? (
            <>
              <Link className="brand" to="/" aria-label="zkbytes home">
                <Terminal size={23} />
                zkbytes<span className="brand-dot">.</span>
              </Link>
              <nav className="landing-nav" aria-label="Main navigation">
                {primary.map(({ to, label, icon: Icon }) => (
                  <Link key={to} to={to}>
                    <Icon size={17} aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                ))}
              </nav>
            </>
          ) : (
            <span className="breadcrumb">
              zkbytes <span>/</span> Message Lab
            </span>
          )}
          <div className="topbar-controls">
            <label className="theme-control">
              Theme
              <select
                aria-label="Theme"
                value={theme}
                onChange={(event) => {
                  const value = event.target.value;
                  if (isTheme(value)) {
                    setTheme(value);
                    updateTheme(value);
                  }
                }}
              >
                {themes.map((value) => (
                  <option value={value} key={value}>
                    {value[0].toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="outline"
              className="connection-pill"
              aria-haspopup="dialog"
              onClick={() => setWalletOpen(true)}
            >
              <Wallet size={16} />
              <span className={session ? "dot connected" : "dot"} />
              {session ? "Manage wallet" : "Connect wallet"}
            </Button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {!home && (
            <div className="edition">
              <span />
              ENCRYPTED EXCHANGE{" "}
              <span className="edition-end">MVP / LOCAL-FIRST</span>
            </div>
          )}
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/identities" element={<IdentityPage />} />
            <Route path="/compatibility" element={<CompatibilityPage />} />
            <Route
              path="/send"
              element={<SendPage key={session?.address ?? "disconnected"} />}
            />
            <Route path="/open" element={<DecryptPage />} />
            <Route
              path="/recover"
              element={<ManagementPage mode="recover" />}
            />
            <Route path="/delete" element={<ManagementPage mode="delete" />} />
            <Route path="/diagnostics" element={<Diagnostics />} />
            <Route
              path="*"
              element={
                <>
                  <h1>Page not found</h1>
                  <Button asChild>
                    <Link to="/">Back to home</Link>
                  </Button>
                </>
              }
            />
          </Routes>
          {!home && (
            <footer className="page-footer">
              <LockKeyhole size={13} />
              <span>Explicit actions. Local keys. Encrypted content.</span>
              <span className="footer-build">zkbytes / message lab</span>
            </footer>
          )}
        </main>
      </div>
      <WalletModal open={walletOpen} onOpenChange={setWalletOpen} />
    </div>
  );
}
function Hero({
  eyebrow,
  title,
  accent,
  description,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
}) {
  return (
    <div className="hero">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>
          {title}
          <br />
          <span>{accent}</span>
        </h1>
        <p className="intro">{description}</p>
      </div>
      <div className="key-art" aria-hidden="true">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="key-core">
          <KeyRound size={43} strokeWidth={1.2} />
        </div>
        <span className="art-node node-one" />
        <span className="art-node node-two" />
        <span className="art-cross">+</span>
      </div>
    </div>
  );
}
function HowItWorks() {
  return (
    <Card>
      <div className="card-head">
        <h2>The exchange</h2>
        <ArrowRight size={16} />
      </div>
      <div className="card-body">
        <ol className="steps">
          <li>
            <div>
              <strong>Create your keys</strong>
              <p>
                Use your wallet and a memorable label to restore the same
                receiving key.
              </p>
            </div>
          </li>
          <li>
            <div>
              <strong>Share a Receive link</strong>
              <p>
                Give your public key to someone who wants to send you a message.
              </p>
            </div>
          </li>
          <li>
            <div>
              <strong>Open a sealed link</strong>
              <p>Unlock the seed, then download and decrypt the message.</p>
            </div>
          </li>
        </ol>
        <p className="small muted">
          Set up keys under Create identity; use Encrypt to send a message.
        </p>
      </div>
    </Card>
  );
}
function IdentityPage() {
  const { sessionEpoch, identityEpoch } = useSession();
  const location = useLocation();
  return (
    <>
      <Hero
        eyebrow="01 / CREATE IDENTITY"
        title="Your wallet."
        accent="Your receiving keys."
        description="Create an identity, share your Receive link, and keep your wallet and labels ready for next time."
      />
      <div className="columns">
        <IdentityPanel key={`${sessionEpoch}:${identityEpoch}`} />
        <SavedIdentitiesPanel />
      </div>
      <Button asChild variant="outline">
        <Link to="/open" state={location.state}>
          Continue to Decrypt
        </Link>
      </Button>
    </>
  );
}
function DecryptPage() {
  const { sessionEpoch, identityEpoch } = useSession();
  const location = useLocation();
  return (
    <>
      <Hero
        eyebrow="03 / DECRYPT A MESSAGE"
        title="A message for you."
        accent="Unlocked by you."
        description="Choose an unlocked identity and open your sealed link."
      />
      <div className="stack">
        <OpenPanel key={`${sessionEpoch}:${identityEpoch}:${location.hash}`} />
      </div>
    </>
  );
}
function CompatibilityPage() {
  return (
    <>
      <Hero
        eyebrow="TOOLS / OPTIONAL CHECK"
        title="Check your wallet."
        accent="Know your signer."
        description="Test reproducible signing when you need it. You can create and restore receiving keys without running this check."
      />
      <CompatibilityPanel />
    </>
  );
}
function SendPage() {
  const { sessionEpoch } = useSession();
  const { hash } = useLocation();
  const initialRecipientText = hash
    ? `${window.location.origin}/send${hash}`
    : "";
  return (
    <>
      <Hero
        eyebrow="02 / ENCRYPT A MESSAGE"
        title="Write something."
        accent="Keep it private."
        description="Encrypt text for a recipient and share a sealed link. Only the matching receiving key can decrypt the seed."
      />
      <div className="columns">
        <SendPanel
          key={`${sessionEpoch}:${hash}`}
          initialRecipientText={initialRecipientText}
        />
        <HowItWorks />
      </div>
    </>
  );
}
const managementPages = {
  recover: {
    eyebrow: "TOOLS / UPLOAD RECOVERY",
    title: "An uncertain upload.",
    accent: "A careful next step.",
    description:
      "Use the original sender reference to recover the authoritative result before considering another upload.",
  },
  delete: {
    eyebrow: "TOOLS / MANAGE AN ITEM",
    title: "Your stored item.",
    accent: "Your decision.",
    description:
      "Delete an item using a wallet that derives one of its listed manager keys.",
  },
};
function ManagementPage({ mode }: { mode: "recover" | "delete" }) {
  const { sessionEpoch, identityEpoch } = useSession();
  const content = managementPages[mode];
  return (
    <>
      <Hero {...content} />
      <ManagementPanel
        key={`${mode}:${sessionEpoch}:${identityEpoch}`}
        mode={mode}
      />
    </>
  );
}
function Diagnostics() {
  const { session, compatibility } = useSession();
  return (
    <>
      <Hero
        eyebrow="TOOLS / DIAGNOSTICS"
        title="See the state."
        accent="Keep the secrets."
        description="Connection and configuration details for this session. No signatures, keys, message content or sealed links are shown."
      />
      <Card>
        <div className="card-head">
          <h2>
            <Radio size={18} />
            Session details
          </h2>
          <span className="badge">LOCAL ONLY</span>
        </div>
        <div className="card-body">
          <dl className="diagnostics">
            <dt>Wallet</dt>
            <dd>{session?.walletName ?? "Not connected"}</dd>
            <dt>Transport</dt>
            <dd>
              {session?.transport === "managed"
                ? session.kind === "walletconnect"
                  ? "Managed by Reown AppKit"
                  : "Managed by MetaMask Connect"
                : (session?.transport ?? "—")}
            </dd>
            <dt>Network</dt>
            <dd>
              {session?.chainId === walletNetwork.chainId
                ? `${walletNetwork.name} (${session.chainId})`
                : (session?.chainId ?? "—")}
            </dd>
            <dt>Account</dt>
            <dd>
              {session
                ? `${session.address.slice(0, 6)}…${session.address.slice(-4)}`
                : "—"}
            </dd>
            <dt>Compatibility</dt>
            <dd>{compatibility}</dd>
            <dt>Storage</dt>
            <dd>
              {configuration.client
                ? "Configured · not tested"
                : "Not configured"}
            </dd>
            <dt>Storage requests</dt>
            <dd>Started only by your explicit actions</dd>
          </dl>
          {configuration.message && (
            <p className="config-note" role="status">
              {configuration.message}
            </p>
          )}
        </div>
      </Card>
    </>
  );
}
