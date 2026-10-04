import { describe, expect, it } from "vitest";

import {
  MAX_ATTACHMENT_BYTES,
  attachmentExtLabel,
  formatBytes,
  validateAttachmentFile,
} from "../file-rules";

function makeFile(name: string, size: number, type = ""): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("validateAttachmentFile", () => {
  it("accepts every allowed extension regardless of case", () => {
    const names = [
      "shot.png",
      "photo.JPG",
      "photo.jpeg",
      "anim.gif",
      "img.webp",
      "spec.pdf",
      "notes.md",
      "notes.MARKDOWN",
    ];
    for (const name of names) {
      expect(validateAttachmentFile(makeFile(name, 10))).toBeNull();
    }
  });

  it("accepts a file at exactly the size limit", () => {
    expect(validateAttachmentFile(makeFile("big.png", MAX_ATTACHMENT_BYTES))).toBeNull();
  });

  it("rejects an empty file, mirroring the server message", () => {
    expect(validateAttachmentFile(makeFile("empty.png", 0))).toBe("File is empty");
  });

  it("rejects a file over the limit before checking its type", () => {
    // An oversized .exe must report the size problem, matching the server's check order.
    expect(validateAttachmentFile(makeFile("huge.exe", MAX_ATTACHMENT_BYTES + 1))).toBe(
      "File is too large. The maximum size is 10 MB.",
    );
  });

  it("rejects a disallowed extension, listing the allowed types", () => {
    expect(validateAttachmentFile(makeFile("tool.exe", 10))).toBe(
      "File type is not allowed. Allowed types: PNG, JPEG, GIF, WebP, PDF, Markdown.",
    );
  });

  it("rejects SVG — the server does not allow it", () => {
    expect(validateAttachmentFile(makeFile("logo.svg", 10, "image/svg+xml"))).toMatch(
      /not allowed/,
    );
  });

  it("falls back to the declared MIME type when the name has no extension", () => {
    expect(validateAttachmentFile(makeFile("screenshot", 10, "image/png"))).toBeNull();
    expect(validateAttachmentFile(makeFile("screenshot", 10, "application/zip"))).toMatch(
      /not allowed/,
    );
  });
});

describe("formatBytes", () => {
  it("formats bytes, KB and MB with at most one decimal", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(482133)).toBe("470.8 KB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10 MB");
  });
});

describe("attachmentExtLabel", () => {
  it("uses the uppercased extension and falls back to FILE", () => {
    expect(attachmentExtLabel("login-bug.png")).toBe("PNG");
    expect(attachmentExtLabel("notes.markdown")).toBe("MD");
    expect(attachmentExtLabel("archive.tar.gz")).toBe("GZ");
    expect(attachmentExtLabel("no-extension")).toBe("FILE");
  });
});
