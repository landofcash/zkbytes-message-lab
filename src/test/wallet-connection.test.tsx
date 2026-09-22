import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { WalletConnection } from "@/wallet/WalletConnection";
import { walletNetwork } from "@/config/wallet";

const state = vi.hoisted(() => ({
  session: {
    kind: "metamask",
    address: "0x" + "1".repeat(40),
    walletName: "MetaMask",
    chainId: "0x1",
  },
  busy: false,
  error: null as string | null,
  notice: null as string | null,
  switchNetwork: vi.fn(),
}));
vi.mock("@/wallet/session-store", () => ({ useSession: () => state }));
beforeEach(() => {
  state.busy = false;
  state.error = null;
  state.notice = null;
  state.session.chainId = "0x1";
  vi.clearAllMocks();
});
it("switches networks only on request and shows the updated network", async () => {
  const user = userEvent.setup();
  const manage = vi.fn();
  const view = render(
    <WalletConnection onManageWallet={manage} description="Connect to sign." />,
  );
  expect(state.switchNetwork).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: `Switch to ${walletNetwork.name}` }),
  );
  expect(state.switchNetwork).toHaveBeenCalledOnce();
  state.session.chainId = walletNetwork.chainId;
  view.rerender(
    <WalletConnection onManageWallet={manage} description="Connect to sign." />,
  );
  expect(
    screen.queryByRole("button", { name: /Switch to/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByText(new RegExp(walletNetwork.name))).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Manage wallet" }));
  expect(manage).toHaveBeenCalledOnce();
});
it("disables actions while busy and exposes wallet errors and notices", () => {
  state.busy = true;
  state.error = "Request rejected.";
  state.notice = "Network changed.";
  render(
    <WalletConnection
      onManageWallet={vi.fn()}
      description="Connect to sign."
    />,
  );
  expect(screen.getByRole("button", { name: "Manage wallet" })).toBeDisabled();
  expect(screen.getByRole("button", { name: /Switch to/ })).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent("Request rejected.");
  expect(screen.getByRole("status")).toHaveTextContent("Network changed.");
});
it("does not ask recovery users to switch networks", () => {
  render(
    <WalletConnection
      onManageWallet={vi.fn()}
      description="No wallet required."
      optional
    />,
  );
  expect(
    screen.queryByRole("button", { name: /Switch to/ }),
  ).not.toBeInTheDocument();
});
