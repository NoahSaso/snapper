// Make BigInt values JSON serializable.
;(BigInt.prototype as any).toJSON = function () {
  return this.toString()
}
