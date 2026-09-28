import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * API response conventions (see docs/ARCHITECTURE.md):
 *   Success: { data: T, meta?: {...} }
 *   Error:   { error: { code: string, message: string, details?: unknown } }
 */

export type ApiMeta = Record<string, unknown>;

/**
 * Typed error that route handlers can throw. `handleError` turns it into the
 * standard error response with the right HTTP status.
 */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = "Invalid request", details?: unknown) {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }
  static unauthorized(message = "Not authenticated") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }
  static forbidden(message = "Forbidden") {
    return new ApiError(403, "FORBIDDEN", message);
  }
  static notFound(message = "Not found") {
    return new ApiError(404, "NOT_FOUND", message);
  }
  static conflict(message = "Conflict", details?: unknown) {
    return new ApiError(409, "CONFLICT", message, details);
  }
  static server(message = "Internal server error") {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }
}

/** Build a success response: `{ data, meta? }`. */
export function ok<T>(data: T, meta?: ApiMeta, status = 200) {
  return NextResponse.json(meta ? { data, meta } : { data }, { status });
}

/** Build an error response: `{ error: { code, message, details? } }`. */
export function fail(
  status: number,
  code: string,
  message: string,
  details?: unknown
) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

/**
 * Wrap a route handler so any thrown error becomes the standard error shape.
 * Usage: export const GET = (req) => handleError(async () => { ... });
 */
export async function handleError(
  fn: () => Promise<Response> | Response
): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) {
      return fail(err.status, err.code, err.message, err.details);
    }
    if (err instanceof ZodError) {
      return fail(400, "VALIDATION_ERROR", "Validation failed", err.issues);
    }
    console.error("Unhandled API error:", err);
    return fail(500, "INTERNAL_ERROR", "Internal server error");
  }
}
