/**************************************************************************************************************/

/** @export
	@constructor
	BaseNavigation constructor
 */
GlobWeb.BaseNavigation = function(globe, options)
{
	this.globe = globe;
	this.geoCenter = [0.0, 0.0, 0.0];
	
	this.heading = 0.0;
	this.tilt = 90.0;
	
	this.callbacks = {};
	
	// Copy options
	for (var x in options)
	{
		this[x] = options[x];
	}
	
	// Create handler if not passed in options before
	if( !this.handlers )
	{
		this.handlers = [new GlobWeb.MouseNavigationHandler({ zoomOnDblClick : true }), new GlobWeb.KeyboardNavigationHandler()];
	}
	
	// Install handlers
	for (var i=0; i<this.handlers.length; i++){
		this.handlers[i].install(this);
	}
}


/**************************************************************************************************************/

/** @export
  Subscribe to a navigation event : start (called when navigation is started), and end (called when navigation end)
*/
GlobWeb.BaseNavigation.prototype.subscribe = function(name,callback)
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
GlobWeb.BaseNavigation.prototype.unsubscribe = function(name,callback)
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
GlobWeb.BaseNavigation.prototype.publish = function(name)
{
	if ( this.callbacks[name] ) {
		var cbs = this.callbacks[name];
		for ( var i = 0; i < cbs.length; i++ ) {
			cbs[i]();
		}
	}
}