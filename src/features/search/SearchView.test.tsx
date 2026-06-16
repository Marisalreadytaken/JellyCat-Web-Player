import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { storageKeys } from "@core/storage/storage";
import { SearchView } from "./SearchView";

const searchMock = vi.hoisted(() => vi.fn());

vi.mock("@core/jellyfin", () => ({
  friendlyErrorMessage: () => "Search failed. Try again.",
  jellyfinClient: {
    artworkUrl: vi.fn(() => undefined),
    deleteItem: vi.fn(),
    search: searchMock,
    updateFavoriteStatus: vi.fn()
  }
}));

describe("SearchView history", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    searchMock.mockResolvedValue({ artists: [], albums: [], tracks: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("keeps only the latest debounced prefix search in recent searches", async () => {
    render(<SearchView />, { wrapper: MemoryRouter });

    const input = screen.getByPlaceholderText("TYPE TO SEARCH...");
    fireEvent.change(input, { target: { value: "OFF T" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(searchMock).toHaveBeenCalledWith("OFF T");
    expect(JSON.parse(localStorage.getItem(storageKeys.searchHistory) ?? "[]")).toEqual(["OFF T"]);

    fireEvent.change(input, { target: { value: "OFF TE" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(searchMock).toHaveBeenCalledWith("OFF TE");
    expect(JSON.parse(localStorage.getItem(storageKeys.searchHistory) ?? "[]")).toEqual(["OFF TE"]);

    fireEvent.change(input, { target: { value: "OFF THE" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(searchMock).toHaveBeenCalledWith("OFF THE");

    expect(JSON.parse(localStorage.getItem(storageKeys.searchHistory) ?? "[]")).toEqual(["OFF THE"]);
  });

  it("saves a normalized recent search when the user presses Enter", () => {
    render(<SearchView />, { wrapper: MemoryRouter });

    const input = screen.getByPlaceholderText("TYPE TO SEARCH...");
    fireEvent.change(input, { target: { value: "  OFF   THE  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(JSON.parse(localStorage.getItem(storageKeys.searchHistory) ?? "[]")).toEqual(["OFF THE"]);
  });

  it("ignores very short committed searches", () => {
    render(<SearchView />, { wrapper: MemoryRouter });

    const input = screen.getByPlaceholderText("TYPE TO SEARCH...");
    fireEvent.change(input, { target: { value: "of" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(JSON.parse(localStorage.getItem(storageKeys.searchHistory) ?? "[]")).toEqual([]);
  });
});
