import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { App } from "@/app/App";
import { SessionProvider } from "@/wallet/session-store";
import { IDENTITY_PROFILE } from "@/exchange/identity";
import {
  IDENTITY_STORAGE_KEY,
  serializeIdentityBackup,
  type SavedIdentity,
} from "@/exchange/saved-identities";

const mocks = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock("@/config/reown", () => ({ reownProjectId: null }));
vi.mock("@/config/env", () => ({ configuration: { client: {} } }));
vi.mock("@/exchange/open", () => ({
  openMessage: mocks.open,
  openMessageError: () => "Cannot open this link.",
}));
const address = "0x7e5f4552091a69125d5dfcb7b8c2659029395bdf";
const entry: SavedIdentity = {
  walletAddress: address,
  walletKind: "fixture" as const,
  label: "personal",
  publicKey: "E/frDPU+6KR8X6eFQ95jCOwDiIH1CCwoRmNqz+IxoyI=",
  profile: IDENTITY_PROFILE,
};
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
function mount(path = "/open") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </MemoryRouter>,
  );
}
async function connect(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    within(screen.getByRole("region", { name: "Wallet connection" })).getByRole(
      "button",
      { name: "Connect wallet" },
    ),
  );
  await user.click(screen.getByRole("button", { name: "Connect fixture" }));
  await user.click(
    await screen.findByRole("button", { name: "Close wallet management" }),
  );
}
it("preserves pasted input through connection, restores an unsaved label in place, and selects each newly restored identity", async () => {
  const user = userEvent.setup();
  mount();
  expect(
    screen.getByRole("button", { name: "Restore identity" }),
  ).toBeDisabled();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.type(
    screen.getByLabelText("Sealed link or encrypted seed"),
    "pasted encrypted link",
  );
  await connect(user);
  expect(screen.getByLabelText("Sealed link or encrypted seed")).toHaveValue(
    "pasted encrypted link",
  );
  await user.type(screen.getByLabelText("Other identity label"), "personal");
  await user.click(screen.getByRole("button", { name: "Restore identity" }));
  expect(
    await screen.findByRole("button", { name: "Use personal" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Decrypt message" })).toBeEnabled();
  await user.clear(screen.getByLabelText("Other identity label"));
  await user.type(screen.getByLabelText("Other identity label"), "work");
  await user.click(screen.getByRole("button", { name: "Restore identity" }));
  expect(
    await screen.findByRole("button", { name: "Use work" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Use personal" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  expect(mocks.open).not.toHaveBeenCalled();
  expect(
    JSON.parse(localStorage.getItem(IDENTITY_STORAGE_KEY)!).identities,
  ).toHaveLength(2);
});
it("restores saved identities only with their wallet and clears decrypted content on disconnect without losing the link", async () => {
  localStorage.setItem(
    IDENTITY_STORAGE_KEY,
    serializeIdentityBackup([
      entry,
      {
        ...entry,
        label: "other account",
        walletAddress: "0x" + "2".repeat(40),
      },
    ]),
  );
  mocks.open.mockResolvedValue({
    plaintext: "private message",
    expiresAt: "2035-01-01T00:00:00Z",
    expired: false,
  });
  const user = userEvent.setup();
  mount("/open#sealed-value");
  expect(
    screen.getByRole("button", { name: "Restore personal" }),
  ).toBeDisabled();
  await connect(user);
  expect(
    screen.getByRole("button", { name: "Restore other account" }),
  ).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Restore personal" }));
  expect(
    await screen.findByRole("button", { name: "Use personal" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByLabelText("Sealed link or encrypted seed")).toHaveValue(
    "#sealed-value",
  );
  await user.click(screen.getByRole("button", { name: "Decrypt message" }));
  expect(await screen.findByLabelText("Decrypted message")).toHaveTextContent(
    "private message",
  );
  await user.click(
    within(screen.getByRole("region", { name: "Wallet connection" })).getByRole(
      "button",
      { name: "Manage wallet" },
    ),
  );
  await user.click(screen.getByRole("button", { name: "Disconnect" }));
  await user.click(
    screen.getByRole("button", { name: "Close wallet management" }),
  );
  expect(screen.queryByLabelText("Decrypted message")).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Decrypt message" }),
  ).toBeDisabled();
  expect(screen.getByLabelText("Sealed link or encrypted seed")).toHaveValue(
    "#sealed-value",
  );
});
it("rejects invalid exact labels inline and keeps a restored identity usable when browser saving fails", async () => {
  const user = userEvent.setup();
  mount("/open#sealed-value");
  await connect(user);
  const input = screen.getByLabelText("Other identity label");
  await user.type(input, "personal ");
  await user.click(screen.getByRole("button", { name: "Restore identity" }));
  expect(screen.getByRole("alert")).toHaveTextContent("trailing spaces");
  expect(
    screen.queryByRole("button", { name: "Use personal" }),
  ).not.toBeInTheDocument();
  await user.clear(input);
  await user.type(input, "personal");
  const save = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Denied");
  });
  try {
    await user.click(screen.getByRole("button", { name: "Restore identity" }));
    expect(
      await screen.findByRole("button", { name: "Use personal" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("could not be saved");
    expect(
      screen.getByRole("button", { name: "Decrypt message" }),
    ).toBeEnabled();
  } finally {
    save.mockRestore();
  }
});
