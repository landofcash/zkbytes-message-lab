import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { CopyableField } from "@/components/ui/copyable-field";

const value =
  "https://zkbytes.example/send#zkbytes.v1.E_frDPU-6KR8X6eFQ95jCOwDiIH1CCwoRmNqz-IxoyI";

it("shortens the display while copying the complete value with keyboard activation", async () => {
  const user = userEvent.setup();
  render(<CopyableField label="Receive link" value={value} />);
  const field = screen.getByRole("button", { name: "Receive link" });
  expect(field).toHaveAttribute("title", value);
  expect(field).not.toHaveTextContent(value);
  expect(field).toHaveTextContent("…");
  await user.tab();
  expect(field).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(await navigator.clipboard.readText()).toBe(value);
  expect(field).toHaveTextContent("Copied!");
  expect(screen.getByRole("status")).toHaveTextContent("Receive link copied.");
});

it("offers the full selectable value if clipboard access is denied", async () => {
  const user = userEvent.setup();
  const copy = vi
    .spyOn(navigator.clipboard, "writeText")
    .mockRejectedValue(new Error("Denied"));
  try {
    render(<CopyableField label="Receive link" value={value} />);
    await user.click(screen.getByRole("button", { name: "Receive link" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Copy unavailable");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(
      screen.getByRole("textbox", { name: "Full Receive link" }),
    ).toHaveValue(value);
  } finally {
    copy.mockRestore();
  }
});

it("does not show stale copy feedback when the value changes and copies the new value", async () => {
  const user = userEvent.setup();
  const view = render(<CopyableField label="Receive link" value={value} />);
  await user.click(screen.getByRole("button", { name: "Receive link" }));
  view.rerender(<CopyableField label="Receive link" value="updated value" />);
  const field = screen.getByRole("button", { name: "Receive link" });
  expect(field).not.toHaveTextContent("Copied!");
  await user.click(field);
  expect(await navigator.clipboard.readText()).toBe("updated value");
});
