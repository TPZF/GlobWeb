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

/**
 *	Types of actions for inertia execution
 */
var Type = {
	PAN : 0,
	ROTATE : 1,
	TILT : 2,
	ZOOM : 3
};

/** @export
	@constructor
	TouchNavigationHandler constructor
	@param options Configuration properties for the TouchNavigationHandler :
			<ul>
				<li>inversed : if true inverse the sens of touching events</li>
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

	var _dx, _dy;
	var _type;

	// Parameters for intertia management
	var _actionHits = [0, 0, 0, 0];
	var _lastTapDate;
	var _rotation;


	// Double tap
	var _doubletap_interval = 300;
	var _inversed = (options && options.hasOwnProperty('inversed')) ? options.inversed : false;

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
		
		_actionHits = [0, 0, 0, 0];

		// Stop all animations when an event is received
		_navigation.stopAnimations();
		_dx = 0;
		_dy = 0;
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
		_dx = event.touches[0].clientX - _lastTouches[0].clientX;
		_dy = event.touches[0].clientY - _lastTouches[0].clientY;
		if ( event.touches.length == 1 )
		{	
			// Pan
	       	_navigation.pan(_dx, _dy);
	        _actionHits[Type.PAN]++;
		}
		else
		{
			// Depending on direction of two fingers, decide if tilt OR rotation
			var sameDirection = ( (event.touches[0].clientY - _lastTouches[0].clientY) * (event.touches[1].clientY - _lastTouches[1].clientY) > 0 );
			if ( sameDirection )
			{
				// Tilt
				_navigation.rotate(0., -_dy);
				_actionHits[Type.TILT]++;
			}
			else
			{
				// Rotation
				var rotation = _getRotation( _startTouches, event.touches );
				var dx = rotation - _lastAngle;
				_lastAngle = rotation;

				if ( _inversed )
				{
					dx *= -1;
				}
				
				_rotation = dx * 10;
				_navigation.rotate(_rotation, 0);
				_actionHits[Type.ROTATE]++;
			}

			// Zoom
			var dx = event.touches[0].clientX - event.touches[1].clientX;
			var dy = event.touches[0].clientY - event.touches[1].clientY;
			var fingerDistance = Math.sqrt( dx * dx + dy * dy );
			var deltaDistance = (fingerDistance - _lastFingerDistance);

			var scale;
			if ( _inversed )
			{
				scale = fingerDistance/_lastFingerDistance;
			}
			else
			{
				scale = _lastFingerDistance/fingerDistance;
			}

			if (_lastFingerDistance != 0)
			{
				_navigation.zoom( deltaDistance * 0.025, scale);
				_actionHits[Type.ZOOM]++;
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
		if ( options && options.zoomOnDblClick && event.touches.length == 0 && _dx == 0 && _dy == 0 )
		{
			// Handle double tap
			// TODO : take into account the distance
			var now = Date.now();
			if ( now - _lastTapDate < _doubletap_interval )
			{
				var geo = _navigation.globe.getLonLatFromPixel( _lastTouches[0].clientX, _lastTouches[0].clientY );
		
				if (geo)
				{
					_navigation.zoomTo(geo);
				}
			}
			_lastTapDate = now;
		}

		// Update last touches
		_lastTouches = event.touches;

		if ( _navigation.inertia && (_dx != 0 || _dy != 0) )
		{
			// Launch inertia depending on action hits while "moving" phase
			var hitIndex = _actionHits.indexOf( Math.max.apply(this,_actionHits) );
			if ( hitIndex == Type.PAN )
			{
				// Pan
				_navigation.inertia.launch("pan", _dx, _dy);
			}
			else if ( hitIndex == Type.ROTATE )
			{
				// Rotate
				//_navigation.inertia.launch("rotate", _rotation, 0);
			}
			else if ( hitIndex == Type.TILT )
			{
				// No inertia for tilt
			}
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
		canvas.addEventListener("touchend", _handleTouchEnd,false);
		canvas.addEventListener("touchmove", _handleTouchMove,false);
	};

	/** 
	 *	Remove the default event handlers for the _navigation
	 */
	this.uninstall = function()
	{
		// Setup the mouse event handlers
		var canvas = _navigation.renderContext.canvas;

		canvas.removeEventListener("touchstart", _handleTouchStart,false);
		canvas.removeEventListener("touchend", _handleTouchEnd,false);
		canvas.removeEventListener("touchmove", _handleTouchMove,false);
	};
};

return TouchNavigationHandler;

});