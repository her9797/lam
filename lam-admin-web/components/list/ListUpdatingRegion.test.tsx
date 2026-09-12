import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import "@/i18n/client";

import { ListUpdatingRegion } from "./ListUpdatingRegion";

afterEach(cleanup);

describe("ListUpdatingRegion", () => {
  it("exposes an indeterminate progressbar while a request is open", () => {
    render(
      <ListUpdatingRegion active stale={false}>
        <p>rows</p>
      </ListUpdatingRegion>,
    );

    const bar = screen.getByRole("progressbar", { name: "목록을 업데이트하는 중" });
    // Indeterminate: the screen has no idea how far along the fetch is, so
    // it must not claim a value.
    expect(bar).not.toHaveAttribute("aria-valuenow");
  });

  it("exposes no progressbar once the list is idle", () => {
    render(
      <ListUpdatingRegion active={false} stale={false}>
        <p>rows</p>
      </ListUpdatingRegion>,
    );

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  // The whole point of this component is that it cannot cause the layout
  // shift it reports on: the track occupies its height whether or not the
  // bar is running, so turning the bar on never reflows the rows below it.
  it("keeps the bar's track mounted while idle so appearing cannot shift the layout", () => {
    const { container } = render(
      <ListUpdatingRegion active={false} stale={false}>
        <p>rows</p>
      </ListUpdatingRegion>,
    );

    expect(container.querySelector('[data-slot="list-progress-track"]')).toBeInTheDocument();
  });

  it("keeps the rows mounted and marks them busy while a stale page is on screen", () => {
    render(
      <ListUpdatingRegion active stale>
        <p>rows</p>
      </ListUpdatingRegion>,
    );

    expect(screen.getByText("rows")).toBeInTheDocument();
    expect(screen.getByText("rows").closest("[aria-busy]")).toHaveAttribute("aria-busy", "true");
  });

  // A window-focus refetch or a Realtime broadcast opens a request against
  // the page already on screen. That earns the bar, but dimming rows the
  // operator is reading would make the table blink for no reason.
  it("shows the bar without marking the rows busy during a background refetch", () => {
    render(
      <ListUpdatingRegion active stale={false}>
        <p>rows</p>
      </ListUpdatingRegion>,
    );

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByText("rows").closest("[aria-busy]")).toHaveAttribute("aria-busy", "false");
  });
});
