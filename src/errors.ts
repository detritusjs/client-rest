import { Response } from 'detritus-rest';

import { RatelimitHeaders } from './constants';

class BaseError extends Error {

}

export class HTTPError extends BaseError {
  code: any;
  ratelimitScope?: string;
  response: Response;

  constructor(response: Response, message?: string, code?: any) {
    let httpMessage = `HTTP Exception: ${response.statusCode}`;
    if (message) {
      httpMessage += ` (${message})`;
    }

    super(httpMessage);
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
