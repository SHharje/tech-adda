// lib/withRetry.js
// ─────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// Neon's serverless Postgres can return HTTP 500 "Control plane request
// failed" errors during cold starts or brief infrastructure blips.
// The error always includes `"neon:retryable": true` signalling it is
// safe — and expected — to retry automatically.
//
// This helper wraps any async operation with exponential backoff so
// every database call in the project handles these transient errors
// transparently without cluttering individual route files.
// ─────────────────────────────────────────────────────────────────────

/**
 * Determines if a thrown error is a retryable Neon control-plane error.
 *
 * Real error shape from Prisma's pg adapter (DriverAdapterError):
 *   error.name              === 'DriverAdapterError'  (or includes it)
 *   error.message           === 'Control plane request failed'
 *   error.cause.kind        === 'postgres'
 *   error.cause.code        === 'XX000'   (Postgres internal error code)
 *   error.cause.originalCode === 'XX000'
 *   error.cause.originalMessage === 'Control plane request failed'
 *
 * We also handle the HTTP-driver variant that embeds a JSON flag, and
 * plain HTTP 500/503 status codes returned by the Neon HTTP proxy.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
function isRetryable(error) {
  if (!error) return false;

  // ── 1. DriverAdapterError from @prisma/adapter-pg (most common case)
  //    This is thrown when the pg driver surfaces a Postgres-level error
  //    before Prisma's query layer even sees it.
  const name = error?.name ?? "";
  if (name === "DriverAdapterError" || name.includes("DriverAdapter")) {
    return true; // Neon only sends XX000 for transient control-plane errors
  }

  // ── 2. Postgres error code XX000 — "internal error" used exclusively
  //    by Neon's control plane for transient blips.
  const code = error?.code ?? error?.cause?.code ?? "";
  const originalCode = error?.originalCode ?? error?.cause?.originalCode ?? "";
  if (code === "XX000" || originalCode === "XX000") return true;

  // ── 3. Keyword match in message / originalMessage
  const message = typeof error?.message === "string" ? error.message : "";
  const originalMessage =
    typeof error?.cause?.originalMessage === "string"
      ? error.cause.originalMessage
      : "";
  if (
    message.includes("Control plane request failed") ||
    originalMessage.includes("Control plane request failed") ||
    message.includes('"neon:retryable":true')
  )
    return true;

  // ── 4. HTTP status codes (503 Service Unavailable is also retryable)
  const status = error?.response?.status ?? error?.status ?? error?.statusCode;
  if (status === 500 || status === 503) return true;

  // ── 5. Walk the cause chain one more level
  if (error?.cause && error.cause !== error) return isRetryable(error.cause);

  return false;
}

/**
 * Executes `fn` with exponential backoff retries.
 *
 * @template T
 * @param {() => Promise<T>} fn          - The async operation to execute.
 * @param {object}           [options]
 * @param {number}           [options.maxAttempts=4]    - Total attempts (1 = no retry).
 * @param {number}           [options.baseDelayMs=300]  - Initial wait before first retry.
 * @param {number}           [options.maxDelayMs=5000]  - Cap for the exponential wait.
 * @returns {Promise<T>}
 */
export async function withRetry(fn, options = {}) {
  const { maxAttempts = 4, baseDelayMs = 300, maxDelayMs = 5000 } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const retryable = isRetryable(error);
      const isLastAttempt = attempt === maxAttempts;

      console.warn(
        `[withRetry] Attempt ${attempt}/${maxAttempts} failed.`,
        retryable ? "(retryable)" : "(non-retryable)",
        error?.message ?? error
      );

      // Stop immediately for non-retryable errors or if we're out of attempts
      if (!retryable || isLastAttempt) break;

      // Exponential backoff with full jitter to avoid thundering herd
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * baseDelayMs;
      const delay = Math.min(exponentialDelay + jitter, maxDelayMs);

      console.info(`[withRetry] Waiting ${Math.round(delay)}ms before retry…`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
