import {IntegerType} from "via-type";

export class Model {
  private _: Model; // self-reference
  private _data: any;

  constructor () {
    this._ = this;
    let i: IntegerType = new IntegerType();
    console.log(i.testSync(10));
    console.log(i.testSync(true));
  }
}
