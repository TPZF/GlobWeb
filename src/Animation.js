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

/**	@constructor
	Base animation class
	Defines animation states (STOPPED, STARTED), animation base members
	and start() stop() functions.
*/
var Animation = function()
{
    this.startTime = -1;
	this.pauseTime = -1;
	this.renderContext = null;
}

/**************************************************************************************************************/

/**
  Unregister as active animation
*/
Animation.prototype._unregisterActive = function()
{
	var index = this.renderContext.activeAnimations.indexOf(this);
	if ( index >= 0 )
	{
		this.renderContext.activeAnimations.splice(index,1);
	}
}

/**************************************************************************************************************/

/**
  Get animation status
*/
Animation.prototype.getStatus = function()
{
	if ( this.startTime == -1 )
		return "STOPPED";
	else 
		return this.pauseTime == -1 ? "RUNNING" : "PAUSED";
}

/**************************************************************************************************************/

/** @export
	Start function, record the start time in startTime member
	and register the animation in the GlobWeb object.
*/
Animation.prototype.start = function()
{
	if ( !this.renderContext )
		return;
	
	if ( this.startTime == -1 || this.pauseTime != - 1 )
	{
 		var now = Date.now();
		if ( this.startTime == -1 )
		{
			this.startTime = now;
		}
		else
		{
			// resume after pause
			this.startTime += now - this.pauseTime;
			this.pauseTime = -1;
		}
		
		// Register animation as active
		this.renderContext.activeAnimations.push(this);
		this.renderContext.requestFrame();
	}
}

/**************************************************************************************************************/

/** @export
	Pause function
*/
Animation.prototype.pause = function()
{	
	if ( !this.renderContext )
		return;
		
	if ( this.startTime != -1 && this.pauseTime == -1 )
	{
		this.pauseTime = Date.now();
		this._unregisterActive(this);
	}
}

/**************************************************************************************************************/

/** @export
	Stop function, removes the animation from the GlobWeb object
*/
Animation.prototype.stop = function()
{
	this.startTime = -1;
	this.pauseTime = -1;
		
	if ( this.onstop )
		this.onstop();

    // Unregister animation
    this._unregisterActive(this);
}

/**************************************************************************************************************/

return Animation;

});