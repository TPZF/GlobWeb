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

define( ['./Utils', './Event', './MouseNavigationHandler', './KeyboardNavigationHandler', './TouchNavigationHandler', './InertiaAnimation', './SegmentedAnimation', './Numeric', './glMatrix' ], 
	function(Utils,Event,MouseNavigationHandler,KeyboardNavigationHandler,TouchNavigationHandler,InertiaAnimation,SegmentedAnimation,Numeric) {

/**************************************************************************************************************/

/** @name BaseNavigation
	@constructor
	Base class for navigation object

	@param renderContext Render context
	@param options Configuration options
		<ul>
			<li>handlers : Array of objects defining navigation events for different supports(mouse, keyboard..)</li>
			<li>inertia : Boolean for inertia effect</li>
			<li>panFactor : Pan factor</li>
			<li>rotateFactor : Rotate factor</li>
			<li>zoomFactor : Zoom factor</li>
			<li>isMobile : Boolean indicating if navigation supports touch events</li>
		</ul>

 */
var BaseNavigation = function(renderContext, options)
{
	Event.prototype.constructor.call( this );
	
	this.renderContext = renderContext;

	// Create default handlers if none are created in options
	if ( options && options.handlers ) 
	{
		this.handlers = options.handlers;
	}
	else
	{
		// Use mouse & keyboard as default handlers if isMobile isn't defined
		if ( options && options.isMobile )
		{
			this.handlers = [ new TouchNavigationHandler(options ? options.touch : null) ];	
		}
		else
		{
			this.handlers = [ new MouseNavigationHandler(options ? options.mouse : null), new KeyboardNavigationHandler(options ? options.keyboard : null) ];
		}
	}
	
	// Inertia effect
	if( options && options.inertia )
	{
		this.inertia = new InertiaAnimation(this, options);
	}
	// ZoomTo animation
	this.zoomToAnimation = null;

	// Automatically start
	this.start();
}

/**************************************************************************************************************/

Utils.inherits( Event, BaseNavigation );

/**************************************************************************************************************/

/** @export
	Start the navigation
*/
BaseNavigation.prototype.start = function()
{
	// Install handlers
	for (var i=0; i<this.handlers.length; i++)
	{
		this.handlers[i].install(this);
	}
}

/**************************************************************************************************************/

/** @export
	Stop the navigation
*/
BaseNavigation.prototype.stop = function()
{
	// Uninstall handlers
	for (var i=0; i<this.handlers.length; i++)
	{
		this.handlers[i].uninstall();
	}
}

/**************************************************************************************************************/

/** @export
	Stop the animations running on the navigation
*/
BaseNavigation.prototype.stopAnimations = function()
{
	if ( this.inertia )
	{
		this.inertia.stop();
	}
	if( this.zoomToAnimation )
	{
		this.zoomToAnimation.stop();
		this.zoomToAnimation = null;
	}
}

/**************************************************************************************************************/

/** @export
	Get the field of view used by the navigation
	
	@return {Float[]} Fovx and fovy in degrees
*/
BaseNavigation.prototype.getFov = function()
{
	var aspect = this.renderContext.canvas.width / this.renderContext.canvas.height;
	return [ aspect * this.renderContext.fov, this.renderContext.fov ];
}

/**************************************************************************************************************/

/**
	Basic animation from current view matrix to the given one
	@param {Array[16]} mat Destination view matrix
	@param {Int} fov Final zooming fov in degrees
	@param {Int} duration Duration of animation in milliseconds
	@param {Function} callback Callback on the end of animation
 */
BaseNavigation.prototype.toViewMatrix = function(mat, fov, duration, callback)
{
	var navigation = this;
	var vm = this.renderContext.viewMatrix;

	var srcViewMatrix = mat4.toMat3( vm );
	var srcQuat = quat4.fromRotationMatrix( srcViewMatrix );
	var destViewMatrix = mat4.toMat3( mat );
	var destQuat = quat4.fromRotationMatrix( destViewMatrix );	
	var destFov = fov || 45;
	duration = duration || 1000;

	// Animate rotation matrix(with quaternion support), tranlation and fov
	var startValue = [srcQuat, [vm[12], vm[13], vm[14]], navigation.renderContext.fov];
	var endValue = [destQuat, [mat[12],mat[13],mat[14]], destFov];
	var animation = new SegmentedAnimation(
		duration,
		// Value setter
		function(value) {
			// Update rotation matrix
			var newRotationMatrix = quat4.toMat4(value[0]);
			// Need to transpose the new rotation matrix due to bug in glMatrix
			navigation.renderContext.viewMatrix = mat4.transpose(newRotationMatrix);

			// Update translation
			navigation.renderContext.viewMatrix[12] = value[1][0];
		    navigation.renderContext.viewMatrix[13] = value[1][1];
		    navigation.renderContext.viewMatrix[14] = value[1][2];

		    // Update fov
		    navigation.renderContext.fov = value[2];

			navigation.renderContext.requestFrame();
		});

	// Add segment
	animation.addSegment(
		0.0, startValue,
		1.0, endValue,
		function(t, a, b) {
			var pt = Numeric.easeOutQuad(t);
			var resQuat = quat4.create();
			quat4.slerp(a[0], b[0], pt, resQuat);

			var resTranslate = vec3.create();
			vec3.lerp(a[1], b[1], pt, resTranslate);
			
			var resFov = Numeric.lerp(pt, a[2], b[2]);
			return [resQuat,		// quaternions
					resTranslate,	// translate
					resFov]; 		// fov
		}
	);

	animation.onstop = function() {
		if ( callback )
		{
			callback();
		}
	}

	this.globe.addAnimation(animation);
	animation.start();
}

/**************************************************************************************************************/

return BaseNavigation;

});
