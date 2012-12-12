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
	TrackballNavigation constructor
	@param globe Globe
	@param options Configuration properties for the AstroTrackballNavigation :
		<ul>
			<li>handlers : Array of objects defining navigation events</li>
			<li>minDistance : The minimum distance</li>
			<li>maxDistance : The maximum distance</li>
		</ul>
 */
GlobWeb.TrackballNavigation = function(globe,options)
{
	// Default values for min and max distance (in meter)
	this.minDistance = 1.0;
	this.maxDistance = 3.0 * GlobWeb.CoordinateSystem.realEarthRadius;
	
	GlobWeb.BaseNavigation.prototype.constructor.call( this, globe, options );
	
	// Initialize the navigation
	this.tilt = 90.0;
	this.distance = 3.0 * GlobWeb.CoordinateSystem.radius;
	this.center3d = [ 1.0, 0.0, 0.0 ];
	this.up = [ 0.0, 0.0, 1.0 ];
	
	// Scale min and max distance from meter to internal ratio
	this.minDistance *= GlobWeb.CoordinateSystem.heightScale;
	this.maxDistance *= GlobWeb.CoordinateSystem.heightScale;

	// Update the view matrix now
	this.computeViewMatrix();
}

/**************************************************************************************************************/

GlobWeb.inherits( GlobWeb.BaseNavigation,GlobWeb.TrackballNavigation );

/**************************************************************************************************************/

/** @export
	Zoom to a 3d position
	@param {Float[]} geoPos Array of two floats corresponding to final Longitude and Latitude(in this order) to zoom
	@param {Int} distance Final zooming distance in meters
	@param {Int} duration Duration of animation in milliseconds
	@param {Int} tilt Defines the tilt in the end of animation
*/
GlobWeb.TrackballNavigation.prototype.zoomTo = function(geoPos, distance, duration, tilt )
{
	var navigation = this;
	
	var destDistance = distance || this.distance / (4.0 * GlobWeb.CoordinateSystem.heightScale);
	duration = duration || 5000;
	var destTilt = tilt || 90;
	
	// Create a single animation to animate geoCenter, distance and tilt
	var startGeoPos = vec3.create();
	GlobWeb.CoordinateSystem.from3DToGeo(this.center3d, startGeoPos);
	var startValue = [startGeoPos[0], startGeoPos[1], this.distance, this.tilt];
	var endValue = [geoPos[0], geoPos[1], destDistance * GlobWeb.CoordinateSystem.heightScale, destTilt];
	var animation = new GlobWeb.SegmentedAnimation(
		duration,
		// Value setter
		function(value) {
			GlobWeb.CoordinateSystem.fromGeoTo3D( [ value[0], value[1] ], navigation.center3d);
			navigation.distance = value[2];
			navigation.tilt = value[3];
			navigation.computeViewMatrix();
		});

	// Compute a max altitude for the animation
	var worldStart = this.center3d;
	var worldEnd   = GlobWeb.CoordinateSystem.fromGeoTo3D(geoPos);
	var vec = vec3.subtract(worldStart, worldEnd);
	var len = vec3.length(vec);
	var canvas = this.globe.renderContext.canvas;
	var minFov = Math.min(Numeric.toRadian(45.0),
				Numeric.toRadian(45.0 * canvas.width / canvas.height));
	var maxAltitude = 1.1 * ((len / 2.0) / Math.tan(minFov / 2.0));
	if (maxAltitude > this.distance)
	{
		// Compute the middle value
		var midValue = [startValue[0]*0.5 + endValue[0]*0.5,
				startValue[1]*0.5 + endValue[1]*0.5,
				maxAltitude, destTilt];

		// Add two segments
		animation.addSegment(
		0.0, startValue,
		0.5, midValue,
		function(t, a, b) {
			var pt = Numeric.easeInQuad(t);
			var dt = Numeric.easeOutQuad(t);
			return [Numeric.lerp(pt, a[0], b[0]), // geoPos.long
				Numeric.lerp(pt, a[1], b[1]), // geoPos.lat
				Numeric.lerp(dt, a[2], b[2]), // distance
				Numeric.lerp(t, a[3], b[3])]; // tilt
		});

		animation.addSegment(
		0.5, midValue,
		1.0, endValue,
		function(t, a, b) {
			var pt = Numeric.easeOutQuad(t);
			var dt = Numeric.easeInQuad(t);
			return [Numeric.lerp(pt, a[0], b[0]), // geoPos.long
				Numeric.lerp(pt, a[1], b[1]), // geoPos.lat
				Numeric.lerp(dt, a[2], b[2]), // distance
				Numeric.lerp(t, a[3], b[3])]; // tilt
		});
	}
	else
	{
		// Add only one segments
		animation.addSegment(
		0.0, startValue,
		1.0, endValue,
		function(t, a, b) {
			var pt = Numeric.easeOutQuad(t);
			var dt = Numeric.easeInQuad(t);
			return [Numeric.lerp(pt, a[0], b[0]),  // geoPos.long
				Numeric.lerp(pt, a[1], b[1]),  // geoPos.lat
				Numeric.lerp(dt, a[2], b[2]),  // distance
				Numeric.lerp(t, a[3], b[3])]; // tilt
		});
	}

	animation.onstop = function() {
		navigation.globe.publish("endTrackballNavigation");
	}
	this.globe.addAnimation(animation);
	animation.start();
	
	this.globe.publish("startTrackballNavigation");
}

