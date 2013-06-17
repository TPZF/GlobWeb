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
	TouchNavigationHandler constructor
	@param options Configuration properties for the TouchNavigationHandler :
			<ul>
				<li>zoomOnDblClick : if true defines animation on double click</li>
			</ul>
 */
var TouchNavigationHandler = function(options){

	/**************************************************************************************************************/
	
	/**
 	 * Private variables
	 */
	 
	var _navigation = null;
	var _pressX;
	var _pressY;
	var _lastMouseX;
	var _lastMouseY;
	var _lastFingerDistance;

	/**************************************************************************************************************/
	
	/**
 	 * Private methods
	 */
	/** 
	  Handle touch start event
	 */
	var _handleTouchStart = function(event)
	{
		console.log("# events : " + event.touches.length );
		_pressX = event.touches[0].clientX;
		_pressY = event.touches[0].clientY;
		_lastMouseX = event.touches[0].clientX;
		_lastMouseY = event.touches[0].clientY;
		
		if ( event.touches.length == 2 )
		{
			var dx = event.touches[0].clientX - event.touches[1].clientX;
			var dy = event.touches[0].clientY - event.touches[1].clientY;
			_lastFingerDistance = Math.sqrt( dx * dx + dy * dy );
			console.log("Finger distance : " + this.lastFingerDistance );
		}
				
		if ( event.preventDefault )
		{
			event.preventDefault();
		}
		event.returnValue = false;

		// Return false to stop event to be propagated
		return false;
	};

	/** 
	  Handle touch move event
	 */
	var _handleTouchMove = function(event)
	{
		var dx = (event.touches[0].clientX - _lastMouseX);
		var dy = (event.touches[0].clientY - _lastMouseY);
		
		_lastMouseX = event.touches[0].clientX;
		_lastMouseY = event.touches[0].clientY;
		
		// Pan
		if ( event.touches.length == 1 )
		{
			_navigation.pan( dx, dy );
			_navigation.globe.renderContext.requestFrame();
		}
		// Zoom
		else if ( event.touches.length == 2 )
		{
			var dx = event.touches[0].clientX - event.touches[1].clientX;
			var dy = event.touches[0].clientY - event.touches[1].clientY;
			var fingerDistance = Math.sqrt( dx * dx + dy * dy ); 
			var deltaDistance = (fingerDistance - _lastFingerDistance);
			if (_lastFingerDistance != 0)
			{
				_navigation.zoom( deltaDistance * 0.025, fingerDistance / _lastFingerDistance);
			}
			_navigation.globe.renderContext.requestFrame();
			_lastFingerDistance = fingerDistance;
		}
		
		if ( event.preventDefault )
		{
			event.preventDefault();
		}
		event.returnValue = false;
		
		return false;
	};


	/**************************************************************************************************************/

	/** 
	  Handle touch end event
	 */
	var _handleTouchEnd = function(event)
	{		
		if ( event.preventDefault )
		{
			event.preventDefault();
		}
		event.returnValue = false;
		
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
		
		// Setup the touch event handlers
		var canvas = _navigation.globe.renderContext.canvas;
		
		canvas.addEventListener("touchstart", _handleTouchStart,false);
		document.addEventListener("touchend", _handleTouchEnd,false);
		canvas.addEventListener("touchmove", _handleTouchMove,false);
	};

	/** 
	 *	Remove the default event handlers for the _navigation
	 */
	this.uninstall = function()
	{
		// Setup the mouse event handlers
		var canvas = _navigation.globe.renderContext.canvas;

		canvas.addEventListener("touchstart", _handleTouchStart,false);
		document.addEventListener("touchend", _handleTouchEnd,false);
		canvas.addEventListener("touchmove", _handleTouchMove,false);
	};
};

return TouchNavigationHandler;

});