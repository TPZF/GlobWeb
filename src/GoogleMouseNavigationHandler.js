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
	GoogleMouseNavigationHandler constructor
 */
var GoogleMouseNavigationHandler = function(options){
	
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
	var _pressedGeo = null;
	var _changeInertia = null;
	var _slower = 0;

	/**************************************************************************************************************/
	
	/**
 	 * Private methods
	 */

	/**
		Event handler for mouse wheel
	 */
	var _handleMouseWheel = function(event)
	{
		_navigation.globe.publish("startNavigation");
		
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
		
		if (!_navigation.inertia )
		{
			// Compute mouse position and corresponding lon lat before zoom
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
			// Compute the new position of lon lat and pan the globe toward it
			if(geo){
				var pos2 = _navigation.globe.getPixelFromLonLat(geo[0], geo[1]);
				
				var dx = pos[0] - pos2[0];
				var widthHeightFactor = Math.round(_navigation.globe.renderContext.canvas.width / _navigation.globe.renderContext.canvas.height);
				widthHeightFactor = (widthHeightFactor < 1) ? 1 : widthHeightFactor;
				dx *= widthHeightFactor;
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
		
		_navigation.globe.publish("endNavigation");
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
		
		_lastMouseX = event.clientX;
		_lastMouseY = event.clientY;
		_dx = 0;
		_dy = 0;
		
		// Middle click
		if (event.button == 1){
			// Cursor's style modification: Rotating icon
			_navigation.globe.renderContext.canvas.style.cursor = 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABeUlEQVR42u2XS07DMBCGbaCCQstzy4YDcAGWCAE3YI3omsN0XcSaGxSEWHIBDsCGLY9SykM80m/CFLkhIBycVpVi6ZetUez/S2x5JtYMudkCYJQBbGJ+pBoIgMybQKUoijrW2hnGr+jNFyILQM+8jHkLc0Nv6OeIPflC+AJ8M++1rBA+AD+a/wfCB2Bczdtp5gmIqkK8hwSQt69gcNu3gJ6BRGyB7kG/QlAAOe3rSD5zFeO6cwj3ibVRC52hTmgA2YJJVUUgML5wAFbVXN78RRV0C+TZMVUZLWJ86QCsELsxn3v/oQp6CN02hZYwvnIAloldo2efhQqAAqAAGKl7IL4JpQDpWyA9F8iVHfwmjHMBZnd/yIbzJodcEGdDtInJ0S/1wA7DE5NDNozrATSLtjE7SKmI9hg20b3JoR74qogUYgvThnMIa8SOHfPgFVEaxAbmh5jvMj71Nc8CkISYRmvoHD36mmcFcCFKOhbDgf0XuHOH9mcUrHUBoVXvIfh2krcAAAAASUVORK5CYII=), auto';
		}
		// Left and right click
		else{
			// Save the lon lat clicked
			var pressedPos = _navigation.globe.renderContext.getXYRelativeToCanvas(event);
			_pressedGeo = _navigation.globe.getLonLatFromPixel( pressedPos[0], pressedPos[1] );
			
			// Left click
			if(event.button == 0){
				// Cursor's style modification: Grabbing icon
				_navigation.globe.renderContext.canvas.style.cursor = 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKTWlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVN3WJP3Fj7f92UPVkLY8LGXbIEAIiOsCMgQWaIQkgBhhBASQMWFiApWFBURnEhVxILVCkidiOKgKLhnQYqIWotVXDjuH9yntX167+3t+9f7vOec5/zOec8PgBESJpHmomoAOVKFPDrYH49PSMTJvYACFUjgBCAQ5svCZwXFAADwA3l4fnSwP/wBr28AAgBw1S4kEsfh/4O6UCZXACCRAOAiEucLAZBSAMguVMgUAMgYALBTs2QKAJQAAGx5fEIiAKoNAOz0ST4FANipk9wXANiiHKkIAI0BAJkoRyQCQLsAYFWBUiwCwMIAoKxAIi4EwK4BgFm2MkcCgL0FAHaOWJAPQGAAgJlCLMwAIDgCAEMeE80DIEwDoDDSv+CpX3CFuEgBAMDLlc2XS9IzFLiV0Bp38vDg4iHiwmyxQmEXKRBmCeQinJebIxNI5wNMzgwAABr50cH+OD+Q5+bk4eZm52zv9MWi/mvwbyI+IfHf/ryMAgQAEE7P79pf5eXWA3DHAbB1v2upWwDaVgBo3/ldM9sJoFoK0Hr5i3k4/EAenqFQyDwdHAoLC+0lYqG9MOOLPv8z4W/gi372/EAe/tt68ABxmkCZrcCjg/1xYW52rlKO58sEQjFu9+cj/seFf/2OKdHiNLFcLBWK8ViJuFAiTcd5uVKRRCHJleIS6X8y8R+W/QmTdw0ArIZPwE62B7XLbMB+7gECiw5Y0nYAQH7zLYwaC5EAEGc0Mnn3AACTv/mPQCsBAM2XpOMAALzoGFyolBdMxggAAESggSqwQQcMwRSswA6cwR28wBcCYQZEQAwkwDwQQgbkgBwKoRiWQRlUwDrYBLWwAxqgEZrhELTBMTgN5+ASXIHrcBcGYBiewhi8hgkEQcgIE2EhOogRYo7YIs4IF5mOBCJhSDSSgKQg6YgUUSLFyHKkAqlCapFdSCPyLXIUOY1cQPqQ28ggMor8irxHMZSBslED1AJ1QLmoHxqKxqBz0XQ0D12AlqJr0Rq0Hj2AtqKn0UvodXQAfYqOY4DRMQ5mjNlhXIyHRWCJWBomxxZj5Vg1Vo81Yx1YN3YVG8CeYe8IJAKLgBPsCF6EEMJsgpCQR1hMWEOoJewjtBK6CFcJg4Qxwicik6hPtCV6EvnEeGI6sZBYRqwm7iEeIZ4lXicOE1+TSCQOyZLkTgohJZAySQtJa0jbSC2kU6Q+0hBpnEwm65Btyd7kCLKArCCXkbeQD5BPkvvJw+S3FDrFiOJMCaIkUqSUEko1ZT/lBKWfMkKZoKpRzame1AiqiDqfWkltoHZQL1OHqRM0dZolzZsWQ8ukLaPV0JppZ2n3aC/pdLoJ3YMeRZfQl9Jr6Afp5+mD9HcMDYYNg8dIYigZaxl7GacYtxkvmUymBdOXmchUMNcyG5lnmA+Yb1VYKvYqfBWRyhKVOpVWlX6V56pUVXNVP9V5qgtUq1UPq15WfaZGVbNQ46kJ1Bar1akdVbupNq7OUndSj1DPUV+jvl/9gvpjDbKGhUaghkijVGO3xhmNIRbGMmXxWELWclYD6yxrmE1iW7L57Ex2Bfsbdi97TFNDc6pmrGaRZp3mcc0BDsax4PA52ZxKziHODc57LQMtPy2x1mqtZq1+rTfaetq+2mLtcu0W7eva73VwnUCdLJ31Om0693UJuja6UbqFutt1z+o+02PreekJ9cr1Dund0Uf1bfSj9Rfq79bv0R83MDQINpAZbDE4Y/DMkGPoa5hpuNHwhOGoEctoupHEaKPRSaMnuCbuh2fjNXgXPmasbxxirDTeZdxrPGFiaTLbpMSkxeS+Kc2Ua5pmutG003TMzMgs3KzYrMnsjjnVnGueYb7ZvNv8jYWlRZzFSos2i8eW2pZ8ywWWTZb3rJhWPlZ5VvVW16xJ1lzrLOtt1ldsUBtXmwybOpvLtqitm63Edptt3xTiFI8p0in1U27aMez87ArsmuwG7Tn2YfYl9m32zx3MHBId1jt0O3xydHXMdmxwvOuk4TTDqcSpw+lXZxtnoXOd8zUXpkuQyxKXdpcXU22niqdun3rLleUa7rrStdP1o5u7m9yt2W3U3cw9xX2r+00umxvJXcM970H08PdY4nHM452nm6fC85DnL152Xlle+70eT7OcJp7WMG3I28Rb4L3Le2A6Pj1l+s7pAz7GPgKfep+Hvqa+It89viN+1n6Zfgf8nvs7+sv9j/i/4XnyFvFOBWABwQHlAb2BGoGzA2sDHwSZBKUHNQWNBbsGLww+FUIMCQ1ZH3KTb8AX8hv5YzPcZyya0RXKCJ0VWhv6MMwmTB7WEY6GzwjfEH5vpvlM6cy2CIjgR2yIuB9pGZkX+X0UKSoyqi7qUbRTdHF09yzWrORZ+2e9jvGPqYy5O9tqtnJ2Z6xqbFJsY+ybuIC4qriBeIf4RfGXEnQTJAntieTE2MQ9ieNzAudsmjOc5JpUlnRjruXcorkX5unOy553PFk1WZB8OIWYEpeyP+WDIEJQLxhP5aduTR0T8oSbhU9FvqKNolGxt7hKPJLmnVaV9jjdO31D+miGT0Z1xjMJT1IreZEZkrkj801WRNberM/ZcdktOZSclJyjUg1plrQr1zC3KLdPZisrkw3keeZtyhuTh8r35CP5c/PbFWyFTNGjtFKuUA4WTC+oK3hbGFt4uEi9SFrUM99m/ur5IwuCFny9kLBQuLCz2Lh4WfHgIr9FuxYji1MXdy4xXVK6ZHhp8NJ9y2jLspb9UOJYUlXyannc8o5Sg9KlpUMrglc0lamUycturvRauWMVYZVkVe9ql9VbVn8qF5VfrHCsqK74sEa45uJXTl/VfPV5bdra3kq3yu3rSOuk626s91m/r0q9akHV0IbwDa0b8Y3lG19tSt50oXpq9Y7NtM3KzQM1YTXtW8y2rNvyoTaj9nqdf13LVv2tq7e+2Sba1r/dd3vzDoMdFTve75TsvLUreFdrvUV99W7S7oLdjxpiG7q/5n7duEd3T8Wej3ulewf2Re/ranRvbNyvv7+yCW1SNo0eSDpw5ZuAb9qb7Zp3tXBaKg7CQeXBJ9+mfHvjUOihzsPcw83fmX+39QjrSHkr0jq/dawto22gPaG97+iMo50dXh1Hvrf/fu8x42N1xzWPV56gnSg98fnkgpPjp2Snnp1OPz3Umdx590z8mWtdUV29Z0PPnj8XdO5Mt1/3yfPe549d8Lxw9CL3Ytslt0utPa49R35w/eFIr1tv62X3y+1XPK509E3rO9Hv03/6asDVc9f41y5dn3m978bsG7duJt0cuCW69fh29u0XdwruTNxdeo94r/y+2v3qB/oP6n+0/rFlwG3g+GDAYM/DWQ/vDgmHnv6U/9OH4dJHzEfVI0YjjY+dHx8bDRq98mTOk+GnsqcTz8p+Vv9563Or59/94vtLz1j82PAL+YvPv655qfNy76uprzrHI8cfvM55PfGm/K3O233vuO+638e9H5ko/ED+UPPR+mPHp9BP9z7nfP78L/eE8/sl0p8zAAAABGdBTUEAALGOfPtRkwAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAAAZUlEQVR42sSTQQrAMAgEHcn/v7w9tYgNNsGW7kkI2TgbRZJ15NbU+waAAFV11MiXz0yq2sxMEiVCDDcHLeky8nQAUDJnM88IuyGOGf/n3wjcQ1zhf+xgxSS+PkXY7aQ9yvy+jccAMs9AI/bwo38AAAAASUVORK5CYII=), auto';
			
			}
			// Right click
			else{
				// Cursor's style modification: Zooming (same as Rotating) icon
				_navigation.globe.renderContext.canvas.style.cursor = 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABeUlEQVR42u2XS07DMBCGbaCCQstzy4YDcAGWCAE3YI3omsN0XcSaGxSEWHIBDsCGLY9SykM80m/CFLkhIBycVpVi6ZetUez/S2x5JtYMudkCYJQBbGJ+pBoIgMybQKUoijrW2hnGr+jNFyILQM+8jHkLc0Nv6OeIPflC+AJ8M++1rBA+AD+a/wfCB2Bczdtp5gmIqkK8hwSQt69gcNu3gJ6BRGyB7kG/QlAAOe3rSD5zFeO6cwj3ibVRC52hTmgA2YJJVUUgML5wAFbVXN78RRV0C+TZMVUZLWJ86QCsELsxn3v/oQp6CN02hZYwvnIAloldo2efhQqAAqAAGKl7IL4JpQDpWyA9F8iVHfwmjHMBZnd/yIbzJodcEGdDtInJ0S/1wA7DE5NDNozrATSLtjE7SKmI9hg20b3JoR74qogUYgvThnMIa8SOHfPgFVEaxAbmh5jvMj71Nc8CkISYRmvoHD36mmcFcCFKOhbDgf0XuHOH9mcUrHUBoVXvIfh2krcAAAAASUVORK5CYII=), auto';
			}
		}
		
		_needsStartEvent = true;
		
		// Return false to stop mouse down to be propagated when using onmousedown
		return false;
		
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
			// Left click
			if ( event.button == 0 )
			{
				//different behavior if the move has change from pan to rotate
				if(_changeInertia){
					_navigation.inertia.launch("rotate", _changeInertia, 0 );
				}
				else{
					_navigation.inertia.launch("pan", _dx, _dy );
				}
			
			}
			// Middle click
			else if ( event.button == 1 )
			{
				_navigation.inertia.launch("rotate", -_dx, -_dy );
			}
		}

		// Cursor's style modification : Hand icon
		_navigation.globe.renderContext.canvas.style.cursor = 'url(data:image/png;base64,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), auto';
		
		_pressedGeo = null;
		_slower = 0;
		
		if (_needsEndEvent ) {
			_navigation.globe.publish("endNavigation");
		}

		_needsStartEvent = false;
		_needsEndEvent = false;
		
		// Stop mouse up event
		return false;
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
		// Pan on Left click
		if ( _pressedButton == 0 )
		{
			if ( _needsStartEvent ) { 
				_navigation.globe.publish("startNavigation");
				_needsStartEvent  = false;
				_needsEndEvent = true;
			}
			
			// Compute the mouse position
			var pos = _navigation.globe.renderContext.getXYRelativeToCanvas(event);
			if(_pressedGeo){
				_changeInertia=null;
				var inside = _navigation.globe.getLonLatFromPixel(pos[0], pos[1]);
				if(inside){
					var pos2 = _navigation.globe.getPixelFromLonLat(_pressedGeo[0], _pressedGeo[1]);
					_dx = pos[0] - pos2[0];
					_dy = pos[1] - pos2[1];
					_navigation.pan( _dx, _dy );
				}
			}
			// If the mouse not on the globe
			if(!_pressedGeo || !inside){
				if(Math.abs(_dx) > Math.abs(_dy)){
					_changeInertia = (pos[1] > (_navigation.globe.renderContext.canvas.height/2)) ? -_dx : _dx;
				}
				else{
					_changeInertia = (pos[0] > (_navigation.globe.renderContext.canvas.width/2)) ? _dy : -_dy;
				}
				_navigation.rotate(_changeInertia,0);
				pos = _navigation.globe.renderContext.getXYRelativeToCanvas(event);
				_pressedGeo = _navigation.globe.getLonLatFromPixel(pos[0], pos[1]);
				if(_pressedGeo) _changeInertia=null;
			}
				
			_navigation.globe.renderContext.requestFrame();
			ret = true;
		}
		// Rotate on Middle click
		else if ( _pressedButton == 1 )
		{
			_navigation.rotate(-_dx,-_dy);
			_navigation.globe.renderContext.requestFrame();
			ret = true;
		}
		// Zoom on Right click
		else
		{
			// Mouse move is too fast for zooming, need to slow it down
			_slower++;
			if((_slower % 3 == 0) && ( _slower > 1 )){
			
				_navigation.globe.publish("startNavigation");
				
				_navigation.zoom(-_dy/10);
				
				if(_dy > 0 && _dy > _dx){
					// Compute the new position of lon lat and pan the globe toward it
					if(_pressedGeo){
						
						var pos = [_navigation.globe.renderContext.canvas.clientLeft+(_navigation.globe.renderContext.canvas.clientWidth / 2), _navigation.globe.renderContext.canvas.clientTop+(_navigation.globe.renderContext.canvas.clientHeight / 2)];
						var pos2 = _navigation.globe.getPixelFromLonLat(_pressedGeo[0], _pressedGeo[1]);
						
						var dx = pos[0] - pos2[0];
						dx = dx * 10 / 100;
						var dy = pos[1] - pos2[1];
						dy = dy * 10 / 100;
						
						_navigation.pan(dx, dy);
					}
				}
	
				// Stop all animations when an event is received
				_navigation.stopAnimations();
				
				_navigation.globe.publish("endNavigation");
				_navigation.globe.renderContext.requestFrame();
			}
			
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
		// Need this so browser's context menu won't show up when using right click zooming
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
		
		var canvas = _navigation.renderContext.canvas;
		
		// Cursor's style modification : Hand icon
		canvas.style.cursor = 'url(data:image/png;base64,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), auto';

		
		// Setup the mouse event handlers
		canvas.addEventListener("mousedown", _handleMouseDown);
		document.addEventListener("mouseup", _handleMouseUp);
		canvas.addEventListener("mousemove", _handleMouseMove);
		canvas.addEventListener("contextmenu", _handleContextMenu);
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
		var canvas = _navigation.renderContext.canvas;

		canvas.style.cursor = 'auto';
		
		canvas.removeEventListener("mousedown", _handleMouseDown);
		document.removeEventListener("mouseup", _handleMouseUp);
		canvas.removeEventListener("mousemove", _handleMouseMove);
		canvas.removeEventListener("contextmenu", _handleContextMenu);
		canvas.removeEventListener("dblclick", _handleMouseDblClick);
			
		// For Firefox
		canvas.removeEventListener("DOMMouseScroll", _handleMouseWheel);
		canvas.removeEventListener("mousewheel", _handleMouseWheel);
	};
};

return GoogleMouseNavigationHandler;

});