/**************************************************************************************************************/

/**
	Compute the view matrix
 */
GlobWeb.TrackballNavigation.prototype.computeViewMatrix = function()
{
	// Get the vertical at the center3d position
	var z = vec3.create(this.center3d);
	vec3.normalize(z);
	
	// Clamp the center3d on the earth
	vec3.scale(z,GlobWeb.CoordinateSystem.radius,this.center3d);
	
	// Manage tilt
	if ( this.tilt != 90 )
	{
		var tiltRotation = mat4.create();
		mat4.identity(tiltRotation);
		var x = vec3.create();
		vec3.cross(this.up, z, x);
		mat4.rotate( tiltRotation, (90 - this.tilt) * Math.PI / 180.0, x );
		mat4.multiplyVec3(tiltRotation, z);
	}
		
	// Compute the eye
	var eye = vec3.create();
	vec3.scale(z,this.distance);
	vec3.add( this.center3d, z, eye );

	// Compute view matrix
	var viewMatrix = this.globe.renderContext.viewMatrix;
	mat4.lookAt(eye, this.center3d, this.up, viewMatrix);

	// Reset the up to the computed value by lookat
	this.up = [ viewMatrix[1], viewMatrix[5], viewMatrix[9] ];
}

/**************************************************************************************************************/

/**
	Event handler for mouse wheel
	@param delta Delta zoom
 */
GlobWeb.TrackballNavigation.prototype.zoom = function(delta)
{
	this.globe.publish("startTrackballNavigation");
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
	
	if ( this.hasCollision() )
	{
		this.distance = previousDistance;
		this.computeViewMatrix();
	}
	
	this.globe.publish("endTrackballNavigation");
}

/**************************************************************************************************************/

/**
	Check for collision
 */
GlobWeb.TrackballNavigation.prototype.hasCollision = function()
{
/*	TODO
	var eye = [ this.inverseViewMatrix[12], this.inverseViewMatrix[13], this.inverseViewMatrix[14] ];
	var geoEye = vec3.create();
	GlobWeb.CoordinateSystem.from3DToGeo(eye, geoEye);
	var elevation = this.globe.getElevation( geoEye[0], geoEye[1] );
	
	return geoEye[2] < elevation + 50;*/
	return false;
}

/**************************************************************************************************************/

/**
	Pan the navigation
	@param dx Window delta x
	@param dy Window delta y
*/
GlobWeb.TrackballNavigation.prototype.pan = function(dx, dy)
{
	var x = this.globe.renderContext.canvas.width / 2.;
	var y = this.globe.renderContext.canvas.height / 2.;
	this.center3d = this.globe.renderContext.get3DFromPixel(x - dx, y - dy);
		
	this.computeViewMatrix();
	
}

/**************************************************************************************************************/

/**
	Rotate the navigation
	@param dx Window delta x
	@param dy Window delta y
 */
GlobWeb.TrackballNavigation.prototype.rotate = function(dx,dy)
{
	// Manage tilt
	this.tilt += dy * 0.1;
	if ( this.tilt > 90 )
		this.tilt = 90;
	if (this.tilt < 2 )
		this.tilt = 2;
		
	// Rotate heading
	var angle = dx * 0.1 * Math.PI/180.;
	var rot = quat4.fromAngleAxis(angle,this.center3d);
	quat4.multiplyVec3( rot, this.up );

	this.computeViewMatrix();
	
}

/**************************************************************************************************************/

