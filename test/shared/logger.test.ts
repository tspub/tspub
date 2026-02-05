import { describe, it, expect, vi, afterEach } from "vitest";
import { logger } from "../../src/shared/logger.js";

afterEach(() => {
  logger.setLevel("normal");
  vi.restoreAllMocks();
});

describe("logger levels", () => {
  it("verbose messages only show in verbose mode", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.verbose("test");
    expect(spy).not.toHaveBeenCalled();

    logger.setLevel("verbose");
    logger.verbose("test");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("silent mode suppresses all output including errors", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.setLevel("silent");
    logger.info("hidden");
    logger.success("hidden");
    logger.warn("hidden");
    logger.error("hidden");
    expect(spy).not.toHaveBeenCalled();
  });
});
