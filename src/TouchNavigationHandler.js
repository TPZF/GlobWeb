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
	var _lastFingerDistance;

	var _startTouches = [];
	var _lastTouches;
	var _lastAngle;

	/**************************************************************************************************************/
	
	/**
 	 * Private methods
	 */

	/**
	 * Calculate the angle between two coordinates
	 */
	var _getAngle = function(touch1, touch2) {
		var y = touch2.clientY - touch1.clientY,
			x = touch2.clientX - touch1.clientX;
		return Math.atan2(y, x) * 180 / Math.PI;
	};

	/**************************************************************************************************************/

	/**
	 * Calculate the rotation degrees between two touchLists (fingers)
	 */
	var _getRotation = function(start, end) {
		// Need two fingers
		if(start.length >= 2 && end.length >= 2) {
			return _getAngle(end[1], end[0]) - _getAngle(start[1], start[0]);
		}
		return 0;
    };

    /**************************************************************************************************************/

	/** 
	  Handle touch start event
	 */
	var _handleTouchStart = function(event)
	{
		//console.log("# events : " + event.touches.length );
		_lastTouches = event.touches;
		_startTouches = event.touches;
		
		if ( event.touches.length == 2 )
		{
			var dx = event.touches[0].clientX - event.touches[1].clientX;
			var dy = event.touches[0].clientY - event.touches[1].clientY;
			_lastFingerDistance = Math.sqrt( dx * dx + dy * dy );
			console.log("Finger distance : " + _lastFingerDistance );
			
			_lastAngle = _getRotation( _startTouches, event.touches );
		}
				
		if ( event.preventDefault )
		{
			event.preventDefault();
		}
		event.returnValue = false;

		// Return false to stop event to be propagated
		return false;
	};

	/**************************************************************************************************************/

	/** 
	  Handle touch move event
	 */
	var _handleTouchMove = function(event)
	{
		if ( event.touches.length == 1 )
		{	
			// Pan
			var dx = event.touches[0].clientX - _lastTouches[0].clientX;
        	var dy = event.touches[0].clientY - _lastTouches[0].clientY;
        	_navigation.pan(dx, dy);
		}
		else
		{
			// Depending on direction of two fingers, decide if tilt OR rotation
			var sameDirection = ( (event.touches[0].clientY - _lastTouches[0].clientY) * (event.touches[1].clientY - _lastTouches[1].clientY) > 0 );
			if ( sameDirection )
			{
				// Tilt
				var dy = event.touches[0].clientY - _lastTouches[0].clientY;
				_navigation.rotate(0., -dy);				
			}
			else
			{
				// Rotation
				var rotation = _getRotation( _startTouches, event.touches );
				var dx = rotation - _lastAngle;
				_lastAngle = rotation;
				_navigation.rotate(dx*10, 0);
			}

			// Zoom
			var dx = event.touches[0].clientX - event.touches[1].clientX;
			var dy = event.touches[0].clientY - event.touches[1].clientY;
			var fingerDistance = Math.sqrt( dx * dx + dy * dy );
			var deltaDistance = (fingerDistance - _lastFingerDistance);
			if (_lastFingerDistance != 0)
			{
				_navigation.zoom( deltaDistance * 0.025, _lastFingerDistance/fingerDistance);
			}
			_navigation.renderContext.requestFrame();
			_lastFingerDistance = fingerDistance;
		}

		// Update _lastTouches
		_lastTouches = event.touches;
		
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
		_lastTouches = event.touches;
//		_startTouches = event.touches;

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
		var canvas = _navigation.renderContext.canvas;
		
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
		var canvas = _navigation.renderContext.canvas;

		canvas.addEventListener("touchstart", _handleTouchStart,false);
		document.addEventListener("touchend", _handleTouchEnd,false);
		canvas.addEventListener("touchmove", _handleTouchMove,false);
	};
};

return TouchNavigationHandler;

});