"use strict";
var _ = require("lodash");
function get(obj, path) {
    var curObj = obj;
    for (var i = 0, l = path.length; i < l; i++) {
        var curPart = path[i];
        curObj = curObj[curPart];
    }
    return curObj;
}
exports.get = get;
function set(obj, path, value) {
    var curObj = obj;
    for (var i = 0, l = path.length; i < l - 1; i++) {
        var curPart = path[i];
        curObj = curObj[curPart];
    }
    var lastPart = path[path.length - 1];
    curObj[lastPart] = value;
    return obj;
}
exports.set = set;
function has(obj, path) {
    return true; // TODO(Charles)
}
exports.has = has;
function parse(path) {
    if (Array.isArray(path)) {
        return path;
    }
    if (path.length === 0) {
        throw new Error("Unable to parse empty string");
    }
    return path.split(".").map(function (str) { return /^-?\d+$/.test(str) ? parseInt(str, 10) : str; });
}
exports.parse = parse;
function stringify(path) {
    if (_.isString(path)) {
        return path;
    }
    return path.join('.');
    // let str: string[] = [];
    // let part: string | number;
    // let separator: string;
    // for (var i=0, l=path.length; i<l; i++) {
    //   part = path[i];
    //   separator = i > 0 ? "." : "";
    //   if (part === null) {
    //     str.push('[]')
    //   } else if(typeof part === 'number'){
    //     str.push('['+part+']')
    //   } else {
    //     str.push(separator + part)
    //   }
    // }
    // return str.join('')
}
exports.stringify = stringify;
