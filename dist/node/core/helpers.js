"use strict";
// TODO: compatibility ?
function defineProperty(obj, prop, descriptor) {
    Object.defineProperty(obj, prop, descriptor);
    return obj;
}
exports.defineProperty = defineProperty;
// inspired from
// https://github.com/nrf110/deepmerge/blob/master/index.js
function deepMerge(target, src, mergeArrays) {
    var replaceArray = mergeArrays === false;
    var isArray = Array.isArray(src);
    var destination = isArray ? [] : {};
    if (isArray) {
        target = target || [];
        destination = destination.concat(target);
        if (replaceArray) {
            return destination;
        }
        src.forEach(function (item, index) {
            if (typeof destination[index] === 'undefined') {
                destination[index] = item;
            }
            else if (typeof item === 'object') {
                destination[index] = deepMerge(target[index], item, mergeArrays);
            }
            else {
                if (target.indexOf(item) === -1) {
                    destination.push(item);
                }
            }
        });
    }
    else {
        if (target && typeof target === 'object') {
            Object.keys(target).forEach(function (key) {
                destination[key] = target[key];
            });
        }
        else {
            target = {};
        }
        Object.keys(src).forEach(function (key) {
            if (typeof src[key] !== 'object' || src[key] === null) {
                destination[key] = src[key];
            }
            else {
                // Do not merge objects with custom prototype! (add option to merge anyway ?)
                if (src[key].constructor === Object && Object.prototype.hasOwnProperty.call(target, key)) {
                    destination[key] = deepMerge(target[key], src[key], mergeArrays);
                }
                else {
                    destination[key] = src[key];
                }
            }
        });
    }
    return destination;
}
exports.deepMerge = deepMerge;
