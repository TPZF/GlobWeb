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

define( function() {

/**************************************************************************************************************/

/**
	Declare namespace for Numeric functions.
	TODO : Should be put into GlobWeb
 */
var Numeric = {};

/**************************************************************************************************************/

/**
  Linear interpolation between [a, b], t must be [0, 1]
*/
Numeric.lerp = function(t, a, b)
{
    return a + ((b - a) * t);
}

/**************************************************************************************************************/

/**
  Cosine interpolation between [a, b], t must be [0, 1]
*/
Numeric.coserp = function(t, a, b)
{
	var t2 = (1 - Math.cos(t * Math.PI))/2;
    return a + ((b - a) * t2);
}

/**************************************************************************************************************/

/**
 Cubic interpolation between [a, b], t must be [0, 1]
*/
Numeric.cubicInterpolation = function(t, startPos, startVel, endPos, endVel)
{
	var t2 = t * t;
	var t3 = t2 * t; 
	
	// Evaluate the position
	
	var M00 = 2 * startPos[0] - 2 * endPos[0] + startVel[0] + endVel[0];
	var M10 = 2 * startPos[1] - 2 * endPos[1] + startVel[1] + endVel[1];
	var M20 = 2 * startPos[2] - 2 * endPos[2] + startVel[2] + endVel[2];

	var M01 = -3 * startPos[0] + 3 * endPos[0] - 2 * startVel[0] - endVel[0];
	var M11 = -3 * startPos[1] + 3 * endPos[1] - 2 * startVel[1] - endVel[1];
	var M21 = -3 * startPos[2] + 3 * endPos[2] - 2 * startVel[2] - endVel[2];
	
	var position = vec3.create();
	position[0] = M00 * t3 + M01 * t2 + startVel[0] * t + startPos[0];
	position[1] = M10 * t3 + M11 * t2 + startVel[1] * t + startPos[1];
	position[2] = M20 * t3 + M21 * t2 + startVel[2] * t + startPos[2];
	
	return position;
}

/**************************************************************************************************************/

/**
 Cubic interpolation between [a, b], t must be [0, 1]
*/
Numeric.cubicInterpolationDerivative = function(t, startPos, startVel, endPos, endVel)
{
	var t2 = t * t;
	
	// Evaluates the direction

	var M01 = 6 * startPos[0] - 6 * endPos[0] + 3 * startVel[0] + 3 * endVel[0];
	var M11 = 6 * startPos[1] - 6 * endPos[1] + 3 * startVel[1] + 3 * endVel[1];
	var M21 = 6 * startPos[2] - 6 * endPos[2] + 3 * startVel[2] + 3 * endVel[2];

	var M02 = -6 * startPos[0] + 6 * endPos[0] - 4 * startVel[0] - 2 * endVel[0];
	var M12 = -6 * startPos[1] + 6 * endPos[1] - 4 * startVel[1] - 2 * endVel[1];
	var M22 = -6 * startPos[2] + 6 * endPos[2] - 4 * startVel[2] - 2 * endVel[2];

	var direction = vec3.create();
	direction[0] = M01 * t2 + M02 * t + startVel[0];
	direction[1] = M11 * t2 + M12 * t + startVel[1];
	direction[2] = M21 * t2 + M22 * t + startVel[2];
	
	return direction;
}

/**************************************************************************************************************/

/**
  Map x between [xMin, xMax] to [0, 1]
*/
Numeric.map01 = function(x, xMin, xMax)
{
    return (xMin != xMax) ? (x - xMin) / (xMax - xMin) : 0;
}

/**************************************************************************************************************/

/*
  Map x between [xMin, xMax] to [outMin, outMax]
*/
Numeric.mapLinear = function(x, xMin, xMax, outMin, outMax)
{
    return Numeric.lerp(Numeric.map01(x, xMin, xMax), outMin, outMax);
}

/**************************************************************************************************************/

Numeric.easeInQuad = function(t)
{
    return t*t;
}

/**************************************************************************************************************/

Numeric.easeOutQuad = function(t)
{
    // use 1-(t^2) with input [-1, 0]
    var v = t - 1; // map [0 1] to [-1 0]
    return 1.0-(v*v);
}

/**************************************************************************************************************/

/**
  Remap input t ([0, 1]) to a curve starting slowly
  and accelerating till 0.5 an decelerating till 1
*/
Numeric.easeInOutQuad = function(t)
{
    var out = t;
    if (out < 0.5)
    {
        // use (0.5*t^2) with input [0, 1]
        out = out+out; // map [0 0.5] outo [0 1]
        out = 0.5*(out*out);
    }
    else
    {
        // use (0.5*(1-t)^2) with input [-1, 0]
        out = (out+out) - 2.0; // map [0.5 1] to [-1 0]
        out = 0.5*(1.0-(out*out));
        out = 0.5 + out;
    }
    return out;
}

/**************************************************************************************************************/

/*
 */
Numeric.easeOutInQuad = function(t)
{
    var out = t;
    if (out < 0.5)
    {
        // use (0.5*(1-t)^2) with input [-1, 0]
        out = (out+out) - 1.0; // map [0 0.5] to [-1 0]
        out = 0.5*(1.0-(out*out));
    }
    else
    {
        // use (0.5*t^2) with input [0, 1]
        out = (out+out) - 1.0; // map [0.5 1] outo [0 1]
        out = 0.5*(out*out);
        out = 0.5 + out;
    }
    return out;
}

/**************************************************************************************************************/

/**
  Convert the given degree value in radian
*/
Numeric.toRadian = function(degree)
{
    return degree * Math.PI / 180.0;
}

/**************************************************************************************************************/

/**
  Convert the given radian value in degree
*/
Numeric.toDegree = function(radian)
{
    return radian * 180.0 / Math.PI;
}

/**************************************************************************************************************/

/**
  Line-line intersection
  rayDirection must be normalized.
  Returns t at which intersection occurs or -1 if no intersection.
*/

Numeric.lineIntersection = function( x1, y1, x2, y2, x3, y3, x4, y4 )
{
	var det = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
	if ( det == 0 )
	{
		return [-1,-1];
	}
	
	var ua = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
	var ub = (x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3);
	
	ua /= det;
	ub /= det;
	
	return [ ua, ub ];
	//return ua > 0.0 && ua < 1.0 && ub > 0.0 && ub < 1.0;
}

/**************************************************************************************************************/

/**
 * 	Round the given number
 * 
 * 	@param num Number to round
 * 	@param dec Number of decimals
 */
Numeric.roundNumber = function (num, dec)
{
	var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
	return result;
}

/**************************************************************************************************************/

return Numeric;

});

