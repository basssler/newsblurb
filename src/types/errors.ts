/**
 * Structured error types for consistent error handling across the application
 */

export type ErrorType = 'NETWORK' | 'INVALID_TICKER' | 'RATE_LIMIT' | 'API_ERROR' | 'TIMEOUT' | 'PARSE_ERROR' | 'VALIDATION_ERROR';

export interface AnalysisError {
  type: ErrorType;
  message: string;
  userMessage: string; // User-friendly message
  retryable: boolean;
  retryAfter?: number; // seconds
  suggestion?: string; // Suggested action for user
  statusCode?: number;
}

/**
 * Create a structured error from various input types
 */
export function createAnalysisError(
  type: ErrorType,
  message: string,
  options: Partial<AnalysisError> = {}
): AnalysisError {
  const defaultMessages: Record<ErrorType, { user: string; suggestion: string }> = {
    NETWORK: {
      user: 'Connection lost. Check your internet and try again.',
      suggestion: 'Verify your internet connection and retry.',
    },
    INVALID_TICKER: {
      user: 'Ticker not found. Please check the symbol and try again.',
      suggestion: 'Use a valid stock ticker (e.g., AAPL, MSFT, TSLA).',
    },
    RATE_LIMIT: {
      user: 'Daily API limit reached. Please try again in a few minutes.',
      suggestion: 'Wait a few minutes and try your analysis again.',
    },
    API_ERROR: {
      user: 'Service temporarily unavailable. We\'re working on it!',
      suggestion: 'Try again in a moment.',
    },
    TIMEOUT: {
      user: 'Analysis took too long. Please try again with a shorter time period.',
      suggestion: 'Try a shorter time horizon (Intraday or 1-Week).',
    },
    PARSE_ERROR: {
      user: 'Failed to process analysis data. Please try again.',
      suggestion: 'Try refreshing the page and analyzing again.',
    },
    VALIDATION_ERROR: {
      user: 'Invalid input. Please check your selections and try again.',
      suggestion: 'Verify all form fields are filled correctly.',
    },
  };

  const defaults = defaultMessages[type];

  return {
    type,
    message,
    userMessage: options.userMessage || defaults.user,
    retryable: options.retryable !== undefined ? options.retryable : type !== 'VALIDATION_ERROR',
    retryAfter: options.retryAfter,
    suggestion: options.suggestion || defaults.suggestion,
    statusCode: options.statusCode,
  };
}

/**
 * Parse fetch error responses into structured errors
 */
export function parseApiError(response: any, defaultType: ErrorType = 'API_ERROR'): AnalysisError {
  if (response instanceof TypeError) {
    return createAnalysisError('NETWORK', response.message);
  }

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers?.get('retry-after') || '60', 10);
    return createAnalysisError('RATE_LIMIT', 'Rate limit exceeded', {
      retryable: true,
      retryAfter,
      statusCode: 429,
    });
  }

  if (response.status === 400) {
    return createAnalysisError('VALIDATION_ERROR', response.message || 'Invalid input', {
      statusCode: 400,
    });
  }

  if (response.status === 404) {
    return createAnalysisError('INVALID_TICKER', response.message || 'Ticker not found', {
      statusCode: 404,
    });
  }

  if (response.status >= 500) {
    return createAnalysisError('API_ERROR', response.message || 'Server error', {
      statusCode: response.status,
    });
  }

  return createAnalysisError(defaultType, response.message || 'Unknown error');
}

/**
 * Check if error is retryable
 */
export function isRetryable(error: AnalysisError): boolean {
  return error.retryable && error.type !== 'VALIDATION_ERROR';
}

/**
 * Get retry delay in milliseconds
 */
export function getRetryDelay(error: AnalysisError): number {
  if (error.type === 'RATE_LIMIT' && error.retryAfter) {
    return error.retryAfter * 1000;
  }
  // Default exponential backoff
  return Math.random() * 1000 + 1000; // 1-2 seconds
}
