import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { ManagementPanel } from "@/exchange/ManagementPanel";

const mocks = vi.hoisted(() => ({
  recover: vi.fn(),
  prepare: vi.fn(),
  submit: vi.fn(),
  dispose: vi.fn(),
  operation: vi.fn(),
}));
vi.mock("@/config/env", () => ({ configuration: { client: {} } }));
vi.mock("@/wallet/session-store", () => ({
  useSession: () => ({
    session: { address: "wallet" },
    busy: false,
    runOperation: mocks.operation,
  }),
}));
vi.mock("@/exchange/management", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/exchange/management")>()),
  importReference: () => ({
    seed: "original-seed",
    expiresAt: "2035-01-01T00:00:00Z",
  }),
  recoverReference: mocks.recover,
  prepareDeletion: mocks.prepare,
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.operation.mockImplementation((action) => action({}, () => true));
  mocks.prepare.mockResolvedValue({
    publicKey: "manager-key",
    managerIndex: 2,
    submit: mocks.submit,
    dispose: mocks.dispose,
  });
  mocks.recover.mockResolvedValue("deleted");
  mocks.submit.mockResolvedValue({ physicalDeletion: "pending" });
});
function mount(mode: "recover" | "delete") {
  return render(
    <MemoryRouter>
      <ManagementPanel mode={mode} />
    </MemoryRouter>,
  );
}
async function enter() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Sender reference JSON"), "reference");
  return user;
}

it("recovery does not sign or run automatically and only offers a new message after authoritative not-found", async () => {
  mount("recover");
  const user = await enter();
  expect(mocks.recover).not.toHaveBeenCalled();
  mocks.recover.mockRejectedValueOnce(new Error("private details"));
  await user.click(screen.getByRole("button", { name: "Check status" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Do not resend");
  expect(
    screen.queryByRole("link", { name: "Prepare a new message" }),
  ).not.toBeInTheDocument();
  mocks.recover.mockResolvedValueOnce("not-found");
  await user.click(screen.getByRole("button", { name: "Check status" }));
  expect(
    await screen.findByRole("link", { name: "Prepare a new message" }),
  ).toHaveAttribute("href", "/send");
  expect(mocks.operation).not.toHaveBeenCalled();
});

it("reviews the original seed and exact manager index; Cancel never submits deletion", async () => {
  const view = mount("delete");
  const user = await enter();
  await user.click(
    screen.getByRole("button", { name: "Check deletion authority" }),
  );
  expect(await screen.findByText("Seed: original-seed")).toBeInTheDocument();
  expect(screen.getByText("Manager index: 2")).toBeInTheDocument();
  expect(mocks.submit).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(mocks.dispose).toHaveBeenCalledTimes(1);
  expect(mocks.submit).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: "Check deletion authority" }),
  );
  await screen.findByText("Seed: original-seed");
  view.unmount();
  expect(mocks.dispose).toHaveBeenCalledTimes(2);
});

it("requires confirmation, blocks duplicate clicks, and shows logical deletion with pending physical removal", async () => {
  mount("delete");
  const user = await enter();
  await user.click(
    screen.getByRole("button", { name: "Check deletion authority" }),
  );
  let complete!: () => void;
  mocks.submit.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
  );
  await user.dblClick(
    await screen.findByRole("button", { name: "Confirm deletion" }),
  );
  expect(mocks.submit).toHaveBeenCalledTimes(1);
  await act(async () => complete());
  expect(
    await screen.findByText(/The item is logically deleted/),
  ).toHaveTextContent("Physical removal may still be pending");
  await waitFor(() => expect(mocks.recover).toHaveBeenCalledTimes(1), {
    timeout: 2500,
  });
  expect(mocks.submit).toHaveBeenCalledTimes(1);
  expect(mocks.dispose).toHaveBeenCalled();
});

it("discards a late prepared key and disposes it after navigation", async () => {
  let complete!: (value: unknown) => void;
  mocks.prepare.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const view = mount("delete");
  const user = await enter();
  await user.click(
    screen.getByRole("button", { name: "Check deletion authority" }),
  );
  view.unmount();
  await act(async () => complete({ dispose: mocks.dispose }));
  expect(mocks.dispose).toHaveBeenCalledTimes(1);
  expect(mocks.submit).not.toHaveBeenCalled();
});
