/**
 * Retry utility for operations that may fail temporarily
 */

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;  // in milliseconds
  backoffMultiplier: number;  // exponential backoff multiplier
  shouldRetry?: (error: unknown) => boolean;  // Custom retry condition
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,  // 1 second
  backoffMultiplier: 2,  // Double the delay each time
};

/**
 * Retry an async operation with exponential backoff
 *
 * @example
 * const result = await retry(
 *   () => fetchData(),
 *   { maxRetries: 3, initialDelay: 1000 }
 * );
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetry = opts.shouldRetry ? opts.shouldRetry(error) : true;
      if (!shouldRetry || attempt === opts.maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError;
}

/**
 * Check if an error is network-related
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('etimedout') ||
      message.includes('fetch failed')
    );
  }
  return false;
}

/**
 * Check if an error is a temporary git error
 */
export function isTemporaryGitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('lock') ||
      message.includes('locked') ||
      message.includes('unable to access') ||
      message.includes('could not resolve') ||
      message.includes('network') ||
      message.includes('timeout')
    );
  }
  return false;
}

/**
 * Retry with specific options for git operations
 */
export async function retryGitOperation<T>(operation: () => Promise<T>): Promise<T> {
  return retry(operation, {
    maxRetries: 2,
    initialDelay: 500,
    backoffMultiplier: 2,
    shouldRetry: isTemporaryGitError,
  });
}

/**
 * Retry with specific options for network operations (AI calls, etc.)
 */
export async function retryNetworkOperation<T>(operation: () => Promise<T>): Promise<T> {
  return retry(operation, {
    maxRetries: 3,
    initialDelay: 2000,
    backoffMultiplier: 2,
    shouldRetry: isNetworkError,
  });
}

/**
 * Retry with specific options for git push operations
 * Uses 4 retries with exponential backoff: 2s, 4s, 8s, 16s
 */
export async function retryGitPush<T>(operation: () => Promise<T>): Promise<T> {
  return retry(operation, {
    maxRetries: 4,
    initialDelay: 2000,
    backoffMultiplier: 2,
    shouldRetry: isNetworkError, // Push failures are typically network-related
  });
}
