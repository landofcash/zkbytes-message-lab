import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { App } from "@/app/App";
import { SessionProvider } from "@/wallet/session-store";
import { setTheme } from "@/app/theme";
import { readConfiguration } from "@/config/env";
vi.mock("@/config/reown", () => ({ reownProjectId: null }));

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
    renderApp();
    await user.click(screen.getByRole("button", { name: /Connect fixture/ }));
    await user.click(
      screen.getByRole("button", { name: /Check compatibility/ }),
    );
    const restore = screen.getByRole("button", {
      name: "Create / restore keys",
    });
    await screen.findByText(/Compatible.*reproducible keys/);
    await user.click(restore);
    const card = (
      (await screen.findByLabelText(
        "Receive card for personal",
      )) as HTMLTextAreaElement
    ).value;
    expect(card).not.toContain("privateKey");
    await user.click(screen.getByRole("link", { name: "Send" }));
    await user.click(screen.getByLabelText("Paste a Receive card"));
    await user.paste(card);
    await user.click(
      screen.getByRole("button", { name: "Import Receive card" }),
    );
    expect(screen.getByText(/Receive card valid/)).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "My keys" }));
    expect(screen.getByLabelText("Receive card for personal")).toHaveValue(
      card,
    );
    await user.click(screen.getByRole("button", { name: "Lock / clear keys" }));
    expect(
      screen.queryByLabelText("Receive card for personal"),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Create / restore keys" }),
    );
    expect(
      await screen.findByLabelText("Receive card for personal"),
    ).toHaveValue(card);
    await user.click(screen.getByRole("button", { name: "Disconnect" }));
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
    await user.click(screen.getByRole("link", { name: "My keys" }));
    await user.click(screen.getByRole("link", { name: "Send" }));
    expect(screen.getByLabelText("Message")).toHaveValue("");
  });
  it("does not connect or sign on mount and leaves future actions disabled", () => {
    renderApp();
    expect(screen.getByText("Not connected")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Check compatibility/ }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /MetaMask/ })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /WalletConnect/ }),
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
