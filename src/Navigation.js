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
	@param globe Globe
	@param options Configuration properties for the AstroNavigation :
		<ul>
			<li>handler : object defining navigation events</li>
		</ul>
 */
GlobWeb.Navigation = function(globe,options)
{
	this.globe = globe;
	this.inverseViewMatrix = mat4.create();
	
	this.minDistance = 1.0;
	this.maxDistance = 3.0 * GlobWeb.CoordinateSystem.realEarthRadius;

	// Initialize the navigation
	this.geoCenter = [0.0, 0.0, 0.0];
	this.distance = 3.0 * GlobWeb.CoordinateSystem.radius;
	this.heading = 0.0;
	this.tilt = 90.0;
	
	// Copy options
	for (var x in options)
	{
		this[x] = options[x];
	}
	
	if( !this.handler )
	{
		this.handler = new GlobWeb.MouseNavigationHandler({ zoomOnDblClick: true });
	}
	this.handler.install(this);
	
	this.minDistance *= GlobWeb.CoordinateSystem.heightScale;
	this.maxDistance *= GlobWeb.CoordinateSystem.heightScale;
	
	this.callbacks = {};

	// Update the view matrix now
	this.computeViewMatrix();
}

/**************************************************************************************************************/

/** @export
	Subscribe to a navigation event : start (called when navigation is started), and end (called when navigation end)
*/
GlobWeb.Navigation.prototype.subscribe = function(name,callback)
{
	if( !this.callbacks[name] ) {
		this.callbacks[name] = [ callback ];
	} else {
		this.callbacks[name].push( callback );
	}
}

/**************************************************************************************************************/

/** @export
	Unsubscribe to a navigation event : start (called when navigation is started), and end (called when navigation end)
*/
GlobWeb.Navigation.prototype.unsubscribe = function(name,callback)
{
	if( this.callbacks[name] ) {
		var i = this.callbacks[name].indexOf( callback );
		if ( i != -1 ) {
			this.callbacks[name].splice(i,1);
		}
	}
}

/**************************************************************************************************************/

/** 
	Publish a navigation event
*/
GlobWeb.Navigation.prototype.publish = function(name)
{
	if ( this.callbacks[name] ) {
		var cbs = this.callbacks[name];
		for ( var i = 0; i < cbs.length; i++ ) {
			cbs[i]();
		}
	}
}

/**************************************************************************************************************/

/** @export
	Zoom to a 3d position
	@param {Float[]} geoPos Array of two floats corresponding to final Longitude and Latitude(in this order) to zoom
	@param {Int} distance Final zooming distance in meters
	@param {Int} duration Duration of animation in milliseconds
	@param {Int} tilt Defines the tilt in the end of animation
*/
GlobWeb.Navigation.prototype.zoomTo = function(geoPos, distance, duration, tilt )
{
	var navigation = this;
	
	var destDistance = distance || this.distance / (4.0 * GlobWeb.CoordinateSystem.heightScale);
	duration = duration || 5000;
	var destTilt = tilt || 90;
	
	// Create a single animation to animate geoCenter, distance and tilt
	var startValue = [this.geoCenter[0], this.geoCenter[1], this.distance, this.tilt];
	var endValue = [geoPos[0], geoPos[1], destDistance * GlobWeb.CoordinateSystem.heightScale, destTilt];
	var animation = new GlobWeb.SegmentedAnimation(
		duration,
		// Value setter
		function(value) {
			navigation.geoCenter[0] = value[0];
			navigation.geoCenter[1] = value[1];
			navigation.distance = value[2];
			navigation.tilt = value[3];
			navigation.computeViewMatrix();
		});

	// Compute a max altitude for the animation
	var worldStart = GlobWeb.CoordinateSystem.fromGeoTo3D(this.geoCenter);
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
		navigation.publish("end");
	}
	this.globe.addAnimation(animation);
	animation.start();
	
	this.publish("start");
}

/**************************************************************************************************************/

/*
	Compute the inverse view matrix
 */
GlobWeb.Navigation.prototype.applyLocalRotation = function(matrix)
{
	mat4.rotate( matrix, (this.heading) * Math.PI / 180.0, [ 0.0, 0.0, 1.0 ] );
	mat4.rotate( matrix, (90 - this.tilt) * Math.PI / 180.0, [ 1.0, 0.0, 0.0 ] );
}

/**************************************************************************************************************/

/*
	Compute the view matrix
 */
GlobWeb.Navigation.prototype.computeViewMatrix = function()
{
    this.computeInverseViewMatrix();
	mat4.inverse( this.inverseViewMatrix, this.globe.renderContext.viewMatrix );
}

/**************************************************************************************************************/

