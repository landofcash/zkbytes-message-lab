import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { checkCompatibility } from "./compatibility";
import {
  deriveIdentity,
  validateLabel,
  type ReceivingIdentity,
} from "@/exchange/identity";
import {
  walletErrorKind,
  WalletError,
  walletErrorMessages,
  type WalletErrorKind,
} from "./errors";
import { metamaskAdapter } from "./metamask-adapter";
import type { LabWalletAdapter, LabWalletSession } from "./types";

type Compatibility =
  "untested" | "checking" | "compatible" | "nondeterministic" | WalletErrorKind;
type SessionState = {
  sessionEpoch: number;
  runOperation<T>(
    operation: (
      session: LabWalletSession,
      isCurrent: () => boolean,
    ) => Promise<T>,
  ): Promise<T>;
  identities: { label: string; publicKey: string }[];
  restoreIdentity(label: string): Promise<void>;
  lockIdentities(): void;
  session: LabWalletSession | null;
  busy: boolean;
  compatibility: Compatibility;
  error: string | null;
  notice: string | null;
  connectMetaMask(): Promise<void>;
  connectWalletConnect(): Promise<void>;
  connectFixture(): Promise<void>;
  disconnect(): Promise<void>;
  switchNetwork(): Promise<void>;
  testCompatibility(): Promise<void>;
};
const Context = createContext<SessionState | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const privateIdentities = useRef<ReceivingIdentity[]>([]);
  const [identities, setIdentities] = useState<SessionState["identities"]>([]);
  function clearPrivateIdentities() {
    privateIdentities.current.forEach((identity) =>
      identity.privateKey.fill(0),
    );
    privateIdentities.current = [];
  }
  function lockIdentities() {
    revision.current++;
    clearPrivateIdentities();
    setIdentities([]);
    setCompatibility((value) => (value === "checking" ? "untested" : value));
  }
  const [session, setSession] = useState<LabWalletSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [compatibility, setCompatibility] = useState<Compatibility>("untested");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const current = useRef<LabWalletSession | null>(null);
  const revision = useRef(0);
  const locked = useRef(false);
  const mounted = useRef(true);
  const unsubscribe = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    mounted.current = true;
    const hide = () => {
      setSessionEpoch((value) => value + 1);
      revision.current++;
      clearPrivateIdentities();
      setIdentities([]);
      setCompatibility("untested");
    };
    window.addEventListener("pagehide", hide);
    return () => {
      window.removeEventListener("pagehide", hide);
      clearPrivateIdentities();
      mounted.current = false;
      revision.current++;
      unsubscribe.current?.();
      current.current?.dispose?.();
      current.current = null;
    };
  }, []);

  async function connect(loadAdapter: () => Promise<LabWalletAdapter>) {
    if (locked.current || current.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    const id = ++revision.current;
    try {
      const adapter = await loadAdapter();
      const next = await adapter.connect();
      if (!mounted.current || id !== revision.current) {
        next.dispose?.();
        return;
      }
      current.current = next;
      setSessionEpoch((value) => value + 1);
      setSession({ ...next });
      setCompatibility("untested");
      unsubscribe.current = next.subscribe?.((event) => {
        if (current.current !== next) return;
        revision.current++;
        setSessionEpoch((value) => value + 1);
        clearPrivateIdentities();
        setIdentities([]);
        setCompatibility("untested");
        setError(null);
        if (event === "disconnect") {
          unsubscribe.current?.();
          next.dispose?.();
          current.current = null;
          setSession(null);
          setNotice("Wallet disconnected. Connect again to continue.");
        } else {
          setSession({ ...next });
          setNotice(
            event === "accountsChanged"
              ? "Account changed. Check compatibility for the selected account."
              : "Network changed. Run the compatibility check again when ready.",
          );
        }
        // Keep the prompt lock until the original request settles.
      });
    } catch (cause) {
      if (mounted.current && id === revision.current)
        setError(walletErrorMessages[walletErrorKind(cause)]);
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function connectMetaMask() {
    await connect(async () => metamaskAdapter);
  }
  async function connectFixture() {
    if (!import.meta.env.DEV) return;
    await connect(
      async () => (await import("./fixture-adapter")).fixtureAdapter,
    );
  }
  async function connectWalletConnect() {
    await connect(
      async () =>
        (await import("./walletconnect-adapter")).walletconnectAdapter,
    );
  }
  async function disconnect() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    revision.current++;
    clearPrivateIdentities();
    setIdentities([]);
    const previous = current.current;
    setSessionEpoch((value) => value + 1);
    unsubscribe.current?.();
    unsubscribe.current = undefined;
    current.current = null;
    setSession(null);
    setCompatibility("untested");
    setError(null);
    setNotice(null);
    try {
      await previous?.disconnect();
    } catch {
      if (mounted.current)
        setNotice(
          "Disconnected locally. If your wallet still lists this site, disconnect it in the wallet too.",
        );
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function switchNetwork() {
    const selected = current.current;
    if (!selected?.switchNetwork || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    revision.current++;
    clearPrivateIdentities();
    setIdentities([]);
    setCompatibility("untested");
    try {
      await selected.switchNetwork();
    } catch (cause) {
      if (mounted.current && current.current === selected)
        setError(walletErrorMessages[walletErrorKind(cause)]);
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function testCompatibility() {
    const selected = current.current;
    if (!selected || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    setCompatibility("checking");
    const id = ++revision.current;
    const isCurrent = () =>
      mounted.current &&
      revision.current === id &&
      current.current === selected;
    try {
      const reproducible = await checkCompatibility(selected, isCurrent);
      if (isCurrent())
        setCompatibility(reproducible ? "compatible" : "nondeterministic");
    } catch (cause) {
      if (isCurrent()) {
        const kind = walletErrorKind(cause);
        setCompatibility(kind);
        setError(walletErrorMessages[kind]);
      }
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function restoreIdentity(label: string) {
    const selected = current.current;
    if (!selected || locked.current || compatibility !== "compatible") return;
    try {
      validateLabel(label);
    } catch (cause) {
      setError((cause as Error).message);
      return;
    }
    locked.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    const id = ++revision.current;
    const isCurrent = () =>
      mounted.current &&
      revision.current === id &&
      current.current === selected;
    try {
      const identity = await deriveIdentity(selected, label, isCurrent);
      if (!isCurrent()) {
        identity.privateKey.fill(0);
        return;
      }
      const existing = privateIdentities.current.find(
        (item) => item.label === label,
      );
      if (existing && existing.publicKey !== identity.publicKey) {
        identity.privateKey.fill(0);
        clearPrivateIdentities();
        setIdentities([]);
        setCompatibility("nondeterministic");
        return;
      }
      existing?.privateKey.fill(0);
      privateIdentities.current = [
        ...privateIdentities.current.filter((item) => item.label !== label),
        identity,
      ];
      setIdentities(
        privateIdentities.current.map(({ label, publicKey }) => ({
          label,
          publicKey,
        })),
      );
    } catch (cause) {
      if (isCurrent()) setError(walletErrorMessages[walletErrorKind(cause)]);
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function runOperation<T>(
    operation: (
      session: LabWalletSession,
      isCurrent: () => boolean,
    ) => Promise<T>,
  ): Promise<T> {
    const selected = current.current;
    if (locked.current) throw new WalletError("pending");
    if (!selected || compatibility !== "compatible")
      throw new WalletError("disconnected");
    locked.current = true;
    setBusy(true);
    const id = revision.current;
    const isCurrent = () =>
      mounted.current &&
      revision.current === id &&
      current.current === selected;
    try {
      return await operation(selected, isCurrent);
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <Context.Provider
      value={{
        sessionEpoch,
        runOperation,
        identities,
        restoreIdentity,
        lockIdentities,
        session,
        busy,
        compatibility,
        error,
        notice,
        connectMetaMask,
        connectWalletConnect,
        connectFixture,
        disconnect,
        switchNetwork,
        testCompatibility,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("SessionProvider missing.");
  return value;
}
