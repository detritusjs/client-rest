import { SPOILER_ATTACHMENT_PREFIX } from './constants';
import { RequestTypes } from './types';


export function spoilerfy(file: RequestTypes.File): RequestTypes.File {
  if (file.filename && !file.filename.startsWith(SPOILER_ATTACHMENT_PREFIX)) {
    file.filename = `${SPOILER_ATTACHMENT_PREFIX}${file.filename}`;
  }
  return file;
}
