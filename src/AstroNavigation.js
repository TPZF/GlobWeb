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
	this['minFov'] = 0.25;
	this['maxFov'] = 100;
	
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
GlobWeb.AstroNavigation.prototype.zoomTo = function(geoPos, fov, duration)
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
	
	// Compute the shortest path if needed
	if (Math.abs(geoPos[0] - geoStart[0]) > 180. )
	{
		if (geoStart[0] < geoPos[0])
			startValue[0] += 360;
		else
			endValue[0] +=360;
	}
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
		
		// Add only one segment
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

/** @export
	Zoom to a 3d position
	@param {Float[]} geoPos Array of two floats corresponding to final Longitude and Latitude(in this order) to zoom
	@param {Int} duration Duration of animation in milliseconds
 */
GlobWeb.AstroNavigation.prototype.moveTo = function(geoPos, duration )
{
	var navigator = this;
	
	duration = duration || 5000;
	
	// Create a single animation to animate center3d and fov
	var geoStart = [];
	GlobWeb.CoordinateSystem.from3DToGeo(this.center3d, geoStart);
	
	var startValue = [geoStart[0], geoStart[1], this.globe.renderContext.fov];
	var endValue = [geoPos[0], geoPos[1], this.globe.renderContext.fov];
	
	// Compute the shortest path if needed
	if (Math.abs(geoPos[0] - geoStart[0]) > 180. )
	{
		if (geoStart[0] < geoPos[0])
			startValue[0] += 360;
		else
			endValue[0] +=360;
	}
	
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
			
		}
	);
	
	animation.addSegment(
		0.0, startValue,
		1.0, endValue,
		function(t, a, b) {
			var pt = Numeric.easeOutQuad(t);
			var dt = Numeric.easeInQuad(t);
			return [Numeric.lerp(pt, a[0], b[0]),  // geoPos.long
				Numeric.lerp(pt, a[1], b[1]),  // geoPos.lat
				Numeric.lerp(dt, a[2], b[2])];  // fov
		}
	);

	animation.onstop = function() {
		navigator.globe.publish("endNavigation");
	}
	
	this.globe.addAnimation(animation);
	animation.start();
	
	this.globe.publish("startNavigation");
}

/**************************************************************************************************************/

/**
	Compute the view matrix
 */
GlobWeb.AstroNavigation.prototype.computeViewMatrix = function()
{
	var eye = [];
	vec3.normalize(this.center3d);
	
	var vm = this.globe.renderContext.viewMatrix;

	mat4.lookAt([0., 0., 0.], this.center3d, this.up, vm);
	// mat4.inverse( vm );
	// mat4.rotate(vm, this.heading * Math.PI/180., [1., 0., 0.])
	// mat4.inverse( vm );

	this.up = [ vm[1], vm[5], vm[9] ];

}

/**************************************************************************************************************/

/**
	Event handler for mouse wheel
	@param delta Delta zoom
 */
GlobWeb.AstroNavigation.prototype.zoom = function(delta)
{
	this.globe.publish("startNavigation");
	// Arbitrary value for smooth zooming
	delta = 1 + delta * 0.1;
	
	// Check differences between firefox and the rest of the world 
	this.globe.renderContext.fov *= delta;
	
	if ( this.globe.renderContext.fov > this['maxFov'] )
	{
		this.globe.renderContext.fov = this['maxFov'];
	}
	if ( this.globe.renderContext.fov < this['minFov'] )
	{
		this.globe.renderContext.fov = this['minFov'];
	}
	
	this.computeViewMatrix();
	
// 	this.globe.renderContext.requestFrame();
	
	this.globe.publish("endNavigation");
	
	// Return false to stop mouse wheel to be propagated when using onmousewheel
// 	return false;
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

/**
	Rotate the navigator
	@param dx Window delta x
	@param dy Window delta y
 */
GlobWeb.AstroNavigation.prototype.rotate = function(dx,dy)
{
	var u = this.center3d[0];
	var v = this.center3d[1];
	var w = this.center3d[2];
	// constant tiny angle 
	var angle = dx * 0.5 * Math.PI/180.;

	// Rotation matrix around look(center3d - origin) vector ... simplier solution required..
	var rotationMatrix = mat4.create(
		[ u*u + ( 1-u*u )*Math.cos(angle), u*v*(1 - Math.cos(angle)) - w * Math.sin(angle), u*w*(1-Math.cos(angle)) + v*Math.sin(angle), 0,
		u*v*(1 - Math.cos(angle)) + w*Math.sin(angle), v*v+(1 - v*v)*Math.cos(angle), v*w*(1 - Math.cos(angle)) - u*Math.sin(angle), 0,
		u*w*(1 - Math.cos(angle)) - v*Math.sin(angle), v*w*(1 - Math.cos(angle)) + u*Math.sin(angle), w*w + (1-w*w)*Math.cos(angle) , 0,
		0, 0, 0, 1 ]
		);

	// Recompute up vector
	mat4.multiplyVec3( rotationMatrix, this.up );

	this.computeViewMatrix();
}

/**************************************************************************************************************/

