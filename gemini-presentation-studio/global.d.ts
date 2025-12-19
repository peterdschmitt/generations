declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey?: () => boolean | Promise<boolean>;
      openSelectKey?: () => void | Promise<void>;
    };
  }
}

export {};
