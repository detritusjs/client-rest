export const Types = Object.freeze({
  ARRAY: 'array',
  BOOLEAN: 'boolean',
  NUMBER: 'number',
  OBJECT: 'object',
  SNOWFLAKE: 'snowflake',
  STRING: 'string',
});

export const Regexes = {
  [Types.SNOWFLAKE]: /^\d+|@me$/,
};

export function bufferToBase64(
  buffer?: Buffer | string | null,
): string | null | undefined {
  if (buffer instanceof Buffer) {
    const mimetype = 'image/png';
    // just put image/png for now, discord checks it afterwards anyways
    return `data:${mimetype},base64,${buffer.toString('base64')}`;
  }
  return buffer;
}

export function verifyData(data: {
  [key: string]: any,
}, verification: {
  [key: string]: {
    required?: boolean,
    type?: string,
  },
}): void {
  const verified = {};
  for (let key in verification) {
    const valueOptions = verification[key];
    if (!(key in data) || data[key] === undefined) {
      if (valueOptions.required) {
        throw new Error(`${key} is required.`);
      }
      continue;
    }

    let value = data[key];
    switch (valueOptions.type) {
      case Types.ARRAY: {
        if (!Array.isArray(value)) {
          throw new Error(`${key} has to be an array.`);
        }
      }; break;
      case Types.BOOLEAN: {
        value = Boolean(value);
      }; break;
      case Types.NUMBER: {
        value = parseInt(value);
        if (value === NaN) {
          throw new Error(`${key} has to be an integer.`);
        }
      }; break;
      case Types.OBJECT: {
        if (typeof(value) !== Types.OBJECT) {
          throw new Error(`${key} has to be an object.`);
        }
      }; break;
      case Types.SNOWFLAKE: {
        if (typeof(value) !== Types.STRING && typeof(value) !== Types.NUMBER) {
          if (!Regexes[Types.SNOWFLAKE].exec(value)) {
            throw new Error(`${key} has to be a snowflake.`);
          }
        }
      }; break;
      case Types.STRING: {
        value = String(value);
      }; break;
    }
    data[key] = value;
  }
}
