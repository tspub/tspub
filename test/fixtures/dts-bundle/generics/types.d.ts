export interface Result<T, E = Error> {
    ok: boolean;
    value?: T;
    error?: E;
}
export type Awaitable<T> = T | Promise<T>;
export type IsString<T> = T extends string ? true : false;
export type Keys<T> = {
    [K in keyof T]: K;
}[keyof T];
export type EventName = `on${Capitalize<string>}`;
export type InferArray<T> = T extends Array<infer U> ? U : never;
