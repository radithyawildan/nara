export const CHAT_MAX_BODY_BYTES = 512 * 1024;

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body is too large.");
    this.name = "RequestBodyTooLargeError";
  }
}

export class UnsupportedMediaTypeError extends Error {
  constructor() {
    super("Expected application/json request body.");
    this.name = "UnsupportedMediaTypeError";
  }
}

function parseContentLength(request: Request) {
  const raw = request.headers.get("content-length");

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function readJsonWithLimit(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType && !contentType.includes("application/json")) {
    throw new UnsupportedMediaTypeError();
  }

  const declaredLength = parseContentLength(request);

  if (declaredLength !== null && declaredLength > maxBytes) {
    throw new RequestBodyTooLargeError();
  }

  const reader = request.body?.getReader();

  if (!reader) {
    return request.json();
  }

  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    size += value.byteLength;

    if (size > maxBytes) {
      await reader.cancel();
      throw new RequestBodyTooLargeError();
    }

    chunks.push(value);
  }

  const merged = new Uint8Array(size);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder().decode(merged);

  return JSON.parse(text);
}
