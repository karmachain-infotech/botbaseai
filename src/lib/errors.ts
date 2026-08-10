export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly userMessage: string;

  constructor(opts: {
    code: string;
    message: string;
    userMessage: string;
    statusCode?: number;
  }) {
    super(opts.message);
    this.name = "AppError";
    this.code = opts.code;
    this.statusCode = opts.statusCode ?? 500;
    this.userMessage = opts.userMessage;
  }

  toJSON() {
    return {
      error: this.userMessage,
      code: this.code,
    };
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super({
      code: "NOT_FOUND",
      message: `${resource} not found`,
      userMessage: `${resource} not found`,
      statusCode: 404,
    });
    this.name = "NotFoundError";
  }
}

export class AuthError extends AppError {
  constructor(userMessage = "You must be signed in to perform this action") {
    super({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      userMessage,
      statusCode: 401,
    });
    this.name = "AuthError";
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super({
      code: "RATE_LIMITED",
      message: "Too many requests",
      userMessage: "Too many requests. Please slow down.",
      statusCode: 429,
    });
    this.name = "RateLimitError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super({
      code: "VALIDATION_ERROR",
      message,
      userMessage: message,
      statusCode: 400,
    });
    this.name = "ValidationError";
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super({
      code: "DATABASE_ERROR",
      message,
      userMessage: "A database error occurred. Please try again.",
      statusCode: 500,
    });
    this.name = "DatabaseError";
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    userMessage = `${service} service is currently unavailable. Please try again.`,
  ) {
    super({
      code: "EXTERNAL_SERVICE_ERROR",
      message: `${service} API error`,
      userMessage,
      statusCode: 502,
    });
    this.name = "ExternalServiceError";
  }
}

export function handleServerError(error: unknown, context?: string): never {
  const prefix = context ? `[${context}] ` : "";

  if (error instanceof AppError) {
    console.error(`${prefix}${error.message}`);
    throw error;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(`${prefix}${message}`, error);

  throw new AppError({
    code: "INTERNAL_ERROR",
    message,
    userMessage: "Something went wrong. Please try again.",
  });
}
