import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { App } from "@/app/App";
import { SessionProvider } from "@/wallet/session-store";

const mocks = vi.hoisted(() => ({
  recover: vi.fn(),
  prepare: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock("@/config/reown", () => ({ reownProjectId: null }));
vi.mock("@/config/env", () => ({ configuration: { client: {} } }));
vi.mock("@/exchange/management", async (original) => ({
  ...(await original<typeof import("@/exchange/management")>()),
  importReference: () => ({
    seed: "original-seed",
    expiresAt: "2035-01-01T00:00:00Z",
  }),
  recoverReference: mocks.recover,
  prepareDeletion: mocks.prepare,
}));
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mocks.recover.mockResolvedValue("active");
  mocks.prepare.mockResolvedValue({
    publicKey: "manager",
    managerIndex: 0,
    dispose: mocks.dispose,
  });
});
function mount(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </MemoryRouter>,
  );
}
function wallet() {
  return within(screen.getByRole("region", { name: "Wallet connection" }));
}
async function connect(user: ReturnType<typeof userEvent.setup>) {
  await user.click(wallet().getByRole("button", { name: "Connect wallet" }));
  await user.click(screen.getByRole("button", { name: "Connect fixture" }));
  await user.click(
    await screen.findByRole("button", { name: "Close wallet management" }),
  );
}
async function disconnect(user: ReturnType<typeof userEvent.setup>) {
  await user.click(wallet().getByRole("button", { name: "Manage wallet" }));
  await user.click(screen.getByRole("button", { name: "Disconnect" }));
  await user.click(
    screen.getByRole("button", { name: "Close wallet management" }),
  );
}
it.each([
  "/send",
  "/identities",
  "/delete",
  "/compatibility",
  "/recover",
  "/open",
])("connects and manages the wallet inline on %s", async (path) => {
  const user = userEvent.setup();
  mount(path);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await connect(user);
  expect(wallet().getByRole("button", { name: "Manage wallet" })).toBeEnabled();
  expect(wallet().getByTitle(/^0x/)).toHaveTextContent(/0x7e5f…5bdf/i);
  await disconnect(user);
  expect(
    wallet().getByRole("button", { name: "Connect wallet" }),
  ).toBeEnabled();
});
it("preserves the full Encrypt form on initial connection and clears private draft state on disconnect", async () => {
  const user = userEvent.setup();
  mount("/send");
  const recipient = "zkbytes.v1.E_frDPU-6KR8X6eFQ95jCOwDiIH1CCwoRmNqz-IxoyI";
  await user.type(screen.getByLabelText("Message"), "Private draft");
  await user.type(screen.getByLabelText("Paste a Receive link"), recipient);
  await user.click(screen.getByRole("button", { name: "Use recipient" }));
  await user.selectOptions(screen.getByLabelText("Expiration"), "168");
  await connect(user);
  expect(screen.getByLabelText("Message")).toHaveValue("Private draft");
  expect(screen.getByLabelText("Paste a Receive link")).toHaveValue(recipient);
  expect(screen.getByLabelText("Expiration")).toHaveValue("168");
  expect(
    screen.getByRole("button", { name: "Confirm & sign to encrypt" }),
  ).toBeEnabled();
  await disconnect(user);
  expect(screen.getByLabelText("Message")).toHaveValue("");
});
it("clears an unconnected draft on pagehide", async () => {
  const user = userEvent.setup();
  mount("/send");
  await user.type(screen.getByLabelText("Message"), "Private draft");
  act(() => window.dispatchEvent(new Event("pagehide")));
  expect(screen.getByLabelText("Message")).toHaveValue("");
});
it("keeps the exact identity label through connection without signing automatically", async () => {
  const user = userEvent.setup();
  mount("/identities");
  await user.clear(screen.getByLabelText("Key label"));
  await user.type(screen.getByLabelText("Key label"), "Work_2026");
  await connect(user);
  expect(screen.getByLabelText("Key label")).toHaveValue("Work_2026");
  expect(
    screen.queryByLabelText("Receive link for Work_2026"),
  ).not.toBeInTheDocument();
});
it("preserves a deletion reference but disposes authority after disconnect", async () => {
  const user = userEvent.setup();
  mount("/delete");
  await user.type(screen.getByLabelText("Sender reference JSON"), "reference");
  await connect(user);
  expect(screen.getByLabelText("Sender reference JSON")).toHaveValue(
    "reference",
  );
  await user.click(
    screen.getByRole("button", { name: "Check deletion authority" }),
  );
  await screen.findByRole("button", { name: "Confirm deletion" });
  await disconnect(user);
  expect(mocks.dispose).toHaveBeenCalledOnce();
  expect(
    screen.queryByRole("button", { name: "Confirm deletion" }),
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText("Sender reference JSON")).toHaveValue(
    "reference",
  );
});
it("recovers without a wallet and retains the reference and result through optional connection", async () => {
  const user = userEvent.setup();
  mount("/recover");
  expect(wallet().getByText("Wallet optional")).toBeInTheDocument();
  await user.type(screen.getByLabelText("Sender reference JSON"), "reference");
  await user.click(screen.getByRole("button", { name: "Check status" }));
  expect(mocks.recover).toHaveBeenCalledOnce();
  await connect(user);
  expect(screen.getByLabelText("Sender reference JSON")).toHaveValue(
    "reference",
  );
  expect(mocks.recover).toHaveBeenCalledOnce();
  expect(mocks.prepare).not.toHaveBeenCalled();
});
