export {};

declare global {
  interface Window {
    configAPI: {
      update: (config: {
        workMin: number;
        breakMin: number;
        autoLaunch: boolean;
      }) => Promise<void>;
      get: () => Promise<{
        workMin: number;
        breakMin: number;
        autoLaunch: boolean;
        nextBreakTime: number;
      }>;
      onNextRestTime: (cb: (time: number) => void) => void;
    };
    breakAPI: {
      close: () => Promise<void>;
      prepare: () => Promise<void>;
    };
  }
}
