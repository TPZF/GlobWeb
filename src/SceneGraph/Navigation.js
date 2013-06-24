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

 define( ['../Utils','../BaseNavigation','./Ray','../glMatrix'], function(Utils,BaseNavigation,Ray) {

/**************************************************************************************************************/

/** @export
	@constructor
	Navigation constructor
 */
var Navigation = function(renderContext,options)
{
	BaseNavigation.prototype.constructor.call( this, renderContext, options );

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
	
	this.node = options ? options.node : null;

	// Update the view matrix now
	this.computeViewMatrix();
}

/**************************************************************************************************************/

Utils.inherits( BaseNavigation,Navigation );

/**************************************************************************************************************/

/*
	Compute the inverse view matrix
 */
Navigation.prototype.applyLocalRotation = function(matrix)
{
	mat4.rotate( matrix, (this.heading) * Math.PI / 180.0, [ 0.0, 0.0, 1.0 ] );
	mat4.rotate( matrix, (90 - this.tilt) * Math.PI / 180.0, [ 1.0, 0.0, 0.0 ] );
}

/**************************************************************************************************************/

/*
	Compute the view matrix
 */
Navigation.prototype.computeViewMatrix = function()
{
    this.computeInverseViewMatrix();
	mat4.inverse( this.inverseViewMatrix, this.renderContext.viewMatrix );
}

/**************************************************************************************************************/

/*
	Compute the inverse view matrix
 */
Navigation.prototype.computeInverseViewMatrix = function()
{	
	mat4.identity( this.inverseViewMatrix );
	mat4.translate( this.inverseViewMatrix, this.center );
	this.applyLocalRotation(this.inverseViewMatrix);
	mat4.translate( this.inverseViewMatrix, [0.0, 0.0, this.distance] );
}


/**************************************************************************************************************/

/*
	Pan the navigator
 */
Navigation.prototype.pan = function(dx,dy)
{
	var cx = this.renderContext.canvas.width / 2;
	var cy = this.renderContext.canvas.height / 2;
	var ray = Ray.createFromPixel(this.renderContext,cx+dx,cy+dy);
	var prevRay = Ray.createFromPixel(this.renderContext,cx,cy);
	
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

/**
	Zoom to the current observed location
	@param delta Delta zoom
 */
Navigation.prototype.zoom = function(delta)
{
	var previousDistance = this.distance;
	
	this.distance *= (1 + delta * 0.1);
		
	if ( this.distance > this.maxDistance )
	{
		this.distance = this.maxDistance;
	}
	if ( this.distance < this.minDistance )
	{
		this.distance = this.minDistance;
	}

	this.computeViewMatrix();
	
/*	if ( this.hasCollision() )
	{
		this.distance = previousDistance;
		this.computeViewMatrix();
	}*/
}

/**************************************************************************************************************/

/*
	Rotate the navigator
 */
Navigation.prototype.rotate = function(dx,dy)
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


return Navigation

});