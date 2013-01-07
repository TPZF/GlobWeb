/**************************************************************************************************************/

/** @export
	@constructor
	KeyboardNavigationHandler constructor
	@param options Configuration properties for the KeyboardNavigationHandler :
			<ul>
				<li>panFactor  : Factor for panning within the scene</li>
				<li>zoomFactor : Factor for zooming into the scene</li>
				<li>installOnDocument : True to install the event listener on the document and not on the canvas</li>
			</ul>
 */
GlobWeb.KeyboardNavigationHandler = function(options){
	
	this.navigation = null;
	
	// Default options
	this.panFactor = 10.;
	this.zoomFactor = 1.;
	this.installOnDocument = false;
	
	// Override options
	for (var x in options)
	{
		this[x] = options[x];
	}
}

/**************************************************************************************************************/

/** 
	Setup the default event handlers for the navigation
 */
GlobWeb.KeyboardNavigationHandler.prototype.install = function(navigation)
{
	// Setup the keyboard event handlers
	this.navigation = navigation;
	
	var self = this;
	
	if ( this.installOnDocument )
	{
		document.addEventListener("keydown",function(e) { self.handleKeyDown(e||window.event); },false);
	}
	else
	{
		var canvas = this.navigation.globe.renderContext.canvas;
		canvas.addEventListener("keydown",function(e) { self.handleKeyDown(e||window.event); },false);
		// Setup focus handling to receive keyboard event on canvas
		canvas.tabIndex = "0";
		canvas.addEventListener("mousedown", function(){ this.focus(); return false; });
	}
}

/**************************************************************************************************************/

/**
	Event handler for key down
*/
GlobWeb.KeyboardNavigationHandler.prototype.handleKeyDown = function(event)
{
	switch( event.keyCode ){
		case 33 :
			// Page Up
			this.navigation.zoom(-this.zoomFactor);
			break;
		case 34 :
			// Page Down
			this.navigation.zoom(this.zoomFactor);
			break;
		case 37 :
			// Left arrow
			if ( event.ctrlKey )
			{
				this.navigation.rotate( -this.panFactor, 0 );
			}
			else
			{
				this.navigation.pan( this.panFactor, 0 );
			}
			break;
		case 38 :
			// Up arrow
			this.navigation.pan( 0, this.panFactor );
			break;
		case 39 :
			// Right arrow
			if ( event.ctrlKey )
			{
				this.navigation.rotate( this.panFactor, 0 );
			}
			else
			{
				this.navigation.pan( -this.panFactor, 0 );
			}
			break;
		case 40 :
			// Down arrow
			this.navigation.pan( 0, -this.panFactor );
			break;
	}
	this.navigation.globe.renderContext.requestFrame();
}