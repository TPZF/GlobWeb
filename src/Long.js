/***************************************
 * Copyright 2009 The Closure Library Authors. All Rights Reserved. (Apache License, Version 2.0)
 * Copyright 2011, 2012 GlobWeb contributors.
 *
 * This file is part of GlobWeb.
 *
 * GlobWeb is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, version 3 of the License, or
 * (at your option) any later version.
 *
 * GlobWeb is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with GlobWeb. If not, see <http://www.gnu.org/licenses/>.
 ***************************************/

/**
*	@constructor Long
*	GlobWeb.Long class for only unsigned integers
*/

/**
 * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
 * values as *signed* integers.  See the from* functions below for more
 * convenient ways of constructing Longs.
 *
 * The internal representation of a long is the two given signed, 32-bit values.
 * We use 32-bit pieces because these are the size of integers on which
 * Javascript performs bit-operations.  For operations like addition and
 * multiplication, we split each number into 16-bit pieces, which can easily be
 * multiplied within Javascript's floating-point representation without overflow
 * or change in sign.
 *
 * In the algorithms below, we frequently reduce the negative case to the
 * positive case by negating the input(s) and then post-processing the result.
 * Note that we must ALWAYS check specially whether those values are MIN_VALUE
 * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
 * a positive number, it overflows back into a negative).  Not handling this
 * case would often result in infinite recursion.
 *
 * @param {number} low  The low (signed) 32 bits of the long.
 * @param {number} high  The high (signed) 32 bits of the long.
 * @constructor
 */
GlobWeb.Long = function(low, high) {
  /**
   * @type {number}
   * @private
   */
  this.low_ = low | 0;  // force into 32 signed bits.

  /**
   * @type {number}
   * @private
   */
  this.high_ = high | 0;  // force into 32 signed bits.
};

/**
 * A cache of the Long representations of small integer values.
 * @type {!Object}
 * @private
 */
GlobWeb.Long.IntCache_ = {};

/**
 * Returns a Long representing the given (32-bit) integer value.
 * @param {number} value The 32-bit integer in question.
 * @return {!GlobWeb.Long} The corresponding Long value.
 */
GlobWeb.Long.fromInt = function(value) {
  if (-128 <= value && value < 128) {
    var cachedObj = GlobWeb.Long.IntCache_[value];
    if (cachedObj) {
      return cachedObj;
    }
  }

  var obj = new GlobWeb.Long(value | 0, value < 0 ? -1 : 0);
  if (-128 <= value && value < 128) {
    GlobWeb.Long.IntCache_[value] = obj;
  }
  return obj;
};

/**
 * Returns a Long representing the given value, provided that it is a finite
 * number.  Otherwise, zero is returned.
 * @param {number} value The number in question.
 * @return {!GlobWeb.Long} The corresponding Long value.
 */
GlobWeb.Long.fromNumber = function(value) {
  if (isNaN(value) || !isFinite(value)) {
    return GlobWeb.Long.ZERO;
  } else if (value <= -GlobWeb.Long.TWO_PWR_63_DBL_) {
    return GlobWeb.Long.MIN_VALUE;
  } else if (value + 1 >= GlobWeb.Long.TWO_PWR_63_DBL_) {
    return GlobWeb.Long.MAX_VALUE;
  } else if (value < 0) {
    return GlobWeb.Long.fromNumber(-value).negate();
  } else {
    return new GlobWeb.Long(
        (value % GlobWeb.Long.TWO_PWR_32_DBL_) | 0,
        (value / GlobWeb.Long.TWO_PWR_32_DBL_) | 0);
  }
};

/**
 * Returns a Long representing the 64-bit integer that comes by concatenating
 * the given high and low bits.  Each is assumed to use 32 bits.
 * @param {number} lowBits The low 32-bits.
 * @param {number} highBits The high 32-bits.
 * @return {!GlobWeb.Long} The corresponding Long value.
 */
GlobWeb.Long.fromBits = function(lowBits, highBits) {
  return new GlobWeb.Long(lowBits, highBits);
};

/**
 * Number used repeated below in calculations.  This must appear before the
 * first call to any from* function below.
 * @type {number}
 * @private
 */
GlobWeb.Long.TWO_PWR_16_DBL_ = 1 << 16;


/**
 * @type {number}
 * @private
 */
GlobWeb.Long.TWO_PWR_24_DBL_ = 1 << 24;


/**
 * @type {number}
 * @private
 */
