export {};

declare global {
  interface Window {
    ttq?: {
      page?: (...args: any[]) => void;
      track?: (event: string, props?: Record<string, unknown>) => void;
      identify?: (props?: Record<string, unknown>) => void;
    };
  }
}




