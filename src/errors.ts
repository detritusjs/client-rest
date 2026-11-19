import { Response } from 'detritus-rest';

import { RatelimitHeaders, RefusalReasons } from './constants';

class BaseError extends Error {

}


/**
 * Thrown when the client refuses to send a request, nothing reached discord
 * `retryAfter` is ms until the refusing state clears (`undefined` when it doesn't clear by itself)
 */
export class RequestRefusedError extends BaseError {
  reason: RefusalReasons;
  retryAfter?: number;

  constructor(reason: RefusalReasons, message: string, retryAfter?: number) {
    super(message);
    this.reason = reason;
    this.retryAfter = retryAfter;
  }
}

// a proxy's html error page can be kilobytes long, the full body stays on `error.body`
const HTTP_ERROR_MESSAGE_MAX_LENGTH = 256;

export class HTTPError extends BaseError {
  body?: any;
  code: any;
  ratelimitScope?: string;
  response: Response;

  constructor(response: Response, message?: string, code?: any, body?: any) {
    let httpMessage = `HTTP Exception: ${response.statusCode}`;
    if (message) {
      message = String(message);
      if (HTTP_ERROR_MESSAGE_MAX_LENGTH < message.length) {
        message = `${message.slice(0, HTTP_ERROR_MESSAGE_MAX_LENGTH)}...`;
      }
      httpMessage += ` (${message})`;
    }

    super(httpMessage);
    this.body = body;
    this.code = code;
    this.ratelimitScope = response.headers.get(RatelimitHeaders.SCOPE) || undefined;
    this.response = response;
  }
}



export interface DiscordHTTPValueErrorBody {
  code: string,
  message: string,
}

export interface DiscordHTTPValueError {
  _errors?: Array<DiscordHTTPValueErrorBody>,
  [key: string]: DiscordHTTPValueError | Array<DiscordHTTPValueErrorBody> | undefined,
}

export interface DiscordHTTPErrorOptions {
  code: number,
  errors?: DiscordHTTPValueError,
  message: string,
}

export class DiscordHTTPError extends HTTPError {
  code: number;
  errors?: DiscordHTTPValueError;
  raw: DiscordHTTPErrorOptions;

  constructor(response: Response, raw: DiscordHTTPErrorOptions) {
    // `raw` is kept for compatibility
    super(response, raw.message, raw.code, raw);
    this.code = raw.code;
    this.errors = raw.errors;
    this.raw = raw;
  }
}
