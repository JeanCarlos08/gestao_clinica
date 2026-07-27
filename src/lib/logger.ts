type LogLevel = "debug" | "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function createLogger(name: string) {
  const minLevel = (process.env.LOG_LEVEL?.toLowerCase() || "info") as LogLevel;
  const threshold = levelOrder[minLevel] ?? 1;

  return {
    debug: (...args: unknown[]) => { if (threshold <= 0) console.debug(`[${name}]`, ...args); },
    info: (...args: unknown[]) => { if (threshold <= 1) console.log(`[${name}]`, ...args); },
    warn: (...args: unknown[]) => { if (threshold <= 2) console.warn(`[${name}]`, ...args); },
    error: (...args: unknown[]) => { if (threshold <= 3) console.error(`[${name}]`, ...args); },
  };
}

export function getLogger(name: string) {
  return createLogger(name);
}
