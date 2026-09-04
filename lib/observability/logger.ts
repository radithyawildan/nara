type LogLevel = "debug" | "info" | "warn" | "error";

const SECRET_KEYS = [
  "authorization",
  "cookie",
  "password",
  "token",
  "secret",
  "api_key",
  "apikey",
  "service_role",
];

function looksSensitive(key: string) {
  const normalized = key.toLowerCase();

  return SECRET_KEYS.some((secretKey) => normalized.includes(secretKey));
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[truncated]";
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => sanitizeValue(entry, depth + 1));
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      output[key] = looksSensitive(key)
        ? "[redacted]"
        : sanitizeValue(entry, depth + 1);
    }

    return output;
  }

  if (typeof value === "string" && value.length > 2_000) {
    return `${value.slice(0, 1_997)}...`;
  }

  return value;
}

function write(level: LogLevel, message: string, metadata?: unknown) {
  if (level === "debug" && process.env.NODE_ENV !== "development") {
    return;
  }

  const payload = metadata === undefined ? undefined : sanitizeValue(metadata);

  const prefix = `[NARA] ${message}`;

  if (level === "error") {
    console.error(prefix, payload ?? "");
    return;
  }

  if (level === "warn") {
    console.warn(prefix, payload ?? "");
    return;
  }

  if (level === "debug") {
    console.debug(prefix, payload ?? "");
    return;
  }

  console.info(prefix, payload ?? "");
}

export const naraLogger = {
  debug(message: string, metadata?: unknown) {
    write("debug", message, metadata);
  },
  info(message: string, metadata?: unknown) {
    write("info", message, metadata);
  },
  warn(message: string, metadata?: unknown) {
    write("warn", message, metadata);
  },
  error(message: string, metadata?: unknown) {
    write("error", message, metadata);
  },
};
