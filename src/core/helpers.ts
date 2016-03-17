// TODO: compatibility ?
export function defineProperty (obj: Object, prop: string, descriptor: any): Object {
  Object.defineProperty(obj, prop, descriptor);
  return obj;
}

// inspired from
// https://github.com/nrf110/deepmerge/blob/master/index.js
export function deepMerge (target: any, src: any, mergeArrays: boolean): any {
  let replaceArray = mergeArrays === false;
  let isArray = Array.isArray(src);
  let destination: any = isArray ? [] : {};
  if (isArray) {
    target = target || [];
    destination = destination.concat(target);
    if (replaceArray) {
      return destination;
    }
    src.forEach(function(item: any, index: number) {
      if (typeof destination[index] === 'undefined') {
        destination[index] = item;
      } else if (typeof item === 'object') {
        destination[index] = deepMerge(target[index], item, mergeArrays);
      } else {
        if (target.indexOf(item) === -1) {
          destination.push(item);
        }
      }
    });
  }else{
    if(target && typeof target === 'object'){
      Object.keys(target).forEach(function(key){
        destination[key] = target[key]; });
    }else{
      target = {};
    }
    Object.keys(src).forEach(function (key) {
      if(typeof src[key] !== 'object' || src[key] === null){
        destination[key] = src[key];
      }else{ //src[key] is an object
        // Do not merge objects with custom prototype! (add option to merge anyway ?)
        if(src[key].constructor === Object && Object.prototype.hasOwnProperty.call(target, key)){
          destination[key] = deepMerge(target[key], src[key], mergeArrays);
        }else{
          destination[key] = src[key];
        }
      }
    });
  }
  return destination;
}
