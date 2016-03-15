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
    src.forEach(function(e, i) {
      if (typeof destination[i] === 'undefined') {
        destination[i] = e;
      } else if (typeof e === 'object') {
        destination[i] = deepMerge(target[i], e, mergeArrays);
      } else {
        if (target.indexOf(e) === -1) {
          destination.push(e);
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
