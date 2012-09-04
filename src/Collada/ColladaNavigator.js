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

/** @export
	@constructor
	Navigation constructor
 */
ColladaNavigator = function(renderContext)
{
	this.renderContext = renderContext;
    this.pressX = -1;
    this.pressY = -1;
	this.lastMouseX = -1;
	this.lastMouseY = -1;
    this.pressedButton = -1;
	this.inverseViewMatrix = mat4.create();
	
	this.minDistance = 0.005; //01;
	this.maxDistance = 10000;

	// Initialize the navigator
	this.center = [0.0, 0.0, 0.0];
	this.distance = 3;
	this.heading = 0.0;
	this.tilt = 90.0;
	
	this.renderContext.near = 0.1;
	this.renderContext.far = 5000;

	// Update the view matrix now
	this.computeViewMatrix();
}

/**************************************************************************************************************/

/** 
 Setup the default event handlers for the navigator
 */
ColladaNavigator.prototype.setupDefaultEventHandlers = function(zoomOnDblClick)
{
	// Setup the mouse event handlers
	var self = this;
	var canvas = this.renderContext.canvas;
	canvas.addEventListener("mousedown",function(e) { self.handleMouseDown(e||window.event); },false);
	document.addEventListener("mouseup",function(e) { self.handleMouseUp(e||window.event); },false);
	canvas.addEventListener("mousemove",function(e) { self.handleMouseMove(e||window.event); },false);
			
	// For Firefox
	canvas.addEventListener("DOMMouseScroll",function(e) { self.handleMouseWheel(e||window.event); },false);
	canvas.addEventListener("mousewheel",function(e) { self.handleMouseWheel(e||window.event); },false);
}

/**************************************************************************************************************/

/*
	Compute the inverse view matrix
 */
ColladaNavigator.prototype.applyLocalRotation = function(matrix)
{
	mat4.rotate( matrix, (this.heading) * Math.PI / 180.0, [ 0.0, 0.0, 1.0 ] );
	mat4.rotate( matrix, (90 - this.tilt) * Math.PI / 180.0, [ 1.0, 0.0, 0.0 ] );
}

/**************************************************************************************************************/

/*
	Compute the view matrix
 */
ColladaNavigator.prototype.computeViewMatrix = function()
{
    this.computeInverseViewMatrix();
	mat4.inverse( this.inverseViewMatrix, this.renderContext.viewMatrix );
}

/**************************************************************************************************************/

/*
	Compute the inverse view matrix
 */
ColladaNavigator.prototype.computeInverseViewMatrix = function()
{	
	mat4.identity( this.inverseViewMatrix );
	mat4.translate( this.inverseViewMatrix, this.center );
	this.applyLocalRotation(this.inverseViewMatrix);
	mat4.translate( this.inverseViewMatrix, [0.0, 0.0, this.distance] );
}

/**************************************************************************************************************/

/*
	Event handler for mouse wheel
 */
ColladaNavigator.prototype.handleMouseWheel = function(event)
{
	var previousDistance = this.distance;
	
	// Check differences between firefox and the rest of the world 
	if ( event.wheelDelta === undefined)
	{
		this.distance *= (1 + event.detail * 0.1);
	}
	else
	{
		this.distance *= (1 + (-event.wheelDelta / 120.0) * 0.1);
	}
	
	if ( this.distance > this.maxDistance )
	{
		this.distance = this.maxDistance;
	}
	if ( this.distance < this.minDistance )
	{
		this.distance = this.minDistance;
	}

	this.computeViewMatrix();
		
	// Stop mouse wheel to be propagated, because default is to scroll the page
	// This is need when using Firefox event listener on DOMMouseScroll
	if ( event.preventDefault )
	{
		event.preventDefault();
	}
	event.returnValue = false;
		
	// Return false to stop mouse wheel to be propagated when using onmousewheel
	return false;
}

/**************************************************************************************************************/

/*
	Event handler for mouse down
 */
ColladaNavigator.prototype.handleMouseDown = function(event)
{
	//console.log("button " + event.button);
	//console.log("modifiers " + event.altKey);

    this.pressedButton = event.button;
	
	if ( event.button == 0 || event.button == 1 )
	{
        this.pressX = event.clientX;
        this.pressY = event.clientY;
		this.lastMouseX = event.clientX;
		this.lastMouseY = event.clientY;
			
        // Return false to stop mouse down to be propagated when using onmousedown
		return false;
	}

	return true;

}


/**************************************************************************************************************/

/*
	Pan the navigator
 */
ColladaNavigator.prototype.pan = function(dx,dy)
{
}

/**************************************************************************************************************/

/*
	Rotate the navigator
 */
ColladaNavigator.prototype.rotate = function(dx,dy)
{
	var previousHeading = this.heading;
	var previousTilt = this.tilt;
	
	this.heading += dx * 0.1;
	this.tilt += dy * 0.1;
	
	this.computeViewMatrix();

	// if ( this.hasCollision() )
	// {
		// this.heading = previousHeading;
		// this.tilt = previousTilt;
		// this.computeViewMatrix();
	// }
}

/**************************************************************************************************************/

/*
	Event handler for mouse move
 */
ColladaNavigator.prototype.handleMouseMove = function(event)
{
    // No button pressed
    if (this.pressedButton < 0)
        return;

	var dx = (event.clientX - this.lastMouseX);
	var dy = (event.clientY - this.lastMouseY);
	
	this.lastMouseX = event.clientX;
	this.lastMouseY = event.clientY;
	
	// Pan
    if ( this.pressedButton == 0 )
    {
		this.pan( dx, dy );
		return true;
	}
	// Rotate
    else if ( this.pressedButton == 1 )
    {
		this.rotate(dx,dy);
		return true;
    }
	
	return false;
}

/**************************************************************************************************************/

/*
	Event handler for mouse up
 */
ColladaNavigator.prototype.handleMouseUp = function(event)
{
    // No button pressed anymore
	this.pressedButton = -1;

	if ( event.button == 0 || event.button == 1 )
	{		
       // Stop mouse up event
        return false;
	}

    return true;
}

