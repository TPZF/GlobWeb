/**************************************************************************************************************/

/** @export
	@constructor
	BaseNavigation constructor
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

	// Install handlers
	for (var i=0; i<this.handlers.length; i++)
	{
		this.handlers[i].install(this);
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