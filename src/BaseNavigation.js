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

define( ['./Utils', './Event', './MouseNavigationHandler', './KeyboardNavigationHandler', './InertiaAnimation' ], 
	function(Utils,Event,MouseNavigationHandler,KeyboardNavigationHandler,InertiaAnimation) {

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
		this.handlers = [ new MouseNavigationHandler(options ? options.mouse : null), new KeyboardNavigationHandler(options ? options.keyboard : null) ];
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

return BaseNavigation;

});
