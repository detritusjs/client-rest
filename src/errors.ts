import { Response } from 'detritus-rest';

import { RatelimitHeaders } from './constants';

class BaseError extends Error {

}

// a proxy's html error page can be kilobytes long, keep the message readable (the full body stays on `error.body`)
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
    super(response, raw.message, raw.code);
    this.code = raw.code;
    this.errors = raw.errors;
    this.raw = raw;
  }
}
