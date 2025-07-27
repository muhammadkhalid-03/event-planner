import { create } from "zustand";

export interface LLMResponse {
  response: string;
  setResponse: (response: string) => void;
}

export const useLLMStore = create<LLMResponse>((set) => ({
  response: "",
  setResponse: (response: string) => set({ response }),
}));
