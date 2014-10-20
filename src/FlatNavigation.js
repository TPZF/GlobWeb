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

 define(['./Utils', './BaseNavigation', './Ray', './glMatrix'],
  function(Utils,BaseNavigation,Ray) {

/**************************************************************************************************************/

/** @name FlatNavigation
	@class
	Manages the navigation in the Globe in flat mode.
	@augments BaseNavigation
	
	@param globe Globe
	@param options Configuration properties for the FlatNavigation :
		<ul>
			<li>minDistance : The minimum distance</li>
			<li>maxDistance : The maximum distance</li>
		</ul>
 */
var FlatNavigation = function(globe,options)
{
	BaseNavigation.prototype.constructor.call( this, globe.renderContext, options );

	this.globe = globe;
		
	// Default values for min and max distance (in meter)
	this.minDistance = (options && options.minDistance) || 0.01;
	this.maxDistance = (options && options.maxDistance) || 7.0;
	
	// Initialize the navigation
	this.geoCenter = [0.0, 0.0, 0.0];
	this.distance = 7.0 * this.globe.coordinateSystem.radius;
	this.up = [0., 1., 0.];
	this.eye = [0.0, 0.0, this.distance];
	
	this.computeViewMatrix();

}

/**************************************************************************************************************/

Utils.inherits( BaseNavigation,FlatNavigation );

/**************************************************************************************************************/

/** 
	Save the current navigation state.
	@return a JS object containing the navigation state
*/
FlatNavigation.prototype.save = function()
{
	return {
		geoCenter: this.geoCenter,
		eye: this.eye,
		up: this.up
	};
}

/**************************************************************************************************************/

/** 
	Restore the navigation state.
	@param state a JS object containing the navigation state
*/
FlatNavigation.prototype.restore = function(state)
{
	this.geoCenter = state.geoCenter;
	this.eye = state.eye;
	this.up = state.up;
	this.computeViewMatrix();
}

/**************************************************************************************************************/

/**
	Compute the view matrix
 */
FlatNavigation.prototype.computeViewMatrix = function()
{
	var eye = [];
	//vec3.normalize(this.geoCenter);
	var vm = this.renderContext.viewMatrix;

	mat4.lookAt( this.eye, this.geoCenter, this.up, vm );
	this.up = [ vm[1], vm[5], vm[9] ];
	this.publish("modified");
	this.renderContext.requestFrame();
}

/**************************************************************************************************************/

/**
	Zoom to the current observed location
	@param delta Delta zoom
 */
FlatNavigation.prototype.zoom = function(delta,scale)
{
	var previousDistance = this.eye[2];
	
	// TODO : improve zoom, using scale or delta ? We should use scale always
	if (scale)
		this.distance *= scale;
	else
		this.distance *= (1 + delta * 0.1);
		
	if ( this.distance > this.maxDistance )
	{
		this.distance = this.maxDistance;
	}
	if ( this.distance < this.minDistance )
	{
		this.distance = this.minDistance;
	}

	// Update eye depending on distance : remove distance attribute ?
	this.eye[2] = this.distance;

	this.computeViewMatrix();
}

/**************************************************************************************************************/

/**
	Pan the navigation
	@param dx Window delta x
	@param dy Window delta y
*/
FlatNavigation.prototype.pan = function(dx, dy)
{
	var x = this.renderContext.canvas.width / 2.;
	var y = this.renderContext.canvas.height / 2.;

	var ray = Ray.createFromPixel(this.renderContext, x - dx, y - dy);
	this.geoCenter = ray.computePoint( ray.planeIntersect( [0,0,0], [0,0,1] ) );
	vec3.subtract(this.geoCenter, [0,0,-this.distance], this.eye);
		
	this.computeViewMatrix();
}

/**************************************************************************************************************/

/**
	Rotate the navigation
	@param dx Window delta x
	@param dy Window delta y
 */
FlatNavigation.prototype.rotate = function(dx,dy)
{
	// Constant tiny angle 
	var angle = -dx * 0.1 * Math.PI/180.;

	var axe = vec3.create();
	vec3.subtract(this.geoCenter, this.eye, axe);
	vec3.normalize(axe);
	var rot = quat4.fromAngleAxis(angle,axe);
	quat4.multiplyVec3( rot, this.up );
	
	this.computeViewMatrix();
}

/**************************************************************************************************************/

return FlatNavigation;

});
