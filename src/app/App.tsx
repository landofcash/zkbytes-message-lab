import { useState } from "react";
import { IdentityPanel } from "@/exchange/IdentityPanel";
import { SendPanel } from "@/exchange/SendPanel";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowRight,
  ChevronRight,
  FlaskConical,
  KeyRound,
  LockKeyhole,
  Radio,
  RotateCcw,
  Send,
  ShieldCheck,
  Terminal,
  Trash2,
  Unplug,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { configuration } from "@/config/env";
import { walletNetwork } from "@/config/wallet";
import { reownProjectId } from "@/config/reown";
import { useSession } from "@/wallet/session-store";
import { isTheme, setTheme, themes } from "./theme";

const primary = [
  { to: "/", label: "My keys", icon: KeyRound },
  { to: "/send", label: "Send", icon: Send },
  { to: "/open", label: "Open", icon: ArrowDownToLine },
];
const secondary = [
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
  const { session } = useSession();
  const [theme, updateTheme] = useState(() => {
    const value = document.documentElement.dataset.theme;
    return isTheme(value) ? value : "terminal";
  });
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
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
      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">
            zkbytes <span>/</span> Message Lab
          </span>
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
            <span className="connection-pill">
              <span className={session ? "dot connected" : "dot"} />
              {session ? `${session.walletName} connected` : "Not connected"}
            </span>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="edition">
            <span />
            ENCRYPTED EXCHANGE{" "}
            <span className="edition-end">MVP / LOCAL-FIRST</span>
          </div>
          <Routes>
            <Route path="/" element={<MyKeys />} />
            <Route
              path="/send"
              element={<SendPage key={session?.address ?? "disconnected"} />}
            />
            <Route path="/open" element={<ComingSoon kind="open" />} />
            <Route path="/recover" element={<ComingSoon kind="recover" />} />
            <Route path="/delete" element={<ComingSoon kind="delete" />} />
            <Route path="/diagnostics" element={<Diagnostics />} />
            <Route
              path="*"
              element={
                <>
                  <h1>Page not found</h1>
                  <Button asChild>
                    <Link to="/">Back to My keys</Link>
                  </Button>
                </>
              }
            />
          </Routes>
          <footer className="page-footer">
            <LockKeyhole size={13} />
            <span>Explicit actions. Local keys. Encrypted content.</span>
            <span className="footer-build">zkbytes / message lab</span>
          </footer>
        </main>
      </div>
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
              <strong>Share a Receive card</strong>
              <p>
                Give your public key to someone who wants to send you a message.
              </p>
            </div>
          </li>
          <li>
            <div>
              <strong>Open a sealed link</strong>
              <p>
                Unlock the reference, then download and decrypt the message.
              </p>
            </div>
          </li>
        </ol>
        <p className="small muted">
          Receiving keys and message exchange arrive in the next phases.
        </p>
      </div>
    </Card>
  );
}
function MyKeys() {
  const {
    session,
    busy,
    compatibility,
    error,
    notice,
    connectMetaMask,
    connectWalletConnect,
    switchNetwork,
    connectFixture,
    disconnect,
    testCompatibility,
  } = useSession();
  return (
    <>
      <Hero
        eyebrow="01 / YOUR RECEIVING IDENTITY"
        title="Your wallet."
        accent="Your keys."
        description="A private exchange starts with keys you control. Connect your wallet, check signing compatibility, then create your receiving identity."
      />
      <div className="columns">
        <div className="stack">
          <Card>
            <div className="card-head">
              <h2>
                <Wallet size={18} />
                Wallet connection
              </h2>
              <span className="badge">STEP 01</span>
            </div>
            <div className="card-body">
              <p className="section-intro">
                Choose how to connect. Connection alone never requests a
                signature.
              </p>
              <div className="wallet-options">
                <button
                  className="wallet-option"
                  disabled={busy || !!session}
                  onClick={() => void connectMetaMask()}
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
                  onClick={() => void connectWalletConnect()}
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
                  WalletConnect needs a Reown project ID. Add
                  VITE_REOWN_PROJECT_ID to .env.local and restart the app.
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
                      Add or select Monad Testnet in MetaMask to run the signing
                      check. No funds are needed.
                    </p>
                    <Button
                      disabled={busy}
                      onClick={() => void switchNetwork()}
                    >
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
                    private messages or funds. No wallet approvals appear in
                    this mode.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => void connectFixture()}
                    disabled={busy}
                  >
                    <FlaskConical size={15} />
                    Connect fixture
                  </Button>
                </div>
              )}
            </div>
          </Card>
          <Card>
            <div className="card-head">
              <h2>
                <ShieldCheck size={18} />
                Signing compatibility
              </h2>
              <span className="badge">STEP 02</span>
            </div>
            <div className="card-body">
              <p className="section-intro">
                A receiving identity needs reproducible signatures. This check
                signs the same message twice and compares the derived keys.
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
                  Check compatibility
                  <ArrowRight size={16} />
                </Button>
              </div>
              <p className="small muted">
                Your wallet will request two explicit signature approvals. No
                transaction or upload occurs.
              </p>
            </div>
          </Card>
        </div>
        <div className="stack">
          <IdentityPanel />
          <HowItWorks />
          <Card className="quiet-card">
            <div className="card-body">
              <LockKeyhole size={20} />
              <h2>Your wallet is the starting point</h2>
              <p className="small muted">
                A key label is a selector, not a password. Restoring keys
                requires the same wallet account, label and signing profile.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
function SendPage() {
  const { sessionEpoch } = useSession();
  return (
    <>
      <Hero
        eyebrow="02 / ENCRYPT A MESSAGE"
        title="Write something."
        accent="Keep it private."
        description="Encrypt text for a recipient and share a sealed link. Only the matching receiving key can open the reference."
      />
      <div className="columns">
        <SendPanel key={sessionEpoch} />
        <HowItWorks />
      </div>
    </>
  );
}
const upcoming = {
  open: {
    eyebrow: "03 / OPEN A SEALED LINK",
    title: "A message for you.",
    accent: "Unlocked by you.",
    description:
      "Restore your receiving identity to open a sealed reference, then download and decrypt the message.",
    heading: "Opening messages is coming later",
    detail:
      "Sealed links are not processed in this phase. No reference or object request is made.",
  },
  recover: {
    eyebrow: "TOOLS / UPLOAD RECOVERY",
    title: "An uncertain upload.",
    accent: "A careful next step.",
    description:
      "Use the original sender reference to recover the authoritative result before considering another upload.",
    heading: "Upload recovery is coming later",
    detail:
      "An interrupted response does not mean an upload failed. Recovery will check the original item before offering another attempt.",
  },
  delete: {
    eyebrow: "TOOLS / MANAGE AN ITEM",
    title: "Your stored item.",
    accent: "Your decision.",
    description:
      "Delete an item using a wallet that derives one of its listed manager keys.",
    heading: "Item deletion is coming later",
    detail:
      "Receiving a message does not grant deletion authority. Deletion will require an explicit manager confirmation.",
  },
};
function ComingSoon({ kind }: { kind: keyof typeof upcoming }) {
  const content = upcoming[kind];
  return (
    <>
      <Hero {...content} />
      <Card className="empty-state">
        <LockKeyhole size={30} strokeWidth={1.3} />
        <h2>{content.heading}</h2>
        <p>{content.detail}</p>
        <Button asChild variant="outline">
          <Link to="/">
            Go to My keys
            <ArrowRight size={16} />
          </Link>
        </Button>
      </Card>
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
            <dt>Network activity</dt>
            <dd>No storage requests in this phase</dd>
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
