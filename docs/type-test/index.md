# Type Testing

Test your `.d.ts` type declarations to ensure they work correctly for consumers.

## Quick Start

1. Create a `test-d/` directory
2. Write `.test-d.ts` files
3. Run `tspub test-types`

```bash
tspub test-types
```

## Why Test Types?

Type declarations can break independently of runtime code:
- A refactor might widen a return type to `any`
- A generic might lose its constraint
- An overload might be removed

Type tests catch these regressions at CI time.
