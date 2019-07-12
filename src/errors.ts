import { Response } from 'detritus-rest';

class BaseError extends Error {

}

export class HTTPError extends BaseError {
  code: any
  response: Response;

  constructor(response: Response, message?: string, code?: any) {
    let httpMessage = `HTTP Exception: ${response.statusCode}`;
    if (message) {
      httpMessage += ` (${message})`;
    }

    super(httpMessage);
    this.code = code;
    this.response = response;
  }
}