GlobWeb.Long.TWO_PWR_32_DBL_ =
    GlobWeb.Long.TWO_PWR_16_DBL_ * GlobWeb.Long.TWO_PWR_16_DBL_;


/**
 * @type {number}
 * @private
 */
GlobWeb.Long.TWO_PWR_64_DBL_ =
    GlobWeb.Long.TWO_PWR_32_DBL_ * GlobWeb.Long.TWO_PWR_32_DBL_;


/**
 * @type {number}
 * @private
 */
GlobWeb.Long.TWO_PWR_63_DBL_ =
    GlobWeb.Long.TWO_PWR_64_DBL_ / 2;


/** @type {!GlobWeb.Long} */
GlobWeb.Long.ZERO = GlobWeb.Long.fromInt(0);


/** @type {!GlobWeb.Long} */
GlobWeb.Long.ONE = GlobWeb.Long.fromInt(1);

/** @type {!GlobWeb.Long} */
GlobWeb.Long.MAX_VALUE =
    GlobWeb.Long.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);


/** @type {!GlobWeb.Long} */
GlobWeb.Long.MIN_VALUE = GlobWeb.Long.fromBits(0, 0x80000000 | 0);

/**
 * @type {!GlobWeb.Long}
 * @private
 */
GlobWeb.Long.TWO_PWR_24_ = GlobWeb.Long.fromInt(1 << 24);


/** @return {number} The value, assuming it is a 32-bit integer. */
GlobWeb.Long.prototype.toInt = function() {
  return this.low_;
};

/** @return {number} The closest floating-point representation to this value. */
GlobWeb.Long.prototype.toNumber = function() {
  return this.high_ * GlobWeb.Long.TWO_PWR_32_DBL_ +
         this.getLowBitsUnsigned();
};

/** @return {number} The low 32-bits as an unsigned value. */
GlobWeb.Long.prototype.getLowBitsUnsigned = function() {
  return (this.low_ >= 0) ?
      this.low_ : GlobWeb.Long.TWO_PWR_32_DBL_ + this.low_;
};

/** @return {boolean} Whether this value is zero. */
GlobWeb.Long.prototype.isZero = function() {
  return this.high_ == 0 && this.low_ == 0;
};


/** @return {boolean} Whether this value is negative. */
GlobWeb.Long.prototype.isNegative = function() {
  return this.high_ < 0;
};


/** @return {boolean} Whether this value is odd. */
GlobWeb.Long.prototype.isOdd = function() {
  return (this.low_ & 1) == 1;
};


/**
 * @param {GlobWeb.Long} other Long to compare against.
 * @return {boolean} Whether this Long equals the other.
 */
GlobWeb.Long.prototype.equals = function(other) {
  return (this.high_ == other.high_) && (this.low_ == other.low_);
};

/**
 * @param {GlobWeb.Long} other Long to compare against.
 * @return {boolean} Whether this Long is less than the other.
 */
GlobWeb.Long.prototype.lessThan = function(other) {
  return this.compare(other) < 0;
};

/**
 * @param {GlobWeb.Long} other Long to compare against.
 * @return {boolean} Whether this Long is greater than or equal to the other.
 */
GlobWeb.Long.prototype.greaterThanOrEqual = function(other) {
  return this.compare(other) >= 0;
};


/**
 * Compares this Long with the given one.
 * @param {GlobWeb.Long} other Long to compare against.
 * @return {number} 0 if they are the same, 1 if the this is greater, and -1
 *     if the given one is greater.
 */
GlobWeb.Long.prototype.compare = function(other) {
  if (this.equals(other)) {
    return 0;
  }

  var thisNeg = this.isNegative();
  var otherNeg = other.isNegative();
  if (thisNeg && !otherNeg) {
    return -1;
  }
  if (!thisNeg && otherNeg) {
    return 1;
  }

  // at this point, the signs are the same, so subtraction will not overflow
  if (this.subtract(other).isNegative()) {
    return -1;
  } else {
    return 1;
  }
};

/** @return {!GlobWeb.Long} The negation of this value. */
GlobWeb.Long.prototype.negate = function() {
  if (this.equals(GlobWeb.Long.MIN_VALUE)) {
    return GlobWeb.Long.MIN_VALUE;
  } else {
    return this.not().add(GlobWeb.Long.ONE);
  }
};


/**
 * Returns the sum of this and the given Long.
 * @param {GlobWeb.Long} other Long to add to this one.
 * @return {!GlobWeb.Long} The sum of this and the given Long.
 */