/*
	Compute the inverse view matrix
 */
GlobWeb.Navigation.prototype.computeInverseViewMatrix = function()
{
    GlobWeb.CoordinateSystem.getLHVTransform(this.geoCenter, this.inverseViewMatrix);
	this.applyLocalRotation(this.inverseViewMatrix);
	mat4.translate( this.inverseViewMatrix, [0.0, 0.0, this.distance] );
}

/**************************************************************************************************************/

/*
	Event handler for mouse wheel
	@param delta Delta zoom
 */
GlobWeb.Navigation.prototype.zoom = function(delta)
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
	
	if ( this.hasCollision() )
	{
		this.distance = previousDistance;
		this.computeViewMatrix();
	}
}

/**************************************************************************************************************/

/*
	Check for collision
 */
GlobWeb.Navigation.prototype.hasCollision = function()
{
	var eye = [ this.inverseViewMatrix[12], this.inverseViewMatrix[13], this.inverseViewMatrix[14] ];
	var geoEye = vec3.create();
	GlobWeb.CoordinateSystem.from3DToGeo(eye, geoEye);
	var elevation = this.globe.getElevation( geoEye[0], geoEye[1] );
	
	return geoEye[2] < elevation + 50;
}

/**************************************************************************************************************/

/*
*	Pan the navigation
	@param dx Window delta x
	@param dy Window delta y
*/
GlobWeb.Navigation.prototype.pan = function(dx, dy)
{
	var previousGeoCenter = vec3.create();
	vec3.set( this.geoCenter, previousGeoCenter );
	
	// Get geographic frame
	var local2World = mat4.create();
	GlobWeb.CoordinateSystem.getLocalTransform(this.geoCenter, local2World);
	// Then corresponding vertical axis and north
	var z = vec3.create(); var previousNorth = vec3.create([0.0, 1.0, 0.0]);
	GlobWeb.CoordinateSystem.getUpVector( local2World, z );
	//GlobWeb.CoordinateSystem.getFrontVector( local2World, previousNorth );
	mat4.multiplyVec3(local2World, previousNorth, previousNorth);
	
	// Then apply local transform
	this.applyLocalRotation(local2World);
	// Retrieve corresponding axes
	var x = vec3.create(); var y = vec3.create();
	GlobWeb.CoordinateSystem.getSideVector( local2World, x );
	GlobWeb.CoordinateSystem.getFrontVector( local2World, y );
	// According to our local configuration, up is y and side is x
	
	// Compute direction axes
	vec3.cross(z, x, y);
	vec3.cross(y, z, x);
	vec3.normalize(x, x);
	vec3.normalize(y, y);
	
	//Normalize dx and dy
	dx = dx / this.globe.renderContext.canvas.width;
	dy = dy / this.globe.renderContext.canvas.height;
	
	// Move accordingly
	var position = vec3.create();
	GlobWeb.CoordinateSystem.fromGeoTo3D(this.geoCenter, position);
	vec3.scale(x, dx * this.distance, x);
	vec3.scale(y, dy * this.distance, y);
	vec3.subtract(position, x, position);
	vec3.add(position, y, position);
	
	// Clamp onto sphere
	vec3.normalize(position);
	vec3.scale(position, GlobWeb.CoordinateSystem.radius);
	
	// Update geographic center
	GlobWeb.CoordinateSystem.from3DToGeo(position, this.geoCenter);

	// Compute new north axis
	var newNorth = vec3.create([0.0, 1.0, 0.0]);
	GlobWeb.CoordinateSystem.getLocalTransform(this.geoCenter, local2World);
	mat4.multiplyVec3(local2World, newNorth, newNorth);
	
	// Take care if we traverse the pole, ie the north is inverted
	if ( vec3.dot(previousNorth, newNorth) < 0 )
	{
		this.heading = (this.heading + 180.0) % 360.0;
	}
		
	// Check for collision with terrain
	this.computeViewMatrix();
	
	if ( this.hasCollision() )
	{
		this.geoCenter = previousGeoCenter;
		this.computeViewMatrix();
	}
}

/**************************************************************************************************************/

/*
	Rotate the navigation
	@param dx Window delta x
	@param dy Window delta y
 */
GlobWeb.Navigation.prototype.rotate = function(dx,dy)
{
	var previousHeading = this.heading;
	var previousTilt = this.tilt;
	
	this.heading += dx * 0.1;
	this.tilt += dy * 0.1;
	
	this.computeViewMatrix();

	if ( this.hasCollision() )
	{
		this.heading = previousHeading;
		this.tilt = previousTilt;
		this.computeViewMatrix();
	}
}

/**************************************************************************************************************/

