import { render, screen, within } from "@testing-library/react";
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
  it("restores and exchanges a public Receive link, preserves keys across navigation, and locks them", async () => {
    const user = userEvent.setup();
    renderApp("/identities");
    await user.click(
      within(
        screen.getByRole("region", { name: "Wallet connection" }),
      ).getByRole("button", { name: "Connect wallet" }),
    );
    await user.click(screen.getByRole("button", { name: /Connect fixture/ }));
    await user.click(
      await screen.findByRole("button", { name: "Close wallet management" }),
    );
    const restore = screen.getByRole("button", {
      name: "Create / restore keys",
    });
    await user.click(restore);
    const card = (
      (await screen.findByLabelText("Receive link for personal")) as HTMLElement
    ).title;
    expect(card).not.toContain("privateKey");
    expect(new URL(card).pathname).toBe("/send");
    expect(new URL(card).hash).toMatch(/^#zkbytes\.v1\.[A-Za-z0-9_-]{43}$/);
    expect(
      screen.queryByRole("button", { name: /Export Receive/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign Receive link" }));
    await screen.findByRole("button", { name: "Use unsigned link" });
    const signedCard = (
      screen.getByLabelText("Receive link for personal") as HTMLElement
    ).title;
    expect(new URL(signedCard).hash.split(".")).toHaveLength(5);
    await user.click(
      screen.getByRole("button", { name: "Receive link for personal" }),
    );
    expect(await navigator.clipboard.readText()).toBe(signedCard);
    expect(
      screen.getByRole("button", { name: "Create / restore keys" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Receive link for personal" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Encrypt" }));
    await user.click(screen.getByLabelText("Paste a Receive link"));
    await user.paste(signedCard);
    await user.click(screen.getByRole("button", { name: "Use recipient" }));
    expect(screen.getByLabelText("Paste a Receive link")).toHaveValue(
      signedCard,
    );
    expect(screen.getByText(/Receive link valid/)).toBeInTheDocument();
    expect(screen.getByText(/Receiving key endorsed by/)).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Create identity" }));
    expect(screen.getByLabelText("Receive link for personal")).toHaveAttribute(
      "title",
      card,
    );
    await user.click(screen.getByRole("button", { name: "Lock / clear keys" }));
    expect(
      screen.queryByLabelText("Receive link for personal"),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Create / restore keys" }),
    );
    expect(
      await screen.findByLabelText("Receive link for personal"),
    ).toHaveAttribute("title", card);
    await user.click(
      within(
        screen.getByRole("region", { name: "Wallet connection" }),
      ).getByRole("button", { name: "Manage wallet" }),
    );
    await user.click(screen.getByRole("button", { name: "Disconnect" }));
    await user.click(
      screen.getByRole("button", { name: "Close wallet management" }),
    );
    expect(
      screen.queryByLabelText("Receive link for personal"),
    ).not.toBeInTheDocument();
  });
  it("prefills and validates a shared recipient before connecting a wallet, without network requests", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const compact = "zkbytes.v1.E_frDPU-6KR8X6eFQ95jCOwDiIH1CCwoRmNqz-IxoyI";
    renderApp(`/send#${compact}`);
    expect(screen.getByLabelText("Paste a Receive link")).toHaveValue(
      `${window.location.origin}/send#${compact}`,
    );
    expect(screen.getByText(/Receive link valid/)).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("region", { name: "Wallet connection" }),
      ).getByRole("button", { name: "Connect wallet" }),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRestore();
  });
  it("shows an invalid shared recipient and lets the sender replace it", async () => {
    const user = userEvent.setup();
    renderApp("/send#zkbytes.v1.invalid");
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid Receive link");
    expect(screen.queryByText(/Receive link valid/)).not.toBeInTheDocument();
    const field = screen.getByLabelText("Paste a Receive link");
    await user.clear(field);
    await user.paste(
      `${window.location.origin}/send#zkbytes.v1.E_frDPU-6KR8X6eFQ95jCOwDiIH1CCwoRmNqz-IxoyI`,
    );
    await user.click(screen.getByRole("button", { name: "Use recipient" }));
    expect(screen.getByText(/Receive link valid/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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
