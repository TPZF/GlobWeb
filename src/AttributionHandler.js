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
 * 	@class Manage the attributions
	@constructor
	Function constructor for AttributionHandler
	
	@param globe
	@param options Configuration properties
		<ul>
			<li>element : the HTML element to show attributions, can be a string (the ID) or the DOM element itself</li>
		</ul>
*/

var AttributionHandler = function(globe, options)
{
	globe.attributionHandler = this;

	var elt = options ? options['element'] : undefined;
	if ( elt )
	{	
		if (typeof elt == "string") 
		{
			this.element = document.getElementById(elt);
		}
		else
		{
			this.element = elt;
		}
	}
}

/**************************************************************************************************************/

/**
* 	Remove attribution from HTML
* 	@param layer Selected layer
*/
AttributionHandler.prototype.removeAttribution = function( layer )
{
	var div = document.getElementById( this.element.id+"_"+layer.id );
	if ( div )
		this.element.removeChild( div );
}

/**************************************************************************************************************/

/**
* 	Add attribution in HTML
* 	@param layer Selected layer
*/
AttributionHandler.prototype.addAttribution = function(layer)
{ 
	var div = document.createElement('div');
	div.innerHTML = layer.attribution;
	div.id = this.element.id + "_" + layer.id;
	
	if(layer.id == 0)
	{
		// Background layer
		this.element.insertBefore( div, this.element.firstChild );
	}
	else
	{
		this.element.appendChild( div );
	}
}

/**************************************************************************************************************/

/**
*	Toggle attribution
* 	@param layer Selected layer
*/
AttributionHandler.prototype.toggleAttribution = function(layer)
{
	var div = document.getElementById(this.element.id+"_"+layer.id);
	if ( div )
	{
		this.removeAttribution(layer);
	}
	else
	{
		this.addAttribution(layer);
	}
}

/**************************************************************************************************************/

return AttributionHandler;

});
