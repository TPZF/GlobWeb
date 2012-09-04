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
	Matrix animation using a vec3 position and an attitude quaternion.
	'matrix' is the matrix that will be updated.
	'duration' is the animation duration in ms.
	'endCallback' is a function that will get called when the animation is done.
*/
GlobWeb.PositionAttitudeAnimation = function(matrix, duration, endCallback)
{
    // Call ancestor constructor
    GlobWeb.Animation.prototype.constructor.call(this);

    this.matrix = matrix;
    this.checkpoints = [];
    this.duration = duration;
    this.endCallback = endCallback;

    this.lastUpper = 0;
}

/**************************************************************************************************************/

GlobWeb.inherits(GlobWeb.Animation,GlobWeb.PositionAttitudeAnimation);

/**************************************************************************************************************/

/*
	Adds a checkpoint in the animation
	't' is the t value at which the checkpoint will be reached
	'position' is the checkpoint position
	'attitude' is the checkpoint attitude
*/
GlobWeb.PositionAttitudeAnimation.prototype.addCheckpoint = function(t, position, attitude)
{
    this.checkpoints.push([t, position, attitude]);
}

/**************************************************************************************************************/

GlobWeb.PositionAttitudeAnimation.prototype.start = function()
{
    GlobWeb.Animation.prototype.start.call(this);
    mat4.fromPositionAttitude(this.checkpoints[0][1], this.checkpoints[0][2], this.matrix);
}

/**************************************************************************************************************/

GlobWeb.PositionAttitudeAnimation.prototype.stop = function()
{
    GlobWeb.Animation.prototype.stop.call(this);
    
    var last = this.checkpoints.length-1;
    mat4.fromPositionAttitude(this.checkpoints[last][1], this.checkpoints[last][2], this.matrix);
    this.endCallback();
}

/**************************************************************************************************************/

/*
	Animation update method
*/
GlobWeb.PositionAttitudeAnimation.prototype.update = function(now)
{
    var t = Numeric.map01(now, this.startTime, this.startTime + this.duration);
    if (t >= 1)
    {
        this.stop();
        return;
    }

	// Find upper and lower checkpoints
    var count = this.checkpoints.length;
    var upper = this.lastUpper;
    while (upper < count && this.checkpoints[upper][0] < t) upper++;
    var lower = Math.max(0, upper-1);

	// Remap t between checkpoints bounds.
    t = map01(t, this.checkpoints[lower][0], this.checkpoints[upper][0]);

    // Position interpolation
    var position = vec3.create();
    vec3.lerp(this.checkpoints[lower][1], this.checkpoints[upper][1], t, position);
    // Attitude interpolation
    var attitude = quat4.create();
    quat4.trueSlerp(this.checkpoints[lower][2], this.checkpoints[upper][2], t, attitude);

	// Update the target matrix
    mat4.fromPositionAttitude(position, attitude, this.matrix);

    this.lastUpper = upper;
}