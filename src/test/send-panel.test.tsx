import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SendPanel } from "@/exchange/SendPanel";
const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  upload: vi.fn(),
  recover: vi.fn(),
}));
vi.mock("@/config/env", () => ({
  configuration: {
    client: {
      apiOrigin: "https://api.example.com",
      downloadOrigin: "https://files.example.com",
    },
    message: null,
  },
}));
vi.mock("@/wallet/session-store", () => ({
  useSession: () => ({
    session: { address: "sender" },
    busy: false,
    compatibility: "compatible",
    runOperation: (
      operation: (session: unknown, current: () => boolean) => Promise<unknown>,
    ) => operation({ address: "sender" }, () => true),
  }),
}));
vi.mock("@/exchange/send", () => ({
  MAX_MESSAGE_BYTES: 65536,
  prepareMessage: mocks.prepare,
  uploadCandidate: mocks.upload,
  recoverCandidate: mocks.recover,
}));
vi.mock("@/exchange/sealed-seed", () => ({
  sealedSeedLink: (_origin: string, _envelope: unknown, withKey: boolean) =>
    `https://app.example.com/open#${withKey ? "recipient." : ""}ciphertext`,
  sealedSeedFragment: () => "recipient-ciphertext",
}));
const publicKey = "E/frDPU+6KR8X6eFQ95jCOwDiIH1CCwoRmNqz+IxoyI=";
const card = "zkbytes.v1.E_frDPU-6KR8X6eFQ95jCOwDiIH1CCwoRmNqz-IxoyI";
const candidate = {
  item: {},
  envelope: { recipientPublicKey: publicKey },
  reference: {
    seed: "original-seed",
    expiresAt: "2035-01-01T00:00:00Z",
    expectedCreator: { publicKey: "creator" },
    apiOrigin: "https://api.example.com",
    downloadOrigin: "https://files.example.com",
  },
};
async function fill() {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText("Paste a Receive card"));
  await user.paste(card);
  await user.click(screen.getByRole("button", { name: "Import Receive card" }));
  await user.type(screen.getByLabelText("Message"), "Secret draft");
  return user;
}
describe("Send UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prepare.mockResolvedValue(candidate);
    mocks.upload.mockResolvedValue("active");
  });
  it("separates preparation from upload and locks duplicate clicks until upload settles", async () => {
    render(<SendPanel />);
    const user = await fill();
    await user.click(
      screen.getByRole("button", { name: "Confirm & sign to encrypt" }),
    );
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Message")).not.toBeInTheDocument();
    expect(screen.getByText("original-seed")).toBeInTheDocument();
    let resolve!: (value: string) => void;
    mocks.upload.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    await user.dblClick(screen.getByRole("button", { name: "Confirm upload" }));
    expect(mocks.upload).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText("Sealed link")).not.toBeInTheDocument();
    await act(async () => resolve("active"));
    expect(
      screen.getByRole("heading", { name: "Message saved" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your encrypted message is saved."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Sealed link")).toHaveValue(
      "https://app.example.com/open#ciphertext",
    );
  });
  it("blocks resending uncertain outcomes until recovery confirms not-found", async () => {
    mocks.upload.mockResolvedValue("uncertain");
    mocks.recover.mockRejectedValueOnce(new Error("private server details"));
    render(<SendPanel />);
    const user = await fill();
    await user.click(
      screen.getByRole("button", { name: "Confirm & sign to encrypt" }),
    );
    await user.click(screen.getByRole("button", { name: "Confirm upload" }));
    expect(screen.getByText(/upload outcome is unknown/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Retry/ }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Check upload status" }),
    );
    expect(
      screen.queryByText(/private server details/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Retry/ }),
    ).not.toBeInTheDocument();
    mocks.recover.mockResolvedValue("not-found");
    await user.click(
      screen.getByRole("button", { name: "Check upload status" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Retry same encrypted message" }),
    );
    expect(mocks.upload.mock.calls[0][1]).toBe(mocks.upload.mock.calls[1][1]);
    expect(mocks.prepare).toHaveBeenCalledOnce();
  });

  it("switches recipient key inclusion without encrypting or uploading again", async () => {
    render(<SendPanel />);
    const user = await fill();
    await user.click(
      screen.getByRole("button", { name: "Confirm & sign to encrypt" }),
    );
    await user.click(screen.getByRole("button", { name: "Confirm upload" }));
    const checkbox = screen.getByRole("checkbox", {
      name: "Include recipient public key in link",
    });
    expect(checkbox).not.toBeChecked();
    expect(screen.getByLabelText("Sealed link")).toHaveValue(
      "https://app.example.com/open#ciphertext",
    );
    await user.click(checkbox);
    expect(screen.getByLabelText("Sealed link")).toHaveValue(
      "https://app.example.com/open#recipient.ciphertext",
    );
    await user.click(checkbox);
    expect(screen.getByLabelText("Sealed link")).toHaveValue(
      "https://app.example.com/open#ciphertext",
    );
    expect(mocks.prepare).toHaveBeenCalledOnce();
    expect(mocks.upload).toHaveBeenCalledOnce();
  });
  it("replaces a recovery error with clear success and sharing controls after verification", async () => {
    mocks.upload.mockResolvedValue("uncertain");
    mocks.recover.mockRejectedValueOnce(new Error("invalid response"));
    mocks.recover.mockResolvedValueOnce("active");
    render(<SendPanel />);
    const user = await fill();
    await user.click(
      screen.getByRole("button", { name: "Confirm & sign to encrypt" }),
    );
    await user.click(screen.getByRole("button", { name: "Confirm upload" }));
    await user.click(
      screen.getByRole("button", { name: "Check upload status" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Status could not be verified",
    );
    await user.click(
      screen.getByRole("button", { name: "Check upload status" }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Message saved" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy sealed link" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Confirm upload" }),
    ).not.toBeInTheDocument();
  });

  it("invalidates late preparation on navigation and does not upload", async () => {
    let resolve!: (value: unknown) => void;
    mocks.prepare.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const view = render(<SendPanel />);
    const user = await fill();
    await user.click(
      screen.getByRole("button", { name: "Confirm & sign to encrypt" }),
    );
    const isCurrent = mocks.prepare.mock.calls[0][5] as () => boolean;
    view.unmount();
    expect(isCurrent()).toBe(false);
    await act(async () => resolve(candidate));
    await waitFor(() => expect(mocks.upload).not.toHaveBeenCalled());
  });
});
