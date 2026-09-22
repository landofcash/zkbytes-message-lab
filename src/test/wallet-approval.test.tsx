import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { SessionProvider, useSession } from "@/wallet/session-store";
import { WalletApprovalNotice } from "@/wallet/WalletApprovalNotice";
import type { LabWalletSession, WalletSessionEvent } from "@/wallet/types";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  derive: vi.fn(),
  afterSignature: vi.fn(),
  localWork: vi.fn(),
}));
vi.mock("@/wallet/metamask-adapter", () => ({
  metamaskAdapter: { connect: mocks.connect },
}));
vi.mock("@/exchange/identity", async (original) => ({
  ...(await original<typeof import("@/exchange/identity")>()),
  deriveIdentity: mocks.derive,
}));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function Probe() {
  const state = useSession();
  return (
    <>
      <button onClick={() => void state.connectMetaMask()}>Connect</button>
      <button
        disabled={state.busy}
        onClick={() => void state.restoreIdentity("personal")}
      >
        Restore
      </button>
      <button
        disabled={state.busy}
        onClick={() => void state.runOperation(async () => mocks.localWork())}
      >
        Local work
      </button>
      {(["encrypt", "endorse"] as const).map((action) => (
        <button
          key={action}
          disabled={state.busy}
          onClick={() =>
            void state
              .runOperation(
                async (signer) => {
                  await signer.signMessage("test");
                  await mocks.afterSignature();
                },
                { action },
              )
              .catch(() => {})
          }
        >
          {action}
        </button>
      ))}
      <p>{state.error}</p>
      <span data-testid="ready">
        {state.identities.map((identity) => identity.label).join(",")}
      </span>
      <WalletApprovalNotice />
    </>
  );
}
let emit: (event: WalletSessionEvent) => void;
let session: LabWalletSession;
beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  session = {
    kind: "metamask",
    walletName: "MetaMask",
    transport: "managed",
    address: "0x7e5f4552091a69125d5dfcb7b8c2659029395bdf",
    signMessage: vi.fn().mockResolvedValue("signature"),
    disconnect: vi.fn(),
    subscribe(listener) {
      emit = listener;
      return vi.fn();
    },
  };
  mocks.connect.mockResolvedValue(session);
  mocks.derive.mockImplementation(
    async (signer: LabWalletSession, label: string) => {
      await signer.signMessage("identity");
      await mocks.afterSignature();
      return {
        label,
        publicKey: "E/frDPU+6KR8X6eFQ95jCOwDiIH1CCwoRmNqz+IxoyI=",
        privateKey: new Uint8Array(32).fill(7),
      };
    },
  );
});
async function mount() {
  const user = userEvent.setup();
  render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  await user.click(screen.getByText("Connect"));
  return user;
}
it("shows wallet approval only while signing, then restoration progress, and locks duplicate requests", async () => {
  const signature = deferred<string>();
  const processing = deferred<void>();
  vi.mocked(session.signMessage).mockReturnValue(signature.promise);
  mocks.afterSignature.mockReturnValue(processing.promise);
  const user = await mount();
  await user.dblClick(screen.getByText("Restore"));
  expect(session.signMessage).toHaveBeenCalledOnce();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Approve in your wallet",
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "Open MetaMask and approve the signature to restore “personal”",
  );
  expect(screen.getByText("Restore")).toBeDisabled();
  await act(async () => signature.resolve("signature"));
  expect(screen.getByRole("status")).toHaveTextContent("Restoring identity");
  expect(screen.getByRole("status")).not.toHaveTextContent(
    "Approve in your wallet",
  );
  await act(async () => processing.resolve());
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByTestId("ready")).toHaveTextContent("personal");
});
it("clears the indicator after rejection and allows an explicit retry", async () => {
  const signature = deferred<string>();
  vi.mocked(session.signMessage).mockReturnValueOnce(signature.promise);
  const user = await mount();
  await user.click(screen.getByText("Restore"));
  await act(async () => signature.reject({ code: 4001 }));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(
    screen.getByText(/Request declined in the wallet/),
  ).toBeInTheDocument();
  await user.click(screen.getByText("Restore"));
  expect(screen.getByTestId("ready")).toHaveTextContent("personal");
});
it.each(["accountsChanged", "chainChanged", "disconnect", "pagehide"] as const)(
  "clears stale signing feedback on %s while keeping the request locked until it settles",
  async (event) => {
    const signature = deferred<string>();
    vi.mocked(session.signMessage).mockReturnValue(signature.promise);
    const user = await mount();
    await user.click(screen.getByText("Restore"));
    act(() =>
      event === "pagehide"
        ? window.dispatchEvent(new Event("pagehide"))
        : emit(event),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("Restore")).toBeDisabled();
    await act(async () => signature.resolve("signature"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByTestId("ready")).toBeEmptyDOMElement();
    expect(screen.getByText("Restore")).toBeEnabled();
  },
);
it.each(["encrypt", "endorse"])(
  "tracks %s signatures through the shared operation boundary",
  async (action) => {
    const signature = deferred<string>();
    vi.mocked(session.signMessage).mockReturnValue(signature.promise);
    const user = await mount();
    await user.click(screen.getByText(action));
    expect(screen.getByRole("status")).toHaveTextContent(
      action === "encrypt" ? "encrypt your message" : "sign your Receive link",
    );
    await act(async () => signature.resolve("signature"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  },
);
it("does not show a wallet approval prompt for operations without a signature or the development fixture", async () => {
  const work = deferred<void>();
  mocks.localWork.mockReturnValue(work.promise);
  session.kind = "fixture";
  const user = await mount();
  await user.click(screen.getByText("Local work"));
  expect(screen.getByText("Local work")).toBeDisabled();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  await act(async () => work.resolve());
  const signature = deferred<string>();
  vi.mocked(session.signMessage).mockReturnValue(signature.promise);
  await user.click(screen.getByText("Restore"));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  await act(async () => signature.resolve("signature"));
});
