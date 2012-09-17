/**************************************************************************************************************/

/** @export
	@constructor
	KeyboardNavigationHandler constructor
	@param options Configuration properties for the KeyboardNavigationHandler :
			<ul>
				<li>panFactor  : Factor for panning within the scene</li>
				<li>zoomFactor : Factor for zooming into the scene</li>
				<li>focusableCanvas : if true set canvas focusable</li>
			</ul>
 */
GlobWeb.KeyboardNavigationHandler = function(options){
	
	this.navigation = null;
	
	// Default options
	this.panFactor = 10.;
	this.zoomFactor = 1.;
	this.focusableCanvas = false;
	
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
	
	if ( this.focusableCanvas )
	{
		var canvas = this.navigation.globe.renderContext.canvas;
		
		// Passing by jquery selector because javascript canvas.focus() seems to not work
		$('#'+canvas.id)
			// Add tab index to ensure the canvas retains focus
			.attr("tabindex", "0")
			// Mouse down override to prevent default browser controls from appearing
			.mousedown(function(){ $(this).focus(); return false; })
			// Set navigation event
			.keydown(function(e){ e.preventDefault(); self.handleKeyDown(e||window.event); });
	}
	else
	{
		document.addEventListener("keydown",function(e) { self.handleKeyDown(e||window.event); },false);
	}
}

/**************************************************************************************************************/

/*
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
			this.navigation.pan( this.panFactor, 0 );
			break;
		case 38 :
			// Up arrow
			this.navigation.pan( 0, this.panFactor );
			break;
		case 39 :
			// Right arrow
			this.navigation.pan( -this.panFactor, 0 );
			break;
		case 40 :
			// Down arrow
			this.navigation.pan( 0, -this.panFactor );
			break;
		
	}
	this.navigation.globe.renderContext.requestFrame();
}