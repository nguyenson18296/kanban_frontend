import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError, httpClient } from "../http-client";

type Listener = (event: unknown) => void;

/** Minimal stand-in for the browser XHR the upload transport drives. */
class FakeXHR {
  static instances: FakeXHR[] = [];

  method = "";
  url = "";
  headers: Record<string, string> = {};
  sentBody: unknown;
  status = 0;
  responseText = "";
  wasAborted = false;

  upload = {
    listeners: new Map<string, Listener[]>(),
    addEventListener(type: string, listener: Listener) {
      const list = this.listeners.get(type) ?? [];
      list.push(listener);
      this.listeners.set(type, list);
    },
  };

  private listeners = new Map<string, Listener[]>();

  constructor() {
    FakeXHR.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  send(body?: unknown) {
    this.sentBody = body;
  }

  abort() {
    this.wasAborted = true;
    this.emit("abort");
  }

  addEventListener(type: string, listener: Listener) {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  emit(type: string, event: unknown = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  emitUploadProgress(loaded: number, total: number) {
    for (const listener of this.upload.listeners.get("progress") ?? []) {
      listener({ lengthComputable: true, loaded, total });
    }
  }

  respond(status: number, body?: unknown) {
    this.status = status;
    this.responseText = body === undefined ? "" : JSON.stringify(body);
    this.emit("load");
  }
}

function fakeJwt(exp: number): string {
  const payload = btoa(JSON.stringify({ exp }))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  return `header.${payload}.signature`;
}

function lastXhr(): FakeXHR {
  const instance = FakeXHR.instances.at(-1);
  if (!instance) throw new Error("no XHR was created");
  return instance;
}

const PATH = "/tasks/t1/attachments";

beforeEach(() => {
  vi.stubGlobal("XMLHttpRequest", FakeXHR);
  document.cookie = "access_token=tok123; path=/";
});

afterEach(() => {
  FakeXHR.instances = [];
  document.cookie = "access_token=; path=/; max-age=0";
  document.cookie = "refresh_token=; path=/; max-age=0";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("httpClient.upload", () => {
  it("POSTs the form with bearer auth, no manual Content-Type, and resolves the parsed body", async () => {
    const form = new FormData();
    const promise = httpClient.upload<{ id: string }>(PATH, form);

    const xhr = lastXhr();
    expect(xhr.method).toBe("POST");
    // BASE_URL comes from the env; only the path is this transport's job.
    expect(xhr.url.endsWith(PATH)).toBe(true);
    expect(xhr.headers["Authorization"]).toBe("Bearer tok123");
    expect(xhr.headers["Accept"]).toBe("application/json");
    // The browser must set the multipart boundary itself.
    expect(Object.keys(xhr.headers)).not.toContain("Content-Type");
    expect(xhr.sentBody).toBe(form);

    xhr.respond(201, { id: "a1" });
    await expect(promise).resolves.toEqual({ id: "a1" });
  });

  it("reports upload progress with loaded and total bytes", async () => {
    const onProgress = vi.fn();
    const promise = httpClient.upload(PATH, new FormData(), { onProgress });

    const xhr = lastXhr();
    xhr.emitUploadProgress(50, 200);
    xhr.emitUploadProgress(200, 200);
    xhr.respond(201, {});
    await promise;

    expect(onProgress).toHaveBeenNthCalledWith(1, 50, 200);
    expect(onProgress).toHaveBeenNthCalledWith(2, 200, 200);
  });

  it("rejects with an HttpError carrying the parsed server body on a non-2xx response", async () => {
    const promise = httpClient.upload(PATH, new FormData());
    lastXhr().respond(413, {
      message: "File is too large. The maximum size is 10 MB.",
      error: "Payload Too Large",
      statusCode: 413,
    });

    const error = await promise.then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(413);
    expect((error as HttpError).message).toBe(`POST ${PATH} failed with status 413`);
    expect((error as HttpError).body).toMatchObject({ statusCode: 413 });
  });

  it("aborts the request and rejects with an AbortError when the signal fires", async () => {
    const controller = new AbortController();
    const promise = httpClient.upload(PATH, new FormData(), { signal: controller.signal });

    controller.abort();

    expect(lastXhr().wasAborted).toBe(true);
    const error = await promise.then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe("AbortError");
  });

  it("rejects with a status-0 HttpError on a network error", async () => {
    const promise = httpClient.upload(PATH, new FormData());
    lastXhr().emit("error");

    const error = await promise.then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(0);
  });

  it("refreshes tokens on a 401 and retries once with the new access token", async () => {
    document.cookie = "refresh_token=refTok; path=/";
    const newJwt = fakeJwt(Math.floor(Date.now() / 1000) + 3600);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: newJwt, refresh_token: "opaque2" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const promise = httpClient.upload<{ id: string }>(PATH, new FormData());
    lastXhr().respond(401, { message: "Unauthorized", statusCode: 401 });

    await vi.waitFor(() => expect(FakeXHR.instances).toHaveLength(2));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/refresh$/),
      expect.anything(),
    );

    const retried = lastXhr();
    expect(retried.headers["Authorization"]).toBe(`Bearer ${newJwt}`);
    retried.respond(201, { id: "a1" });
    await expect(promise).resolves.toEqual({ id: "a1" });
  });

  it("clears tokens and rejects with 401 Session expired when the refresh fails", async () => {
    document.cookie = "refresh_token=refTok; path=/";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      }),
    );

    const promise = httpClient.upload(PATH, new FormData());
    lastXhr().respond(401, { message: "Unauthorized", statusCode: 401 });

    const error = await promise.then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(401);
    expect((error as HttpError).message).toBe("Session expired");
    expect(FakeXHR.instances).toHaveLength(1);
    expect(document.cookie).not.toContain("access_token=tok123");
  });
});
