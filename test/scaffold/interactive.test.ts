import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/scaffold/prompts.js", () => ({
  promptInit: vi.fn().mockResolvedValue({
    name: "test-pkg",
    dualPublish: false,
    react: false,
    author: "Test Author",
    description: "A test package",
    license: "MIT" as const,
  }),
}));

describe("scaffold interactive", () => {
  it("promptInit returns expected answers", async () => {
    const { promptInit } = await import("../../src/scaffold/prompts.js");
    const answers = await promptInit();
    expect(answers.name).toBe("test-pkg");
    expect(answers.license).toBe("MIT");
    expect(answers.dualPublish).toBe(false);
  });
});