GlobWeb.Long.prototype.add = function(other) {
  // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 0xFFFF;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 0xFFFF;

  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 0xFFFF;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 0xFFFF;

  var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
  c00 += a00 + b00;
  c16 += c00 >>> 16;
  c00 &= 0xFFFF;
  c16 += a16 + b16;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c32 += a32 + b32;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c48 += a48 + b48;
  c48 &= 0xFFFF;
  return GlobWeb.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
};


/**
 * Returns the difference of this and the given Long.
 * @param {GlobWeb.Long} other Long to subtract from this.
 * @return {!GlobWeb.Long} The difference of this and the given Long.
 */
GlobWeb.Long.prototype.subtract = function(other) {
  return this.add(other.negate());
};


/**
 * Returns the product of this and the given long.
 * @param {GlobWeb.Long} other Long to multiply with this.
 * @return {!GlobWeb.Long} The product of this and the other.
 */
GlobWeb.Long.prototype.multiply = function(other) {
  if (this.isZero()) {
    return GlobWeb.Long.ZERO;
  } else if (other.isZero()) {
    return GlobWeb.Long.ZERO;
  }

  if (this.equals(GlobWeb.Long.MIN_VALUE)) {
    return other.isOdd() ? GlobWeb.Long.MIN_VALUE : GlobWeb.Long.ZERO;
  } else if (other.equals(GlobWeb.Long.MIN_VALUE)) {
    return this.isOdd() ? GlobWeb.Long.MIN_VALUE : GlobWeb.Long.ZERO;
  }

  if (this.isNegative()) {
    if (other.isNegative()) {
      return this.negate().multiply(other.negate());
    } else {
      return this.negate().multiply(other).negate();
    }
  } else if (other.isNegative()) {
    return this.multiply(other.negate()).negate();
  }

  // If both longs are small, use float multiplication
  if (this.lessThan(GlobWeb.Long.TWO_PWR_24_) &&
      other.lessThan(GlobWeb.Long.TWO_PWR_24_)) {
    return GlobWeb.Long.fromNumber(this.toNumber() * other.toNumber());
  }

  // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
  // We can skip products that would overflow.

  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 0xFFFF;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 0xFFFF;

  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 0xFFFF;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 0xFFFF;

  var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
  c00 += a00 * b00;
  c16 += c00 >>> 16;
  c00 &= 0xFFFF;
  c16 += a16 * b00;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c16 += a00 * b16;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c32 += a32 * b00;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c32 += a16 * b16;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c32 += a00 * b32;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
  c48 &= 0xFFFF;
  return GlobWeb.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
};

/** @return {!GlobWeb.Long} The bitwise-NOT of this value. */
GlobWeb.Long.prototype.not = function() {
  return GlobWeb.Long.fromBits(~this.low_, ~this.high_);
};


/**
 * Returns the bitwise-AND of this Long and the given one.
 * @param {GlobWeb.Long} other The Long with which to AND.
 * @return {!GlobWeb.Long} The bitwise-AND of this and the other.
 */
GlobWeb.Long.prototype.and = function(other) {
  return GlobWeb.Long.fromBits(this.low_ & other.low_,
                                 this.high_ & other.high_);
};


/**
 * Returns the bitwise-OR of this Long and the given one.
 * @param {GlobWeb.Long} other The Long with which to OR.
 * @return {!GlobWeb.Long} The bitwise-OR of this and the other.
 */
GlobWeb.Long.prototype.or = function(other) {
  return GlobWeb.Long.fromBits(this.low_ | other.low_,
                                 this.high_ | other.high_);
};

/**
 * Returns this Long with bits shifted to the right by the given amount, with
 * the new top bits matching the current sign bit.
 * @param {number} numBits The number of bits by which to shift.
 * @return {!GlobWeb.Long} This shifted to the right by the given amount, with
 *     zeros placed into the new leading bits.
 */
GlobWeb.Long.prototype.shiftRightUnsigned = function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
    return this;
  } else {
    var high = this.high_;
    if (numBits < 32) {
      var low = this.low_;
      return GlobWeb.Long.fromBits(
          (low >>> numBits) | (high << (32 - numBits)),
          high >>> numBits);
    } else if (numBits == 32) {
      return GlobWeb.Long.fromBits(high, 0);
    } else {
      return GlobWeb.Long.fromBits(high >>> (numBits - 32), 0);
    }
  }
};
