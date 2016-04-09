export declare type ObjectPath = Array<string | number>;
export declare function get(obj: any, path: ObjectPath): any;
export declare function set(obj: any, path: ObjectPath, value: any): any;
export declare function has(obj: any, path: ObjectPath): any;
export declare function parse(path: string | ObjectPath): ObjectPath;
export declare function stringify(path: ObjectPath): string;
