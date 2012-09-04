/***************************************
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

GlobWeb.Long = function(low, high)
{
	this.low = low | 0;    // force into 32 signed bits.
	this.high = high | 0;  // force into 32 signed bits.
};

GlobWeb.Long.fromInt = function(value)
{
	return new GlobWeb.Long(value | 0, 0);
};

GlobWeb.Long.fromBits = function(lowBits, highBits)
{
	return new GlobWeb.Long(lowBits, highBits);
};

GlobWeb.Long.ZERO = GlobWeb.Long.fromInt(0);
GlobWeb.Long.TWO_PWR_16_ = 1 << 16;
GlobWeb.Long.TWO_PWR_24_ = 1 << 24;

// we must use multiplication instead of left shift because of ("<< 32" == "<< 0");
GlobWeb.Long.TWO_PWR_32_ = GlobWeb.Long.TWO_PWR_16_ * GlobWeb.Long.TWO_PWR_16_;
	
GlobWeb.Long.fromNumber = function(value){
	if (isNaN(value) || !isFinite(value))
	{
		return  GlobWeb.Long.ZERO;
	}
	else
	{
		return new GlobWeb.Long( (value % GlobWeb.Long.TWO_PWR_32_) | 0, (value / GlobWeb.Long.TWO_PWR_32_) | 0);
	}
};

GlobWeb.Long.prototype.toInt = function()
{
	return this.low;
};

GlobWeb.Long.prototype.and = function(other)
{
	return GlobWeb.Long.fromBits(this.low & other.low, this.high & other.high);
};

GlobWeb.Long.prototype.or = function(other)
{
	return GlobWeb.Long.fromBits(this.low | other.low, this.high | other.high);
};

GlobWeb.Long.prototype.shiftRightUnsigned = function(numBits)
{
	numBits &= 63;
	if (numBits == 0)
	{
		return this;
	}
	else
	{
		var high = this.high;
		if (numBits < 32)
		{
			var low = this.low;
				return GlobWeb.Long.fromBits( (low >>> numBits) | (high << (32 - numBits)), high >>> numBits );
		}
		else if (numBits == 32)
		{
			return GlobWeb.Long.fromBits(high, 0);
		}
		else
		{
			return GlobWeb.Long.fromBits(high >>> (numBits - 32), 0);
		}
	}
};