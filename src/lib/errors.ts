// Phase 2.4: Centralized error sanitization
// Shows generic messages to users in production, full details in development.

export function getSafeErrorMessage(err: unknown): string {
  const isDev = import.meta.env.DEV;

  let raw = "Unexpected error.";
  if (err instanceof Error) {
    raw = err.message;
  } else if (typeof err === "string") {
    raw = err;
  } else if (err && typeof err === "object") {
    const { message, details, hint } = err as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    const parts: string[] = [];
    if (typeof message === "string") parts.push(message);
    if (typeof details === "string") parts.push(details);
    if (typeof hint === "string") parts.push(hint);
    if (parts.length) {
      raw = parts.join(" ");
    } else {
      try {
        raw = JSON.stringify(err);
      } catch {
        // keep default
      }
    }
  }

  if (isDev) {
    return raw;
  }

  const lower = raw.toLowerCase();
  if (lower.includes("duplicate") || lower.includes("unique")) {
    return "A record with that identifier already exists.";
  }
  if (lower.includes("permission") || lower.includes("policy") || lower.includes("rls")) {
    return "You do not have permission to perform this action.";
  }
  if (lower.includes("not found") || lower.includes("no rows")) {
    return "The requested record was not found.";
  }
  if (lower.includes("foreign key") || lower.includes("violates")) {
    return "This record is referenced by other data and cannot be modified.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "A network error occurred. Please check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}
