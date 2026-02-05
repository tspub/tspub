/**
 * Type test assertion helpers for tspub.
 *
 * These functions are no-ops at runtime. They only have meaning at compile time
 * when tsc checks the types of the arguments.
 *
 * Usage in .test-d.ts files:
 * ```ts
 * import { expectType, expectAssignable } from "tspub/test-d";
 * import { myFn } from "./dist/index.js";
 *
 * expectType<string>(myFn("hello"));
 *
 * // @ts-expect-error — should not accept number
 * myFn(42);
 * ```
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function expectType<T>(_value: T): void {}

/**
 * Assert that a value is NOT of type T.
 * Use with @ts-expect-error on the line above to verify a type mismatch.
 *
 * @example
 * // @ts-expect-error — string is not number
 * expectNotType<number>("hello");
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function expectNotType<T>(_value: T): void {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function expectAssignable<T>(_value: T): void {}

/**
 * Assert that a type is exactly `never`.
 *
 * @example
 * type Result = Extract<string, number>; // never
 * expectNever<Result>(null as never);
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function expectNever<T extends never>(_value: T): void {}

/**
 * Assert that a type is `any`.
 * Uses the conditional type trick: `0 extends (1 & T)` is only true when T is `any`.
 *
 * @example
 * declare const x: any;
 * expectAny(x);
 *
 * Use `@ts-expect-error` to verify non-any types fail:
 * // @ts-expect-error — string is not any
 * expectAny("hello" as string);
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function expectAny<T>(_value: 0 extends (1 & T) ? T : never): void {}
