import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { App } from "@/app/App";
import { SessionProvider } from "@/wallet/session-store";
import { IDENTITY_PROFILE } from "@/exchange/identity";
import {
  IDENTITY_STORAGE_KEY,
  serializeIdentityBackup,
} from "@/exchange/saved-identities";
vi.mock("@/config/reown", () => ({ reownProjectId: null }));
const address = "0x7e5f4552091a69125d5dfcb7b8c2659029395bdf";
const publicKey = "E/frDPU+6KR8X6eFQ95jCOwDiIH1CCwoRmNqz+IxoyI=";
const entry: import("@/exchange/saved-identities").SavedIdentity = {
  walletAddress: address,
  walletKind: "fixture" as const,
  label: "personal",
  publicKey,
  profile: IDENTITY_PROFILE,
};
beforeEach(() => {
  localStorage.clear();
});

it("keeps keys usable when browser persistence fails and reports that they were not saved", async () => {
  const user = userEvent.setup();
  mount();
  await connect(user);
  const write = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw new Error("Unavailable");
    });
  try {
    await user.click(
      screen.getByRole("button", { name: "Create / restore keys" }),
    );
    expect(
      await screen.findByLabelText("Receive card for personal"),
    ).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "could not be saved",
    );
    expect(localStorage.getItem(IDENTITY_STORAGE_KEY)).toBeNull();
  } finally {
    write.mockRestore();
  }
});

it("does not overwrite malformed saved data automatically", async () => {
  localStorage.setItem(IDENTITY_STORAGE_KEY, "invalid backup");
  mount();
  expect(screen.getByRole("alert")).toHaveTextContent("could not be read");
  expect(localStorage.getItem(IDENTITY_STORAGE_KEY)).toBe("invalid backup");
});
function mount(path = "/identities") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </MemoryRouter>,
  );
}
async function connect(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Connect wallet" }));
  await user.click(screen.getByRole("button", { name: "Connect fixture" }));
  await user.click(
    await screen.findByRole("button", { name: "Close wallet management" }),
  );
}
it("remembers metadata across reload, requires wallet restoration, and clears only identity data after confirmation", async () => {
  const user = userEvent.setup();
  const view = mount();
  await connect(user);
  await user.click(
    screen.getByRole("button", { name: "Create / restore keys" }),
  );
  const card = (await screen.findByLabelText("Receive card for personal"))
    .textContent;
  const saved = localStorage.getItem(IDENTITY_STORAGE_KEY)!;
  expect(JSON.parse(saved).identities).toEqual([entry]);
  view.unmount();
  mount();
  expect(
    screen.queryByLabelText("Receive card for personal"),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: `Restore personal for ${address}` }),
  ).toBeDisabled();
  await connect(user);
  await user.click(
    screen.getByRole("button", { name: `Restore personal for ${address}` }),
  );
  expect(
    await screen.findByLabelText("Receive card for personal"),
  ).toHaveTextContent(card!);
  localStorage.setItem("unrelated", "keep");
  await user.click(
    screen.getByRole("button", { name: "Clear saved identities" }),
  );
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(localStorage.getItem(IDENTITY_STORAGE_KEY)).toBe(saved);
  await user.click(
    screen.getByRole("button", { name: "Clear saved identities" }),
  );
  await user.click(
    screen.getByRole("button", { name: "Confirm clear saved identities" }),
  );
  expect(localStorage.getItem(IDENTITY_STORAGE_KEY)).toBeNull();
  expect(localStorage.getItem("unrelated")).toBe("keep");
  expect(
    screen.queryByLabelText("Receive card for personal"),
  ).not.toBeInTheDocument();
});
it("previews backup import and merges only on confirmation without connecting a wallet", async () => {
  const user = userEvent.setup();
  mount();
  const file = new File([serializeIdentityBackup([entry])], "identities.json", {
    type: "application/json",
  });
  Object.defineProperty(file, "text", {
    value: async () => serializeIdentityBackup([entry]),
  });
  await user.upload(screen.getByLabelText("Import identity backup"), file);
  await screen.findByRole("button", { name: "Confirm import" });
  expect(localStorage.getItem(IDENTITY_STORAGE_KEY)).toBeNull();
  await user.click(screen.getByRole("button", { name: "Confirm import" }));
  expect(
    JSON.parse(localStorage.getItem(IDENTITY_STORAGE_KEY)!).identities,
  ).toEqual([entry]);
  expect(
    screen.getByRole("button", { name: "Connect wallet" }),
  ).toBeInTheDocument();
});
it("rejects a restored key that differs from the backup and leaves the backup intact", async () => {
  const backup = serializeIdentityBackup([
    { ...entry, publicKey: "V8XMRBeA/lFxD6x7wjx0MJNasK6KIzId0nMDICfTq2s=" },
  ]);
  localStorage.setItem(IDENTITY_STORAGE_KEY, backup);
  const user = userEvent.setup();
  mount();
  await connect(user);
  await user.click(
    screen.getByRole("button", { name: `Restore personal for ${address}` }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "differs from the saved key",
  );
  expect(
    screen.queryByLabelText("Receive card for personal"),
  ).not.toBeInTheDocument();
  expect(localStorage.getItem(IDENTITY_STORAGE_KEY)).toBe(backup);
});
it("keeps an incoming sealed link through identity setup and clears unlocked keys on another tab's storage change", async () => {
  const user = userEvent.setup();
  mount("/open#sealed-value");
  expect(screen.queryByLabelText("Key label")).not.toBeInTheDocument();
  await user.click(
    screen.getByRole("link", { name: "Create or restore an identity" }),
  );
  await connect(user);
  await user.click(
    screen.getByRole("button", { name: "Create / restore keys" }),
  );
  await screen.findByLabelText("Receive card for personal");
  act(() => {
    localStorage.removeItem(IDENTITY_STORAGE_KEY);
    window.dispatchEvent(
      new StorageEvent("storage", { key: IDENTITY_STORAGE_KEY }),
    );
  });
  await waitFor(() =>
    expect(
      screen.queryByLabelText("Receive card for personal"),
    ).not.toBeInTheDocument(),
  );
  await user.click(screen.getByRole("link", { name: "Continue to Decrypt" }));
  expect(screen.getByLabelText("Sealed link or encrypted seed")).toHaveValue(
    "#sealed-value",
  );
});
