/**************************************************************************************************************/

/** @export
	@constructor
	VTNavigationHandler constructor
	@param options Configuration properties for the VTNavigationHandler :
			<ul>
				<li>zoomOnDblClick : if true defines animation on double click</li>
				<li>inertia: boolean value of inertia effect</li>
			</ul>
 */
GlobWeb.VTNavigationHandler = function(options){
	
	/**************************************************************************************************************/
	
	/**
 	 * Private variables
	 */
	 
	var _navigation = null;
	var _pressedButton = -1;
	var _lastMouseX = -1;
	var _lastMouseY = -1;
	var _needsStartEvent = false;
	var _needsEndEvent = false;
	var _dx = 0;
	var _dy = 0;

	/**************************************************************************************************************/
	
	/**
 	 * Private methods
	 */

	/**
		Event handler for mouse wheel
	 */
	var _handleMouseWheel = function(event)
	{
		_navigation.globe.publish("start_navigation");
		
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
		
		/* One way of paning while zooming: based on the distance beetween the center of the canvas and the mouse cursor
		 * Not really usefull, but... interesting
		 */
		
		/* var middle = [_navigation.globe.renderContext.canvas.clientLeft + (_navigation.globe.renderContext.canvas.width/2), _navigation.globe.renderContext.canvas.clientTop + (_navigation.globe.renderContext.canvas.height/2)];
		var cursor = [event.clientX, event.clientY];
		var dx = middle[0] - cursor[0];
		var dy = middle[1] - cursor[1];
		//dx = dx*Math.abs(factor)/4;
		//dy = dy*Math.abs(factor)/4;
		dx = dx/4;
		dy = dy/4;
		if(factor > 0) _navigation.pan(-dx, -dy);
		else _navigation.pan(dx, dy);*/
		
		if (!_navigation.inertia )
		{
			var pos = _navigation.globe.renderContext.getXYRelativeToCanvas(event);
			var geo = _navigation.globe.getLonLatFromPixel( pos[0], pos[1] );
		}
		
		_navigation.zoom(factor);
		
		// Stop all animations when an event is received
		_navigation.stopAnimations();
		
		// Launch inertia if needed
		if ( _navigation.inertia )
		{
			_navigation.inertia.launch("zoom", factor < 0 ? -1 : 1 );
		}
		
		else{
			if(geo){
				var pos2 = _navigation.globe.getPixelFromLonLat(geo[0], geo[1]);
				
				var dx = pos[0] - pos2[0];
				var dy = pos[1] - pos2[1];
				_navigation.pan(dx, dy);
			}
		}
		
		// Stop mouse wheel to be propagated, because default is to scroll the page
		// This is need when using Firefox event listener on DOMMouseScroll
		if ( event.preventDefault )
		{
			event.preventDefault();
		}
		event.returnValue = false;
		
		_navigation.globe.publish("end_navigation");
		_navigation.globe.renderContext.requestFrame();
			
		// Return false to stop mouse wheel to be propagated when using onmousewheel
		return false;
	};

	/**
	 * Event handler for mouse down
	 */
	var _handleMouseDown = function(event)
	{
		_pressedButton = event.button;
		
		// Stop all animations when an event is received
		_navigation.stopAnimations();

		if ( event.button == 0 || event.button == 1 )
		{		
			_lastMouseX = event.clientX;
			_lastMouseY = event.clientY;
			_dx = 0;
			_dy = 0;
			
			_needsStartEvent = true;
			
			// Return false to stop mouse down to be propagated when using onmousedown
			return false;
		}
		
		return true;
	};

	/**
	 * Event handler for mouse up
	 */
	var _handleMouseUp = function(event)
	{
		// No button pressed anymore
		_pressedButton = -1;

		if ( _navigation.inertia && (_dx != 0 || _dy != 0)  )
		{	
			if ( event.button == 0 )
			{
				_navigation.inertia.launch("pan", _dx, _dy );
			
			}
			if ( event.button == 1 )
			{
				_navigation.inertia.launch("rotate", -_dx, -_dy );
			}
		}

		if ( event.button == 0 || event.button == 1 )
		{

			if (_needsEndEvent ) {
				_navigation.globe.publish("end_navigation");
			}

			_needsStartEvent = false;
			_needsEndEvent = false;
			
			// Stop mouse up event
			return false;
		}

		return true;
	};

	/**
		Event handler for mouse move
	*/
	var _handleMouseMove = function(event)
	{
		// No button pressed
		if (_pressedButton < 0)
			return;
		
		_dx = (event.clientX - _lastMouseX);
		_dy = (event.clientY - _lastMouseY);
		
		if ( _dx == 0 && _dy == 0 )
			return;
		
		var ret = false;
		// Pan
		if ( _pressedButton == 0 )
		{
			if ( _needsStartEvent ) { 
				_navigation.globe.publish("start_navigation");
				_needsStartEvent  = false;
				_needsEndEvent = true;
			}
			_navigation.pan( _dx, _dy );
			_navigation.globe.renderContext.requestFrame();
			ret = true;
		}
		// Rotate
		else if ( _pressedButton == 1 )
		{
			_navigation.rotate(-_dx,-_dy);
			_navigation.globe.renderContext.requestFrame();
			ret = true;
		}
		
		_lastMouseX = event.clientX;
		_lastMouseY = event.clientY;
		
		return ret;
	};

	/**
		Event handler for mouse double click
	 */
	var _handleMouseDblClick = function(event)
	{
		if (event.button == 0)
		{
			var pos = _navigation.globe.renderContext.getXYRelativeToCanvas(event);
			var geo = _navigation.globe.getLonLatFromPixel( pos[0], pos[1] );
		
			if (geo)
			{
				_navigation.zoomTo(geo);
			}
		}
	};
	
	/**
		Event handler for mouse context menu
	 */
	var _handleContextMenu = function(event)
	{
		var pos = _navigation.globe.renderContext.getXYRelativeToCanvas(event);
		var geo = _navigation.globe.getLonLatFromPixel( pos[0], pos[1] );
	
		if (geo)
		{
			alert("Lon: "+geo[0]+"\nLat: "+geo[1]+"\nElev: "+geo[2]);
		}
		
		event.preventDefault();
		return false;
	};

	/**************************************************************************************************************/
	
	 /**
	  * Public methods
	  */
			
	/** 
	 *	Setup the default event handlers for the _navigation
	 */
	this.install = function(nav)
	{
		_navigation = nav;
		
		var canvas = _navigation.globe.renderContext.canvas;
		
		// Setup the mouse event handlers
		canvas.addEventListener("mousedown", _handleMouseDown);
		document.addEventListener("mouseup", _handleMouseUp);
		canvas.addEventListener("mousemove", _handleMouseMove);
		canvas.addEventListener("contextmenu", _handleContextMenu);

		
		if ( options.zoomOnDblClick )
			canvas.addEventListener("dblclick", _handleMouseDblClick);
			
		// For Firefox
		canvas.addEventListener("DOMMouseScroll", _handleMouseWheel);
		canvas.addEventListener("mousewheel", _handleMouseWheel);
	};

	/** 
	 *	Remove the default event handlers for the _navigation
	 */
	this.uninstall = function()
	{
		// Setup the mouse event handlers
		var canvas = _navigation.globe.renderContext.canvas;

		canvas.removeEventListener("mousedown", _handleMouseDown);
		document.removeEventListener("mouseup", _handleMouseUp);
		canvas.removeEventListener("mousemove", _handleMouseMove);
		
		if ( options.zoomOnDblClick )
			canvas.removeEventListener("dblclick", _handleMouseDblClick);
			
		// For Firefox
		canvas.removeEventListener("DOMMouseScroll", _handleMouseWheel);
		canvas.removeEventListener("mousewheel", _handleMouseWheel);
	};
};
