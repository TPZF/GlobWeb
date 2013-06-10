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

 define( ['./Ray','../glMatrix'], function(Ray) {

/**************************************************************************************************************/

/** @export
	@constructor
	Navigation constructor
 */
var SceneGraphNavigation = function(renderContext,node)
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
	
	this.node = node;

	// Update the view matrix now
	this.computeViewMatrix();
}

/**************************************************************************************************************/

/** 
 Setup the default event handlers for the navigator
 */
SceneGraphNavigation.prototype.setupDefaultEventHandlers = function(zoomOnDblClick)
{
	// Setup the mouse event handlers
	var self = this;
	var canvas = this.renderContext.canvas;
	canvas.addEventListener("mousedown",function(e) { return self.handleMouseDown(e||window.event); },false);
	document.addEventListener("mouseup",function(e) { return self.handleMouseUp(e||window.event); },false);
	canvas.addEventListener("mousemove",function(e) { return self.handleMouseMove(e||window.event); },false);
	
	canvas.addEventListener("contextmenu", function(e) { e.preventDefault(); return false; }, false);
			
	// For Firefox
	canvas.addEventListener("DOMMouseScroll",function(e) { return self.handleMouseWheel(e||window.event); },false);
	canvas.addEventListener("mousewheel",function(e) { return self.handleMouseWheel(e||window.event); },false);
}

/**************************************************************************************************************/

/*
	Compute the inverse view matrix
 */
SceneGraphNavigation.prototype.applyLocalRotation = function(matrix)
{
	mat4.rotate( matrix, (this.heading) * Math.PI / 180.0, [ 0.0, 0.0, 1.0 ] );
	mat4.rotate( matrix, (90 - this.tilt) * Math.PI / 180.0, [ 1.0, 0.0, 0.0 ] );
}

/**************************************************************************************************************/

/*
	Compute the view matrix
 */
SceneGraphNavigation.prototype.computeViewMatrix = function()
{
    this.computeInverseViewMatrix();
	mat4.inverse( this.inverseViewMatrix, this.renderContext.viewMatrix );
}

/**************************************************************************************************************/

/*
	Compute the inverse view matrix
 */
SceneGraphNavigation.prototype.computeInverseViewMatrix = function()
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
SceneGraphNavigation.prototype.handleMouseWheel = function(event)
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
SceneGraphNavigation.prototype.handleMouseDown = function(event)
{
	//console.log("button " + event.button);
	//console.log("modifiers " + event.altKey);

    this.pressedButton = event.button;
	
	if ( event.button == 0 || event.button == 2 )
	{
        this.pressX = event.clientX;
        this.pressY = event.clientY;
		this.lastMouseX = event.clientX;
		this.lastMouseY = event.clientY;
		this.previousEvent = event;
				
        // Return false to stop mouse down to be propagated when using onmousedown
		return false;
	}

	return true;

}


/**************************************************************************************************************/

/*
	Pan the navigator
 */
SceneGraphNavigation.prototype.pan = function(event)
{
	var ray = Ray.createFromEvent(this.renderContext,event);
	var prevRay = Ray.createFromEvent(this.renderContext,this.previousEvent);
	
	// Compute plane normal and d
	var normal = vec3.create();
	vec3.subtract( ray.orig, this.center, normal );
	vec3.normalize( normal );
	var d = vec3.dot( this.center, normal );	
	
	var t = ( d - vec3.dot( ray.orig, normal ) ) / vec3.dot( ray.dir, normal );
	var tPrev = ( d - vec3.dot( prevRay.orig, normal ) ) / vec3.dot( prevRay.dir, normal );
	
	var point = ray.computePoint(t);
	var prevPoint = prevRay.computePoint(tPrev);
	var dir = vec3.subtract(  point, prevPoint, vec3.create() );
	vec3.subtract( this.center, dir );
		
	this.previousEvent = event;
	
	this.computeViewMatrix();
	
	// Recompute center
	var dir = vec3.subtract( this.center, ray.orig, vec3.create() );
	vec3.normalize( dir );
	var ray = new Ray( ray.orig, dir);
	var intersections = this.node.intersectWith(ray);
	if ( intersections.length > 0 )
	{	
		intersections.sort( function(a,b) {
			return a.t - b.t;
		});
		var newCenter = ray.computePoint( intersections[0].t );
		this.distance = intersections[0].t;
		this.center = newCenter;
	
		this.computeViewMatrix();
	}
	
}

/**************************************************************************************************************/

/*
	Rotate the navigator
 */
SceneGraphNavigation.prototype.rotate = function(dx,dy)
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
SceneGraphNavigation.prototype.handleMouseMove = function(event)
{
    // No button pressed
    if (this.pressedButton < 0)
        return;

	var dx = (event.clientX - this.lastMouseX);
	var dy = (event.clientY - this.lastMouseY);
		
	var ret = false;
	
	// Pan
    if ( this.pressedButton == 0 )
    {
		this.pan( event );
		ret = true;
	}
	// Rotate
    else if ( this.pressedButton == 2 )
    {
		var dx = (event.clientX - this.lastMouseX);
		var dy = (event.clientY - this.lastMouseY);
		this.rotate(dx,dy);
		ret = true;
   }
	

	this.lastMouseX = event.clientX;
	this.lastMouseY = event.clientY;
	
	return ret;
}

/**************************************************************************************************************/

/*
	Event handler for mouse up
 */
SceneGraphNavigation.prototype.handleMouseUp = function(event)
{
    // No button pressed anymore
	this.pressedButton = -1;

	if ( event.button == 0 || event.button == 2 )
	{		
		// Stop mouse event
		event.preventDefault();
        return false;
	}

    return true;
}

return SceneGraphNavigation

});