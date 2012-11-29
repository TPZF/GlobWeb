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

/** 
 Setup the default event handlers for the Navigation
 */
GlobWeb.Navigation.prototype.setupTouchEventHandlers = function()
{
	// Setup the touch event handlers
	var self = this;
	var canvas = this.globe.renderContext.canvas;
	canvas.addEventListener("touchstart",function(e) { self.handleTouchStart(e); },false);
	document.addEventListener("touchend",function(e) { self.handleTouchEnd(e); },false);
	canvas.addEventListener("touchmove",function(e) { self.handleTouchMove(e); },false);
}

/**************************************************************************************************************/

/** 
  Handle touch start event
 */
GlobWeb.Navigation.prototype.handleTouchStart = function(event)
{
	console.log("# events : " + event.touches.length );
	this.pressX = event.touches[0].clientX;
	this.pressY = event.touches[0].clientY;
	this.lastMouseX = event.touches[0].clientX;
	this.lastMouseY = event.touches[0].clientY;
	
	if ( event.touches.length == 2 )
	{
		var dx = event.touches[0].clientX - event.touches[1].clientX;
		var dy = event.touches[0].clientY - event.touches[1].clientY;
		this.lastFingerDistance = Math.sqrt( dx * dx + dy * dy );
		console.log("Finger distance : " + this.lastFingerDistance );
	}
	
	this.publish("start");
	
	if ( event.preventDefault )
	{
		event.preventDefault();
	}
	event.returnValue = false;

	// Return false to stop event to be propagated
	return false;
}

/**************************************************************************************************************/

/** 
  Handle touch move event
 */
GlobWeb.Navigation.prototype.handleTouchMove = function(event)
{
	var dx = (event.touches[0].clientX - this.lastMouseX);
	var dy = (event.touches[0].clientY - this.lastMouseY);
	
	this.lastMouseX = event.touches[0].clientX;
	this.lastMouseY = event.touches[0].clientY;
	
	// Pan
	if ( event.touches.length == 1 )
	{
		this.pan( dx, dy );
		this.globe.renderContext.requestFrame();
	}
	// Zoom
	else if ( event.touches.length == 2 )
	{
		var dx = event.touches[0].clientX - event.touches[1].clientX;
		var dy = event.touches[0].clientY - event.touches[1].clientY;
		var fingerDistance = Math.sqrt( dx * dx + dy * dy ); 
		console.log("Finger distance : " + fingerDistance + " " + this.lastFingerDistance );
		this.zoom( (fingerDistance - this.lastFingerDistance) * 0.025 );
		this.lastFingerDistance = fingerDistance;
	}
	
	if ( event.preventDefault )
	{
		event.preventDefault();
	}
	event.returnValue = false;
	
	return false;
}


/**************************************************************************************************************/

/** 
  Handle touch end event
 */
GlobWeb.Navigation.prototype.handleTouchEnd = function(event)
{
	this.publish("end");
	
	if ( event.preventDefault )
	{
		event.preventDefault();
	}
	event.returnValue = false;
	
	return false;
}