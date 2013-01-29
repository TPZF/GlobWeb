/**************************************************************************************************************/

/** @export
	@constructor
	BaseNavigation constructor

	@param globe Globe
	@param options Configuration options
		<ul>
			<li>handlers : Array of objects defining navigation events for different supports(mouse, keyboard..)</li>
			<li>inertia : Boolean for inertia effect</li>
		</ul>

 */
GlobWeb.BaseNavigation = function(globe, options)
{
	this.globe = globe;

	// Copy options
	for (var x in options)
	{
		this[x] = options[x];
	}
	
	// Create default handlers if none are created in options
	if ( !this.handlers ) 
	{
		this.handlers = [new GlobWeb.MouseNavigationHandler({ zoomOnDblClick : true }), new GlobWeb.KeyboardNavigationHandler()];
	}
	
	// Inertia effect
	if( options && options.inertia )
	{
		this.inertia = new GlobWeb.InertiaAnimation(this);
	}
	// ZoomTo animation
	this.zoomToAnimation = null;

	// Automatically start
	this.start();
}

/**************************************************************************************************************/

/** @export
	Start the navigation
*/
GlobWeb.BaseNavigation.prototype.start = function()
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
GlobWeb.BaseNavigation.prototype.stop = function()
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
GlobWeb.BaseNavigation.prototype.stopAnimations = function()
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
GlobWeb.BaseNavigation.prototype.getFov = function()
{
	var aspect = this.globe.renderContext.canvas.width / this.globe.renderContext.canvas.height;
	return [ aspect * this.globe.renderContext.fov, this.globe.renderContext.fov ];
}

/**************************************************************************************************************/