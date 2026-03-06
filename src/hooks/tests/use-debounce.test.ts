import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";

import { useDebounce } from "../use-debounce";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useDebounce", () => {
  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500));

    expect(result.current).toBe("hello");
  });

  it("does not update the value before the delay", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 300 } },
    );

    rerender({ value: "b", delay: 300 });

    act(() => {
      vi.advanceTimersByTime(299);
    });

    expect(result.current).toBe("a");

    vi.useRealTimers();
  });

  it("updates the value after the delay", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 300 } },
    );

    rerender({ value: "b", delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("b");

    vi.useRealTimers();
  });

  it("resets the timer when value changes within the delay", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 300 } },
    );

    rerender({ value: "b", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Change again before timeout fires
    rerender({ value: "c", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // 200ms after second change — still not fired
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // 300ms after second change — fires with latest value
    expect(result.current).toBe("c");

    vi.useRealTimers();
  });

  it("handles delay changes", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 500 } },
    );

    rerender({ value: "b", delay: 100 });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe("b");

    vi.useRealTimers();
  });

  it("works with non-string types", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 1, delay: 200 } },
    );

    rerender({ value: 42, delay: 200 });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(42);

    vi.useRealTimers();
  });
});
