import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/app/App";
import { SessionProvider } from "@/wallet/session-store";
import { setTheme } from "@/app/theme";
import { readConfiguration } from "@/config/env";
vi.mock("@/config/reown", () => ({ reownProjectId: null }));
beforeEach(() => localStorage.clear());

function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </MemoryRouter>,
  );
}
describe("MVP shell", () => {
  it("restores and exchanges a public Receive card, preserves keys across navigation, and locks them", async () => {
    const user = userEvent.setup();
    renderApp("/identities");
    await user.click(screen.getByRole("button", { name: "Connect wallet" }));
    await user.click(screen.getByRole("button", { name: /Connect fixture/ }));
    await user.click(
      await screen.findByRole("button", { name: "Close wallet management" }),
    );
    const restore = screen.getByRole("button", {
      name: "Create / restore keys",
    });
    await user.click(restore);
    const card = (
      (await screen.findByLabelText("Receive card for personal")) as HTMLElement
    ).textContent!;
    expect(card).not.toContain("privateKey");
    expect(card).toMatch(/^zkbytes\.v1\.[A-Za-z0-9_-]{43}$/);
    await user.click(screen.getByRole("button", { name: "Sign Receive card" }));
    await screen.findByRole("button", { name: "Use unsigned card" });
    const signedCard = (
      screen.getByLabelText("Receive card for personal") as HTMLElement
    ).textContent!;
    expect(signedCard.split(".")).toHaveLength(5);
    await user.click(screen.getByRole("link", { name: "Encrypt" }));
    await user.click(screen.getByLabelText("Paste a Receive card"));
    await user.paste(signedCard);
    await user.click(
      screen.getByRole("button", { name: "Import Receive card" }),
    );
    expect(screen.getByText(/Receive card valid/)).toBeInTheDocument();
    expect(screen.getByText(/Receiving key endorsed by/)).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Create identity" }));
    expect(
      screen.getByLabelText("Receive card for personal"),
    ).toHaveTextContent(card);
    await user.click(screen.getByRole("button", { name: "Lock / clear keys" }));
    expect(
      screen.queryByLabelText("Receive card for personal"),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Create / restore keys" }),
    );
    expect(
      await screen.findByLabelText("Receive card for personal"),
    ).toHaveTextContent(card);
    await user.click(screen.getByRole("button", { name: "Manage wallet" }));
    await user.click(screen.getByRole("button", { name: "Disconnect" }));
    await user.click(
      screen.getByRole("button", { name: "Close wallet management" }),
    );
    expect(
      screen.queryByLabelText("Receive card for personal"),
    ).not.toBeInTheDocument();
  });
  it("preserves a draft through all themes without making network requests", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    renderApp("/send");
    await user.type(screen.getByLabelText("Message"), "A private draft");
    for (const theme of ["cyberpunk", "cosmic", "terminal"]) {
      await user.selectOptions(screen.getByLabelText("Theme"), theme);
      expect(document.documentElement.dataset.theme).toBe(theme);
      expect(localStorage.getItem("zkbytes.theme")).toBe(theme);
      expect(screen.getByLabelText("Message")).toHaveValue("A private draft");
    }
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRestore();
  });
  it("clears a draft when leaving the page", async () => {
    const user = userEvent.setup();
    renderApp("/send");
    await user.type(screen.getByLabelText("Message"), "Clear on navigation");
    await user.click(screen.getByRole("link", { name: "Decrypt" }));
    await user.click(screen.getByRole("link", { name: "Encrypt" }));
    expect(screen.getByLabelText("Message")).toHaveValue("");
  });
  it("keeps wallet actions in a modal and compatibility in a separate optional tool", async () => {
    const user = userEvent.setup();
    renderApp();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Check compatibility/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Connect wallet" }));
    expect(
      screen.getByRole("dialog", { name: "Connect wallet" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /MetaMask/ })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /WalletConnect/ }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Close wallet management" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Compatibility" }));
    expect(
      screen.getByRole("button", { name: /Check compatibility/ }),
    ).toBeDisabled();
  });
  it("switches themes when browser storage is unavailable", () => {
    const storage = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("Denied");
      });
    expect(() => setTheme("cosmic")).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe("cosmic");
    storage.mockRestore();
  });
  it("validates storage configuration without sending requests or echoing invalid values", () => {
    expect(readConfiguration({}).client).toBeNull();
    expect(
      readConfiguration({
        VITE_ZKBYTES_API_ORIGIN: "http://private.invalid",
        VITE_ZKBYTES_DOWNLOAD_ORIGIN: "https://files.invalid",
      }).client,
    ).toBeNull();
    const result = readConfiguration({
      VITE_ZKBYTES_API_ORIGIN: "https://api.invalid",
      VITE_ZKBYTES_DOWNLOAD_ORIGIN: "https://files.invalid",
    });
    expect(result.client).not.toBeNull();
    expect(result.message).toBeNull();
  });
});
