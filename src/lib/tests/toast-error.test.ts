import { describe, it, expect, vi, afterEach } from "vitest";
import { toast } from "sonner";

import { HttpError } from "../http-client";
import { toastError } from "../toast-error";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

afterEach(() => {
  vi.clearAllMocks();
});

const TECHNICAL = "POST /tasks/x failed with status 400";

describe("toastError", () => {
  it("surfaces the server message from HttpError.body.message", () => {
    toastError(
      new HttpError(400, TECHNICAL, { statusCode: 400, message: "Task not found" }),
      "Fallback message",
    );
    expect(toast.error).toHaveBeenCalledWith("Task not found");
  });

  it("joins a string[] body message (NestJS validation shape)", () => {
    toastError(
      new HttpError(422, TECHNICAL, { message: ["title is required", "title too long"] }),
      "Fallback message",
    );
    expect(toast.error).toHaveBeenCalledWith("title is required; title too long");
  });

  it("uses the fallback for an HttpError with no server message — never the internal message", () => {
    toastError(new HttpError(500, TECHNICAL), "Couldn't save your changes.");
    expect(toast.error).toHaveBeenCalledWith("Couldn't save your changes.");
    expect(toast.error).not.toHaveBeenCalledWith(TECHNICAL);
  });

  it("uses the fallback for a generic Error", () => {
    toastError(new Error("network boom"), "Couldn't save your changes.");
    expect(toast.error).toHaveBeenCalledWith("Couldn't save your changes.");
  });

  it("uses the fallback for a non-Error throw", () => {
    toastError("weird string", "Couldn't save your changes.");
    expect(toast.error).toHaveBeenCalledWith("Couldn't save your changes.");
  });
});
