export {};

declare global {
  interface Window {
    ttq?: {
      page?: () => void;
      track?: (event: string, properties?: Record<string, unknown>) => void;
    };
  }
}











