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
	
	@param options Different options
		<ul>
			<li>id : id of attribution HTML element</li>
		</ul>
	@param styles CSS style parameters
*/

var AttributionHandler = function(options, style)
{
	// Default options
	this.id = "attributions";
	
	for (var x in options)
	{
		this[x] = options[x];
	}
	
	// HTML initialisation
	this.attributionDiv = document.createElement("div");
	this.attributionDiv.id = this.id;
	
	var body = document.getElementsByTagName("body")[0];
	body.appendChild(this.attributionDiv);
	
	// CSS initialisation
	var sheet = document.createElement('style');
	sheet.innerHTML = "#" + this.id + " {text-align: right; position: absolute; right: 0px; bottom: 2px; }\
				#"+this.id+" div {color: white}";
				
	document.body.appendChild(sheet);
	
	// Apply style parameters
	for (var x in style)
	{
		document.getElementById(this.id).style[x]=style[x];
	}
}

/**************************************************************************************************************/

/**
* 	Remove attribution from HTML
* 	@param layer Selected layer
*/
AttributionHandler.prototype.removeAttribution = function( layer )
{
	var div = document.getElementById( "attribution_"+layer.id );
	if ( div )
		this.attributionDiv.removeChild( div );
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
	div.id = "attribution_"+layer.id;
	
	if(layer.id == 0)
	{
		// Background layer
		this.attributionDiv.insertBefore( div, this.attributionDiv.firstChild );
	}
	else
	{
		this.attributionDiv.appendChild( div );
	}
	
	
}

/**************************************************************************************************************/

return AttributionHandler;

});
