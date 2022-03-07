/// <reference types="node" />
export declare enum Types {
    ARRAY = "array",
    BOOLEAN = "boolean",
    NUMBER = "number",
    OBJECT = "object",
    SNOWFLAKE = "snowflake",
    STRING = "string"
}
export declare const Regexes: {
    snowflake: RegExp;
};
export declare function bufferToBase64(buffer?: Buffer | string | null): string | null | undefined;
export declare function verifyData(data: {
    [key: string]: any;
}, verification: {
    [key: string]: {
        required?: boolean;
        type?: string;
    };
}): void;
