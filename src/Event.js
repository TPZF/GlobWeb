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
	@name Event
	@class
	A light-weight event object.
 */
var Event = function()
{	
	// Event callbacks
	this.callbacks = {};
}

/**************************************************************************************************************/

/** 
	Subscribe to an event
	
	@param name Event name
		<ul>
			<li>startNavigation : called when navigation is started (by the user or through animation)</li>
			<li>endNavigation : called when navigation is ended (by the user or through animation)t</li>
			<li>baseLayersReady : called when the base layers are ready to be displayed</li>
			<li>baseLayersError : called when the base layers are not valid, or not accessible, in that case nothing is displayed so this event is useful to provide an error message to the user</li>
			<li>startBackgroundLoad : called when background layers (imagery and/or elevation) start to be loaded</li>
			<li>endBackgroundLoad : called when background layers (imagery and/or elevation) end loading</li>
			<li>startLoad : called when a layer start to be loaded</li>
			<li>endLoad : called whena layer end loading</li>
		</ul>
	@param callback Callback function
*/
Event.prototype.subscribe = function(name,callback)
{
	if ( !this.callbacks[name] ) {
		this.callbacks[name] = [ callback ];
	} else {
		this.callbacks[name].push( callback );
	}
}

/**************************************************************************************************************/

/** 
	Unsubscribe to an event 
	
	@param name Event name {@link Globe#subscribe}
	@param callback Callback function
*/
Event.prototype.unsubscribe = function(name,callback)
{
	if( this.callbacks[name] ) {
		var i = this.callbacks[name].indexOf( callback );
		if ( i != -1 ) {
			this.callbacks[name].splice(i,1);
		}
	}
}

/**************************************************************************************************************/

/**
	Publish an event
	
	@param name Event name
	@param context Context
	
	@private
*/
Event.prototype.publish = function(name,context)
{
	if ( this.callbacks[name] ) {
		var cbs = this.callbacks[name];
		for ( var i = 0; i < cbs.length; i++ ) {
			cbs[i](context);
		}
	}
}

/**************************************************************************************************************/

return Event;

});
