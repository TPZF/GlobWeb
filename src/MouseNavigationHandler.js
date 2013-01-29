/**************************************************************************************************************/

/** @export
	@constructor
	MouseNavigationHandler constructor
	@param options Configuration properties for the MouseNavigationHandler :
			<ul>
				<li>zoomOnDblClick : if true defines animation on double click</li>
				<li>inertia: boolean value of inertia effect</li>
			</ul>
 */
GlobWeb.MouseNavigationHandler = function(options){
	
	this.navigation = null;
	this.pressedButton = -1;
	this.lastMouseX = -1;
	this.lastMouseY = -1;
	this.needsStartEvent = false;
	this.needsEndEvent = false;
	this.dx = 0;
	this.dy = 0;
	
	// Copy options
	for (var x in options)
	{
		this[x] = options[x];
	}
	
}

/**************************************************************************************************************/

/** 
	Setup the default event handlers for the navigation
 */
GlobWeb.MouseNavigationHandler.prototype.install = function(navigation)
{
	this.navigation = navigation;
	
	var canvas = this.navigation.globe.renderContext.canvas;
	var self = this;
	
	// Setup the mouse event handlers
	canvas.addEventListener("mousedown",function(e) { e.preventDefault(); self.handleMouseDown(e||window.event); },false);
	document.addEventListener("mouseup",function(e) { self.handleMouseUp(e||window.event); },false);
	canvas.addEventListener("mousemove",function(e) { self.handleMouseMove(e||window.event); },false);
	
	if ( this.zoomOnDblClick )
		canvas.addEventListener("dblclick",function(e) { self.handleMouseDblClick(e||window.event); },false);
		
	// For Firefox
	canvas.addEventListener("DOMMouseScroll",function(e) { e.preventDefault(); self.handleMouseWheel(e||window.event); },false);
	canvas.addEventListener("mousewheel",function(e) { e.preventDefault(); self.handleMouseWheel(e||window.event); },false);
}

/**************************************************************************************************************/

/** 
	Remove the default event handlers for the navigation
 */
GlobWeb.MouseNavigationHandler.prototype.uninstall = function()
{
	// Setup the mouse event handlers
	var canvas = this.navigation.globe.renderContext.canvas;

	canvas.removeEventListener("mousedown",function(e) { e.preventDefault(); self.handleMouseDown(e||window.event); },false);
	document.removeEventListener("mouseup",function(e) { self.handleMouseUp(e||window.event); },false);
	canvas.removeEventListener("mousemove",function(e) { self.handleMouseMove(e||window.event); },false);
	
	if ( zoomOnDblClick )
		canvas.removeEventListener("dblclick",function(e) { self.handleMouseDblClick(e||window.event); },false);
		
	// For Firefox
	canvas.removeEventListener("DOMMouseScroll",function(e) { self.handleMouseWheel(e||window.event); },false);
	canvas.removeEventListener("mousewheel",function(e) { self.handleMouseWheel(e||window.event); },false);
}

/**************************************************************************************************************/

/**
	Event handler for mouse wheel
 */
GlobWeb.MouseNavigationHandler.prototype.handleMouseWheel = function(event)
{
	this.navigation.globe.publish("startNavigation");
	
	var factor;

	// Check differences between firefox and the rest of the world
	if ( event.wheelDelta === undefined)
	{
		factor = event.detail;
	}
	else
	{
		factor = -event.wheelDelta / 120.0;	
	}
	this.navigation.zoom(factor);
	
	// Stop all animations when an event is received
	this.navigation.stopAnimations();
	
	// Launch inertia if needed
	if ( this.navigation.inertia )
	{
		this.navigation.inertia.launch("zoom", factor < 0 ? -1 : 1 );
	}

	// Stop mouse wheel to be propagated, because default is to scroll the page
	// This is need when using Firefox event listener on DOMMouseScroll
	if ( event.preventDefault )
	{
		event.preventDefault();
	}
	event.returnValue = false;
	
	this.navigation.globe.publish("endNavigation");
	this.navigation.globe.renderContext.requestFrame();
		
	// Return false to stop mouse wheel to be propagated when using onmousewheel
	return false;
}

/**************************************************************************************************************/

/**
	Event handler for mouse down
*/
GlobWeb.MouseNavigationHandler.prototype.handleMouseDown = function(event)
{
	this.pressedButton = event.button;
	
	// Stop all animations when an event is received
	this.navigation.stopAnimations();

	if ( event.button == 0 || event.button == 1 )
	{		
		this.lastMouseX = event.clientX;
		this.lastMouseY = event.clientY;
		this.dx = 0;
		this.dy = 0;
		
		this.needsStartEvent = true;
		
		// Return false to stop mouse down to be propagated when using onmousedown
		return false;
	}
	
	return true;
}

/**************************************************************************************************************/

/**
	Event handler for mouse up
 */
GlobWeb.MouseNavigationHandler.prototype.handleMouseUp = function(event)
{
	// No button pressed anymore
	this.pressedButton = -1;

	if ( this.navigation.inertia && (this.dx != 0 || this.dy != 0)  )
	{	
		if ( event.button == 0 )
		{
			this.navigation.inertia.launch("pan", this.dx, this.dy );
		
		}
		if ( event.button == 1 )
		{
			this.navigation.inertia.launch("rotate", this.dx, this.dy );
		}
	}

	if ( event.button == 0 || event.button == 1 )
	{

		if (this.needsEndEvent ) {
			this.navigation.globe.publish("endNavigation");
		}

		this.needsStartEvent = false;
		this.needsEndEvent = false;
		
		// Stop mouse up event
		return false;
	}

	return true;
}

/**************************************************************************************************************/

/**
	Event handler for mouse move
*/
GlobWeb.MouseNavigationHandler.prototype.handleMouseMove = function(event)
{
	// No button pressed
	if (this.pressedButton < 0)
		return;
	
	this.dx = (event.clientX - this.lastMouseX);
	this.dy = (event.clientY - this.lastMouseY);
	
	if ( this.dx == 0 && this.dy == 0 )
		return;
	
	var ret = false;
	// Pan
	if ( this.pressedButton == 0 )
	{
		if ( this.needsStartEvent ) { 
			this.navigation.globe.publish("startNavigation");
			this.needsStartEvent  = false;
			this.needsEndEvent = true;
		}
		this.navigation.pan( this.dx, this.dy );
		this.navigation.globe.renderContext.requestFrame();
		ret = true;
	}
	// Rotate
	else if ( this.pressedButton == 1 )
	{
		this.navigation.rotate(this.dx,this.dy);
		this.navigation.globe.renderContext.requestFrame();
		ret = true;
	}
	
	this.lastMouseX = event.clientX;
	this.lastMouseY = event.clientY;
	
	return ret;
}

/**************************************************************************************************************/

/**
	Event handler for mouse double click
 */
GlobWeb.MouseNavigationHandler.prototype.handleMouseDblClick = function(event)
{
	if (event.button == 0)
	{
		var pos = this.navigation.globe.renderContext.getXYRelativeToCanvas(event);
		var geo = this.navigation.globe.getLonLatFromPixel( pos[0], pos[1] );
	
		if (geo)
		{
			this.navigation.zoomTo(geo);
		}
	}
}