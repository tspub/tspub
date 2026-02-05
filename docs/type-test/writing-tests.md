# Writing Type Tests

## Assertions

Import from `tspub/test-d`:

```typescript
import { expectType, expectNotType, expectAssignable, expectNever, expectAny } from "tspub/test-d";
```

### `expectType<T>(value)`

Assert that `value` is exactly type `T`:

```typescript
import { expectType } from "tspub/test-d";
import { myFn } from "../dist/index.js";

expectType<string>(myFn("hello"));
```

### `expectNotType<T>(value)`

Use with `@ts-expect-error` to assert a type mismatch:

```typescript
import { expectNotType } from "tspub/test-d";

// @ts-expect-error — string is not number
expectNotType<number>("hello");
```

### `expectAssignable<T>(value)`

Assert that `value` is assignable to type `T` (allows subtypes):

```typescript
import { expectAssignable } from "tspub/test-d";

expectAssignable<{ name: string }>({ name: "test", extra: true });
```

### `expectNever<T>(value)`

Assert that a type is `never`:

```typescript
import { expectNever } from "tspub/test-d";

type Result = Extract<string, number>; // never
expectNever<Result>(null as never);
```

### `expectAny<T>(value)`

Assert that a type is `any`:

```typescript
import { expectAny } from "tspub/test-d";

declare const x: any;
expectAny(x);
```

## Testing Compile Errors

Use `@ts-expect-error` to verify that invalid usage causes a type error:

```typescript
import { myFn } from "../dist/index.js";

// @ts-expect-error — should not accept number
myFn(42);

// @ts-expect-error — missing required argument
myFn();
```

If the line below `@ts-expect-error` does NOT cause an error, TypeScript will report an "unused `@ts-expect-error`" error — which is what we want.

## Custom Directory

```bash
tspub test-types --dir my-type-tests
```

Or in config:

```typescript
export default {
  check: {
    typeTests: {
      enabled: true,
      directory: "my-type-tests",
    },
  },
};
```
