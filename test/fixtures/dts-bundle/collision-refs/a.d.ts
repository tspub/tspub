export interface Payload {
    data: string;
}
export type Handler = (input: Payload) => void;
