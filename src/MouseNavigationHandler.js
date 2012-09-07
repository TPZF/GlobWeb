/**************************************************************************************************************/

/** @export
	@constructor
	MouseNavigationHandler constructor
 */
GlobWeb.MouseNavigationHandler = function(options){
	
	this.navigator = null;
	this.pressedButton = -1;
	
	// Copy options
	for (var x in options)
	{
		this[x] = options[x];
	}
	
}

/**************************************************************************************************************/

/** 
 Setup the default event handlers for the navigator
 */
GlobWeb.MouseNavigationHandler.prototype.install = function(nav, zoomOnDblClick)
{
	// Setup the mouse event handlers
	this.navigator = nav;
	
	var canvas = this.navigator.globe.renderContext.canvas;
	var self = this;	
	
	canvas.addEventListener("mousedown",function(e) { self.handleMouseDown(e||window.event); },false);
	document.addEventListener("mouseup",function(e) { self.handleMouseUp(e||window.event); },false);
	canvas.addEventListener("mousemove",function(e) { self.handleMouseMove(e||window.event); },false);
	
	if ( zoomOnDblClick )
		canvas.addEventListener("dblclick",function(e) { self.handleMouseDblClick(e||window.event); },false);
		
	// For Firefox
	canvas.addEventListener("DOMMouseScroll",function(e) { self.handleMouseWheel(e||window.event); },false);
	canvas.addEventListener("mousewheel",function(e) { self.handleMouseWheel(e||window.event); },false);
}

/**************************************************************************************************************/

/** 
 Setup the default event handlers for the navigator
 */
GlobWeb.MouseNavigationHandler.prototype.uninstall = function()
{
	// Setup the mouse event handlers
	var canvas = this.navigator.globe.renderContext.canvas;

	canvas.removeEventListener("mousedown",function(e) { self.handleMouseDown(e||window.event); },false);
	document.removeEventListener("mouseup",function(e) { self.handleMouseUp(e||window.event); },false);
	canvas.removeEventListener("mousemove",function(e) { self.handleMouseMove(e||window.event); },false);
	
	if ( zoomOnDblClick )
		canvas.removeEventListener("dblclick",function(e) { self.handleMouseDblClick(e||window.event); },false);
		
	// For Firefox
	canvas.removeEventListener("DOMMouseScroll",function(e) { self.handleMouseWheel(e||window.event); },false);
	canvas.removeEventListener("mousewheel",function(e) { self.handleMouseWheel(e||window.event); },false);
}

/**************************************************************************************************************/

/*
	Event handler for mouse wheel
 */
GlobWeb.MouseNavigationHandler.prototype.handleMouseWheel = function(event)
{
	this.navigator.publish("start");
	
	// Check differences between firefox and the rest of the world
	
	// Check differences between firefox and the rest of the world 
	if ( event.wheelDelta === undefined)
	{
		this.navigator.zoom(event.detail);
	}
	else
	{
		this.navigator.zoom(-event.wheelDelta / 120.0);
	}
	
	// Stop mouse wheel to be propagated, because default is to scroll the page
	// This is need when using Firefox event listener on DOMMouseScroll
	if ( event.preventDefault )
	{
		event.preventDefault();
	}
	event.returnValue = false;
	
	this.navigator.publish("end");
	this.navigator.globe.renderContext.requestFrame();
		
	// Return false to stop mouse wheel to be propagated when using onmousewheel
	return false;
}

/**************************************************************************************************************/

/*
	Event handler for mouse down
*/
GlobWeb.MouseNavigationHandler.prototype.handleMouseDown = function(event)
{
	this.pressedButton = event.button;
	
	if ( event.button == 0 || event.button == 1 )
	{
		
		this.pressX = event.clientX;
		this.pressY = event.clientY;
		
		this.lastMouseX = event.clientX;
		this.lastMouseY = event.clientY;
		
		this.navigator.publish("start");
		
		// Return false to stop mouse down to be propagated when using onmousedown
		return false;
	}
	
	return true;
}

/**************************************************************************************************************/

/*
	Event handler for mouse up
 */
GlobWeb.MouseNavigationHandler.prototype.handleMouseUp = function(event)
{
	// No button pressed anymore
	this.pressedButton = -1;

	if ( event.button == 0 || event.button == 1 )
	{
		this.navigator.publish("end");
		
		// Stop mouse up event
		return false;
	}

	return true;
}

/**************************************************************************************************************/

/*
	Event handler for mouse move
*/
GlobWeb.MouseNavigationHandler.prototype.handleMouseMove = function(event)
{
	// No button pressed
	if (this.pressedButton < 0)
		return;

	var dx = (event.clientX - this.lastMouseX);
	var dy = (event.clientY - this.lastMouseY);
	
	// Pan
	if ( this.pressedButton == 0 )
	{

		this.navigator.pan( this.lastMouseX, this.lastMouseY, event.clientX, event.clientY );
		
		this.lastMouseX = event.clientX;
		this.lastMouseY = event.clientY;
		this.navigator.globe.renderContext.requestFrame();
		
		return true;
	}
	// Rotate
	else if ( this.pressedButton == 1 )
	{
		this.rotate(dx,dy);
		this.navigator.globe.renderContext.requestFrame();
		return true;
	}
	
	return false;
}

/**************************************************************************************************************/

/*
	Event handler for mouse double click
 */
GlobWeb.MouseNavigationHandler.prototype.handleMouseDblClick = function(event)
{
	if (event.button == 0)
	{
		var pos = this.navigator.globe.renderContext.getXYRelativeToCanvas(event);
		var geo = this.navigator.globe.getLonLatFromPixel( pos[0], pos[1] );
	
		if (geo)
		{
			this.navigator.zoomTo(geo, 5000, this.tilt);
		}
	}
}



