// Side-effect: esbuild inject shims referenced globals
(globalThis as Record<string, unknown>)["__INJECTED__"] = true;
