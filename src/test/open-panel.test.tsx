import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { OpenPanel } from "@/exchange/OpenPanel";

const mocks = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock("@/config/env", () => ({ configuration: { client: {} } }));
vi.mock("@/exchange/open", () => ({
  openMessage: mocks.open,
  openMessageError: () => "Cannot open this link.",
}));
vi.mock("@/wallet/session-store", () => ({
  useSession: () => ({
    identities: [{ label: "personal", publicKey: "public" }],
    busy: false,
    runIdentityOperation: (
      _key: string,
      action: (key: Uint8Array, current: () => boolean) => Promise<unknown>,
    ) => action(new Uint8Array(32), () => true),
  }),
}));
beforeEach(() => {
  vi.clearAllMocks();
});
function mount() {
  return render(
    <MemoryRouter initialEntries={["/open#encrypted-seed"]}>
      <OpenPanel />
    </MemoryRouter>,
  );
}

it("only decrypts explicitly, labels sender identity unverified and clears plaintext", async () => {
  mocks.open.mockResolvedValue({
    plaintext: "A private message",
    expiresAt: "2035-01-01T00:00:00Z",
    expired: false,
  });
  const user = userEvent.setup();
  mount();
  expect(screen.getByLabelText("Sealed link or encrypted seed")).toHaveValue(
    "#encrypted-seed",
  );
  expect(mocks.open).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Decrypt message" }));
  expect(screen.getByLabelText("Decrypted message")).toHaveValue(
    "A private message",
  );
  expect(screen.getByText("Sender identity unverified")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Clear message" }));
  expect(screen.queryByLabelText("Decrypted message")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Sealed link or encrypted seed")).toHaveValue(
    "",
  );
});

it("locks duplicate decrypt clicks and discards late results after clear or navigation", async () => {
  let resolve!: (result: unknown) => void;
  mocks.open.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const user = userEvent.setup();
  const view = mount();
  await user.dblClick(screen.getByRole("button", { name: "Decrypt message" }));
  expect(mocks.open).toHaveBeenCalledOnce();
  const current = mocks.open.mock.calls[0][3] as () => boolean;
  await user.click(screen.getByRole("button", { name: "Clear message" }));
  expect(current()).toBe(false);
  await act(async () =>
    resolve({
      plaintext: "Late secret",
      expiresAt: "2035-01-01T00:00:00Z",
      expired: false,
    }),
  );
  expect(screen.queryByLabelText("Decrypted message")).not.toBeInTheDocument();
  await user.type(
    screen.getByLabelText("Sealed link or encrypted seed"),
    "another",
  );
  await user.click(screen.getByRole("button", { name: "Decrypt message" }));
  const navigated = mocks.open.mock.calls[1][3] as () => boolean;
  view.unmount();
  expect(navigated()).toBe(false);
  await act(async () => resolve({ plaintext: "Late secret" }));
});
