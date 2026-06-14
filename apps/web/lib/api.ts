import type { ApiResponse } from "@wander/shared";
import { NextResponse } from "next/server";
import type { z } from "zod";

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json<ApiResponse<T>>({ ok: true, data }, { status });
}

export function err(code: string, message: string, status = 400): NextResponse {
  return NextResponse.json<ApiResponse<never>>(
    { ok: false, error: { code, message } },
    { status },
  );
}

export const unauthorized = () =>
  err("unauthorized", "You must be signed in.", 401);
export const forbidden = () =>
  err("forbidden", "You don't have access to this.", 403);
export const notFound = (message = "Not found.") =>
  err("not_found", message, 404);
export const serverError = (message = "Something went wrong.") =>
  err("server_error", message, 500);

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

/** Read + validate a JSON body against a Zod schema, returning a typed result. */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: err("invalid_json", "Body must be valid JSON."),
    };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues
      .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      .join("; ");
    return { ok: false, response: err("invalid_body", message, 422) };
  }
  return { ok: true, data: result.data };
}
