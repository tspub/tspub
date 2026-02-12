import { describe, it, expect, vi, afterEach } from "vitest";
import { logger } from "../../src/shared/logger.js";

afterEach(() => {
  logger.setLevel("normal");
  vi.restoreAllMocks();
});

describe("setLevel / getLevel", () => {
  it("returns the level that was set", () => {
    logger.setLevel("silent");
    expect(logger.getLevel()).toBe("silent");
  });
});

describe("normal mode", () => {
  it("info calls console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("hello");
    expect(spy).toHaveBeenCalled();
  });

  it("success calls console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.success("done");
    expect(spy).toHaveBeenCalled();
  });

  it("warn calls console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.warn("careful");
    expect(spy).toHaveBeenCalled();
  });

  it("error calls console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.error("bad");
    expect(spy).toHaveBeenCalled();
  });

  it("ok calls console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.ok("fine");
    expect(spy).toHaveBeenCalled();
  });

  it("heading calls console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.heading("title");
    expect(spy).toHaveBeenCalled();
  });

  it("dim calls console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.dim("faint");
    expect(spy).toHaveBeenCalled();
  });
});

describe("silent mode", () => {
  it("suppresses all output methods", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.setLevel("silent");
    logger.info("hidden");
    logger.success("hidden");
    logger.warn("hidden");
    logger.error("hidden");
    logger.ok("hidden");
    logger.heading("hidden");
    logger.dim("hidden");
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("verbose", () => {
  it("does not call console.log in normal mode", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.verbose("detail");
    expect(spy).not.toHaveBeenCalled();
  });

  it("calls console.log in verbose mode", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.setLevel("verbose");
    logger.verbose("detail");
    expect(spy).toHaveBeenCalled();
  });
});
