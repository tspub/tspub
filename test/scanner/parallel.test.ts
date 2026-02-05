import { describe, it, expect } from "vitest";
import { parallelMap } from "../../src/scanner/index.js";

describe("parallelMap", () => {
  it("processes all items with concurrency=1 (sequential)", async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await parallelMap(items, 1, async (item) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return item * 2;
    });

    expect(results).toEqual([2, 4, 6, 8, 10]);
  });

  it("processes all items with concurrency=5 (parallel)", async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await parallelMap(items, 5, async (item) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return item * 2;
    });

    expect(results).toEqual([2, 4, 6, 8, 10]);
  });

  it("handles empty array", async () => {
    const results = await parallelMap([], 3, async (item) => {
      return item;
    });

    expect(results).toEqual([]);
  });

  it("maintains order of results", async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await parallelMap(items, 3, async (item) => {
      // Add random delay to simulate out-of-order completion
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));
      return item;
    });

    expect(results).toEqual([1, 2, 3, 4, 5]);
  });

  it("limits concurrent executions", async () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let currentConcurrent = 0;
    let maxConcurrent = 0;

    const results = await parallelMap(items, 3, async (item) => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

      await new Promise((resolve) => setTimeout(resolve, 20));

      currentConcurrent--;
      return item * 2;
    });

    expect(results).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
    expect(maxConcurrent).toBeLessThanOrEqual(3);
    expect(maxConcurrent).toBeGreaterThan(1); // Should have used parallelism
  });

  it("handles concurrency greater than array length", async () => {
    const items = [1, 2, 3];
    const results = await parallelMap(items, 10, async (item) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return item * 2;
    });

    expect(results).toEqual([2, 4, 6]);
  });

  it("propagates errors from the function", async () => {
    const items = [1, 2, 3];

    await expect(
      parallelMap(items, 2, async (item) => {
        if (item === 2) {
          throw new Error("Test error");
        }
        return item * 2;
      })
    ).rejects.toThrow("Test error");
  });
});
