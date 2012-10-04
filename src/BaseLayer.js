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

/**************************************************************************************************************/


/** @export
	@constructor
	BaseLayer constructor
 */

GlobWeb.BaseLayer = function(options)
{
	this.globe = null;
	this.name = options && options.hasOwnProperty('name') ? options['name'] : "";
	this.attribution = options && options.hasOwnProperty('attribution') ? options['attribution'] : "";
	this._visible = options && options.hasOwnProperty('visible') ? options['visible'] : true;
	this._opacity = options && options.hasOwnProperty('opacity') ? options['opacity'] : 1.0;
}

/**************************************************************************************************************/

/** 
  Attach the raster layer to the globe
 */
GlobWeb.BaseLayer.prototype._attach = function( g )
{
	this.globe = g;
	
}

/**************************************************************************************************************/

/** 
  Detach the vector layer from the globe
 */
GlobWeb.BaseLayer.prototype._detach = function( g )
{
	if ( this.attribution )
	{
		this.globe.attributionHandler.removeAttribution(this);
	}
	
	this.globe = null;
}

/**************************************************************************************************************/

/**
  Set the layer visible
 */
GlobWeb.BaseLayer.prototype.visible = function( arg )
{
	if ( typeof arg == "boolean" )
		this._visible = arg;
	return this._visible;
}

/**************************************************************************************************************/

/**
  Set the opacity of the layer
 */
GlobWeb.BaseLayer.prototype.opacity = function( arg )
{
	if ( typeof arg == "boolean" )
		this._opacity = arg;
	return this._opacity;
}
