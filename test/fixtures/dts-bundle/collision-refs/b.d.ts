export interface Payload {
    count: number;
}
export type Handler = (input: Payload) => void;
