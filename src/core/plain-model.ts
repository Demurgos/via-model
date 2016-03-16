import * as Promise from "bluebird";
import {defineProperty} from "./helpers";
import {Model} from "./model";

export class PlainModel {
  public _: Model;

  constructor(model: Model) {
    defineProperty(this, "_", {value: model});
  }
}

//export = function(Model){
//
//  var PlainModel = function (){
//    PlainModel.prototype.init.apply(this, arguments);
//  }
//
//  utils.inherits(PlainModel, Model)
//
//  PlainModel.prototype.init = function(model){
//    utils.defineProperty(this, "_", {value: model});
//    return this;
//  }
//
//  PlainModel.prototype._load = function(fields){
//    var self = this;
//    return self._
//      .get(fields)
//      .then(function(data){
//        return self._assign(data)
//      })
//  }
//
//  PlainModel.prototype._save = function(fields){
//    return Promise
//      .reject(new Error("TODO: PlainModel:_save"))
//  }
//
//  PlainModel.prototype._assign = function(obj){
//    for (var key in obj) {
//      this[key] = obj[key];
//    }
//    return this;
//    // return _.assign(this, obj)
//  }
//
//  // TODO: rename to _populate ?
//  PlainModel.prototype._flattenModels = function(obj){
//
//    var promises = [];
//    var flatten = {};
//
//    _.forEach(this, function(val, key){
//      if (val instanceof Model){
//        var p = val
//          .toPlain(null)
//          .then(function(plain){
//            return flatten[key] = plain;});
//        promises.push(p);
//      }
//    })
//
//    if (!promises.length) {
//      return Promise.resolve(self);
//    }
//
//    var self = this;
//
//    return Promise
//      .all(promises)
//      .then(function(){
//        return self._assign(flatten);
//      });
//  }
//
//  PlainModel.prototype.toJSON = Object.prototype.toJSON; // cancel changes made in Model's prototype
//
//  return PlainModel;
//
//}
