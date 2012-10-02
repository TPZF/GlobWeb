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
	AstroNavigator constructor
	@param globe Globe
	@param options Configuration properties for the AstroNavigation :
		<ul>
			<li>handlers : Array of objects defining navigation events</li>
			<li>minFov : The minimum field of view in degrees</li>
			<li>maxFov : The maximum field of view in degrees</li>
		</ul>
 */
GlobWeb.AstroNavigation = function(globe, options)
{
	// Default values for fov (in degrees)
	this.minFov = 0.25;
	this.maxFov = 100;
	
	GlobWeb.BaseNavigation.prototype.constructor.call( this, globe, options );

	// Initialize the navigator
	this.center3d = [1.0, 0.0, 0.0];
	this.up = [0., 0., 1.]
	
	// Update the view matrix now
	this.computeViewMatrix();
}

/**************************************************************************************************************/

GlobWeb.inherits( GlobWeb.BaseNavigation,GlobWeb.AstroNavigation );

/**************************************************************************************************************/

/** @export
	Zoom to a 3d position
	@param {Float[]} geoPos Array of two floats corresponding to final Longitude and Latitude(in this order) to zoom
	@param {Int} fov Final zooming fov in degrees
	@param {Int} duration Duration of animation in milliseconds
 */
GlobWeb.AstroNavigation.prototype.zoomTo = function(geoPos, fov, duration )
{
	var navigator = this;
	
	// default values
	var destFov = fov || 15.0;
	duration = duration || 5000;
	
	// Create a single animation to animate center3d and fov
	var geoStart = [];
	var middleFov = 45.0;	// arbitrary middle fov value which determines if the animation needs two segments
	
	GlobWeb.CoordinateSystem.from3DToGeo(this.center3d, geoStart);
	var startValue = [geoStart[0], geoStart[1], this.globe.renderContext.fov];
	var endValue = [geoPos[0], geoPos[1], destFov];
	
	var animation = new GlobWeb.SegmentedAnimation(
		duration,
		// Value setter
		function(value) {
			var position3d = GlobWeb.CoordinateSystem.fromGeoTo3D( [ value[0], value[1] ] );
			navigator.center3d[0] = position3d[0];
			navigator.center3d[1] = position3d[1];
			navigator.center3d[2] = position3d[2];
			this.globe.renderContext.fov = value[2];
			navigator.computeViewMatrix();
		});
	
	if (middleFov > this.globe.renderContext.fov)
	{
		// Two steps animation, 'rising' & 'falling'
		
		// Compute the middle value
		var midValue = [startValue[0]*0.5 + endValue[0]*0.5,
			startValue[1]*0.5 + endValue[1]*0.5,
			middleFov];

		// Add two segments
		animation.addSegment(
			0.0, startValue,
			0.5, midValue,
			function(t, a, b) {
				var pt = Numeric.easeInQuad(t);
				var dt = Numeric.easeOutQuad(t);
				return [Numeric.lerp(pt, a[0], b[0]), // geoPos.long
					Numeric.lerp(pt, a[1], b[1]), // geoPos.lat
					Numeric.lerp(dt, a[2], b[2])]; // fov
			});

		animation.addSegment(
			0.5, midValue,
			1.0, endValue,
			function(t, a, b) {
				var pt = Numeric.easeOutQuad(t);
				var dt = Numeric.easeInQuad(t);
				return [Numeric.lerp(pt, a[0], b[0]), // geoPos.long
					Numeric.lerp(pt, a[1], b[1]), // geoPos.lat
					Numeric.lerp(dt, a[2], b[2])]; // fov
		});
	}
	else
	{
		// One step animation, 'falling' only
		
		// Add only one segments
		animation.addSegment(
			0.0, startValue,
			1.0, endValue,
			function(t, a, b) {
				var pt = Numeric.easeOutQuad(t);
				var dt = Numeric.easeInQuad(t);
				return [Numeric.lerp(pt, a[0], b[0]),  // geoPos.long
					Numeric.lerp(pt, a[1], b[1]),  // geoPos.lat
					Numeric.lerp(dt, a[2], b[2])];  // fov
		});
	}

	animation.onstop = function() {
		navigator.globe.publish("endNavigation");
	}
	
	this.globe.addAnimation(animation);
	animation.start();
	
	this.globe.publish("startNavigation");
}

/**************************************************************************************************************/

/*
	Compute the view matrix
 */
GlobWeb.AstroNavigation.prototype.computeViewMatrix = function()
{
	var eye = [];
	vec3.normalize(this.center3d);
	
	var vm = this.globe.renderContext.viewMatrix;
	
	mat4.lookAt([0., 0., 0.], this.center3d, this.up, vm);
	this.up = [ vm[1], vm[5], vm[9] ];

}

/**************************************************************************************************************/

/*
	Event handler for mouse wheel
	@param delta Delta zoom
 */
GlobWeb.AstroNavigation.prototype.zoom = function(delta)
{
	// Arbitrary value for smooth zooming
	delta = 1 + delta * 0.1;
	
	// Check differences between firefox and the rest of the world 
	this.globe.renderContext.fov *= delta;
	
	if ( this.globe.renderContext.fov > this.maxFov )
	{
		this.globe.renderContext.fov = this.maxFov;
	}
	if ( this.globe.renderContext.fov < this.minFov )
	{
		this.globe.renderContext.fov = this.minFov;
	}
	
	this.computeViewMatrix();
	
	this.globe.renderContext.requestFrame();
		
	// Return false to stop mouse wheel to be propagated when using onmousewheel
	return false;
}

/**************************************************************************************************************/

/**
	Pan the navigator by computing the difference between 3D centers
	@param dx Window delta x
	@param dy Window delta y
 */
GlobWeb.AstroNavigation.prototype.pan = function(dx, dy)
{
	var pixelSource = [this.globe.renderContext.canvas.width / 2., this.globe.renderContext.canvas.height / 2.];
	var dest3d = this.globe.renderContext.get3DFromPixel(pixelSource[0] + dx, pixelSource[1] + dy);
	
	// Compute direction vector
	var dir = [];
	vec3.subtract(dest3d, this.center3d, dir);
	
	// Translate center3d by direction
	vec3.subtract(this.center3d, dir, this.center3d);
	
	this.computeViewMatrix();
	
}

/**************************************************************************************************************/

/*
	Rotate the navigator
	@param dx Window delta x
	@param dy Window delta y
 */
GlobWeb.AstroNavigation.prototype.rotate = function(dx,dy)
{
	// AstroNavigation cannot rotate
}

/**************************************************************************************************************/

