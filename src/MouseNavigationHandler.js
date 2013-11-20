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

define( function() {

/**************************************************************************************************************/

/** @export
	@constructor
	Mouse_navigationHandler constructor
	@param options Configuration properties for the Mouse_navigationHandler :
			<ul>
				<li>zoomOnDblClick : if true defines animation on double click</li>
			</ul>
 */
var MouseNavigationHandler = function(options){
	
	/**************************************************************************************************************/
	
	/**
 	 * Private variables
	 */
	 
	var _navigation = null;
	var _pressedButton = -1;
	var _lastMouseX = -1;
	var _lastMouseY = -1;
	var _dx = 0;
	var _dy = 0;
	var _panButton = (options && options.panButton) || 0;
	var _rotateButton = (options && options.rotateButton) || 1;

	/**************************************************************************************************************/
	
	/**
 	 * Private methods
	 */

	/**
		Event handler for mouse wheel
	 */
	var _handleMouseWheel = function(event)
	{	
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
		_navigation.zoom(factor);
		
		// Stop all animations when an event is received
		_navigation.stopAnimations();
		
		// Launch inertia if needed
		if ( _navigation.inertia )
		{
			_navigation.inertia.launch("zoom", factor < 0 ? -1 : 1 );
		}

		// Stop mouse wheel to be propagated, because default is to scroll the page
		// This is need when using Firefox event listener on DOMMouseScroll
		if ( event.preventDefault )
		{
			event.preventDefault();
		}
		event.returnValue = false;
					
		// Return false to stop mouse wheel to be propagated when using onmousewheel
		return false;
	};

	/**
	 * Event handler for mouse down
	 */
	var _handleMouseDown = function(event)
	{
		document.addEventListener("mouseup", _handleMouseUp);
		_pressedButton = event.button;
		
		// Stop all animations when an event is received
		_navigation.stopAnimations();

		if ( event.button == _panButton || event.button == _rotateButton )
		{		
			_lastMouseX = event.clientX;
			_lastMouseY = event.clientY;
			_dx = 0;
			_dy = 0;
						
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
		document.removeEventListener("mouseup", _handleMouseUp);

		if ( _navigation.inertia && (_dx != 0 || _dy != 0)  )
		{	
			if ( event.button == _panButton )
			{
				_navigation.inertia.launch("pan", _dx, _dy );
			
			}
			if ( event.button == _rotateButton )
			{
				_navigation.inertia.launch("rotate", _dx, _dy );
			}
		}

		if ( event.button == _panButton || event.button == _rotateButton )
		{
			event.preventDefault();
			
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
		if ( _pressedButton == _panButton )
		{
			_navigation.pan( _dx, _dy );
			ret = true;
		}
		// Rotate
		else if ( _pressedButton == _rotateButton )
		{
			_navigation.rotate(_dx,_dy);
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
		
		var canvas = _navigation.renderContext.canvas;
		
		// Setup the mouse event handlers
		canvas.addEventListener("mousedown", _handleMouseDown);
		canvas.addEventListener("mousemove", _handleMouseMove);
		
		if ( options && options.zoomOnDblClick )
			canvas.addEventListener("dblclick", _handleMouseDblClick);
			
		// For Firefox
		canvas.addEventListener("DOMMouseScroll", _handleMouseWheel);
		canvas.addEventListener("mousewheel", _handleMouseWheel);
		
		// Fix for Google Chrome : avoid dragging
		// TODO : a hack, should be more robust (restore on uninstall?)
		canvas.addEventListener("dragstart", function(event){event.preventDefault(); return false;});

		if ( _rotateButton == 2 ) 
		{
			canvas.addEventListener("contextmenu", function(e) { e.preventDefault(); return false; }, false);
		}
	};

	/** 
	 *	Remove the default event handlers for the _navigation
	 */
	this.uninstall = function()
	{
		// Setup the mouse event handlers
		var canvas = _navigation.renderContext.canvas;

		canvas.removeEventListener("mousedown", _handleMouseDown);
		canvas.removeEventListener("mousemove", _handleMouseMove);
		
		if ( options && options.zoomOnDblClick )
			canvas.removeEventListener("dblclick", _handleMouseDblClick);
			
		// For Firefox
		canvas.removeEventListener("DOMMouseScroll", _handleMouseWheel);
		canvas.removeEventListener("mousewheel", _handleMouseWheel);
	};
};

return MouseNavigationHandler;

});
