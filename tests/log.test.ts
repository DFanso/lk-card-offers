import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { log } from "@/lib/log";

describe("log", () => {
  let stdout: ReturnType<typeof vi.spyOn>;
  let stderr: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdout = vi.spyOn(console, "log").mockImplementation(() => {});
    stderr = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    stdout.mockRestore();
    stderr.mockRestore();
  });

  it("emits info to stdout as JSON", () => {
    log.info("test_event", { foo: "bar" });
    expect(stdout).toHaveBeenCalledOnce();
    const line = stdout.mock.calls[0][0] as string;
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({
      level: "info",
      event: "test_event",
      foo: "bar",
    });
    expect(parsed.t).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("emits error to stderr with normalized err", () => {
    const err = new Error("boom");
    log.error("test_fail", { err, userId: "u1" });
    expect(stderr).toHaveBeenCalledOnce();
    const parsed = JSON.parse(stderr.mock.calls[0][0] as string);
    expect(parsed).toMatchObject({
      level: "error",
      event: "test_fail",
      userId: "u1",
      err: { name: "Error", message: "boom" },
    });
    expect(parsed.err.stack).toBeTypeOf("string");
  });

  it("normalizes non-Error err values", () => {
    log.warn("weird", { err: "string-error" });
    const parsed = JSON.parse(stderr.mock.calls[0][0] as string);
    expect(parsed.err).toEqual({ message: "string-error" });
  });
});
