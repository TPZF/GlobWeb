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

/**************************************************************************************************************/

/** @constructor
  Generic animation to interpolate arbitrary values
  The animation will interpolate between startValue and endValue, using the
  interpolateFunction(t, startValue, endValue) (t [0,1])
  The interpolated value is then given to the setFunction(value)
  */
GlobWeb.InterpolatedAnimation = function(duration, startValue, endValue, interpolationFunction, setFunction)
{
    // Call ancestor constructor
    GlobWeb.Animation.prototype.constructor.call(this);

    this.values = [[0.0, startValue], [1.0, endValue]];
    this.duration = duration;
    this.interpolationFunction = interpolationFunction;
    this.setFunction = setFunction;
}

/**************************************************************************************************************/

GlobWeb.inherits(GlobWeb.Animation,GlobWeb.InterpolatedAnimation);

/**************************************************************************************************************/

/*
	Adds a new value to the animation
	't' is the value [0, 1] at which the animation value must reach 'value'
*/
GlobWeb.InterpolatedAnimation.prototype.addValue = function(t, value)
{
    var count = this.values.length;
    var upper = 0;
    while (upper < count && this.values[upper][0] < t) upper++;
    // Insert new value at position 'upper'
    this.values.splice(upper, 0, [t, value]);
}

/**************************************************************************************************************/

GlobWeb.InterpolatedAnimation.prototype.start = function()
{
    GlobWeb.Animation.prototype.start.call(this);
    this.setFunction(this.startValue);
}

/**************************************************************************************************************/

GlobWeb.InterpolatedAnimation.prototype.stop = function()
{
    GlobWeb.Animation.prototype.stop.call(this);
    this.setFunction(this.endValue);
}

/**************************************************************************************************************/

/*
	Animation update method
*/
GlobWeb.InterpolatedAnimation.prototype.update = function(now)
{
    var t = Numeric.map01(now, this.startTime, this.startTime + this.duration);
    if (t >= 1)
    {
        this.stop();
        return;
    }

    // Find upper and lower bounds
    var count = this.values.length;
    var upper = 0;
    while (upper < count && this.values[upper][0] < t) upper++;
    upper = Math.min(upper, count-1);
    var lower = Math.max(0, upper-1);

    // Remap t between lower and upper bounds
    t = Numeric.map01(t, this.values[lower][0], this.values[upper][0]);
	// Interpolate value
    var value = this.interpolationFunction(t, this.values[lower][1], this.values[upper][1]);
	// Use interpolated value
    this.setFunction(value);
}

/**************************************************************************************************************/
