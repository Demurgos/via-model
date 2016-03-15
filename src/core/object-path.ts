import * as _ from "lodash";

export type ObjectPath = Array<string | number>;

export function get(obj: any, path: ObjectPath): any {
  let curObj = obj;
  for (let i = 0, l = path.length; i < l; i++) {
    let curPart = path[i];
    curObj = curObj[curPart];
  }
  return curObj;
}

export function set(obj: any, path: ObjectPath, value: any): any {
  let curObj = obj;
  for (let i = 0, l = path.length; i < l - 1; i++) {
    let curPart = path[i];
    curObj = curObj[curPart];
  }

  let lastPart = path[path.length - 1];
  curObj[lastPart] = value;

  return obj;
}

export function has(obj: any, path: ObjectPath): any {
  return true; // TODO(Charles)
}

export function parse(path: string): ObjectPath {
  return [];
}

export function stringify (path: ObjectPath): string {
  if (_.isString(path)) {
    return <string> path;
  }
  var str = [];
  var part;
  var separator;
  for (var i=0, l=path.length; i<l; i++) {
    part = path[i];
    separator = i > 0 ? "." : "";
    if (part === null) {
      str.push('[]')
    } else if(typeof part === 'number'){
      str.push('['+part+']')
    } else {
      str.push(separator + part)
    }
  }
  return str.join('')
}
