import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@/i18n/client";

import { Pagination } from "./Pagination";

afterEach(cleanup);

describe("Pagination", () => {
  it("shows the total count and current/last page", () => {
    render(<Pagination page={2} pageSize={20} total={45} onPageChange={vi.fn()} />);

    expect(screen.getByText("총 45건")).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("disables the previous button on the first page", () => {
    render(<Pagination page={1} pageSize={20} total={45} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "이전" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "다음" })).not.toBeDisabled();
  });

  it("disables the next button on the last page", () => {
    render(<Pagination page={3} pageSize={20} total={45} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "이전" })).not.toBeDisabled();
  });

  it("calls onPageChange with the adjacent page number", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} pageSize={20} total={45} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByRole("button", { name: "이전" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("treats an empty result as a single page with no next", () => {
    render(<Pagination page={1} pageSize={20} total={0} onPageChange={vi.fn()} />);

    expect(screen.getByText("1 / 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
  });
});
