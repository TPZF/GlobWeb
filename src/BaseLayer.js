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

 define( ["./Event", "./Utils"], function(Event, Utils) {
 
/**************************************************************************************************************/


/** @name BaseLayer
	@class
	Base class for layer.
	@param options Configuration properties for a BaseLayer:
		<ul>
			<li>name : the layer name</li>
			<li>description :  its description</li>
			<li>attribution : its attribution</li>
			<li>icon : an icon to represent the layer</li>
			<li>visible : a boolean flag to set the layer visible, default is true </li>
			<li>opacity : an opacity value, default is 1.0</li>
		</ul>
 */
var BaseLayer = function(options)
{
	Event.prototype.constructor.call( this, options );

	this.globe = null;
	this.name = options && options.hasOwnProperty('name') ? options['name'] : "";
	this.attribution = options && options.hasOwnProperty('attribution') ? options['attribution'] : "";
	this.icon = options && options.hasOwnProperty('icon') ? options['icon'] : "";
	this.description = options && options.hasOwnProperty('description') ? options['description'] : "";
	this._visible = options && options.hasOwnProperty('visible') ? options['visible'] : true;
	this._opacity = options && options.hasOwnProperty('opacity') ? options['opacity'] : 1.0;
}

/**************************************************************************************************************/

Utils.inherits( Event,BaseLayer );

/**************************************************************************************************************/

/** 
  Attach the raster layer to the globe
 */
BaseLayer.prototype._attach = function( g )
{
	this.globe = g;
	if ( this.attribution && this.globe.attributionHandler && this._visible )
	{
		this.globe.attributionHandler.addAttribution(this);
	}
}

/**************************************************************************************************************/

/** 
  Detach the vector layer from the globe
 */
BaseLayer.prototype._detach = function()
{
	if ( this.attribution && this.globe.attributionHandler )
	{
		this.globe.attributionHandler.removeAttribution(this);
	}
	
	this.globe = null;
}

/**************************************************************************************************************/

/**
  Get/Set the layer visible
 */
BaseLayer.prototype.visible = function( arg )
{
	if ( typeof arg == "boolean" )
	{
		if (  this._visible != arg && this.attribution && this.globe.attributionHandler )
		{
			this.globe.attributionHandler.toggleAttribution(this);
		}

		this._visible = arg;
		if ( this.globe ) this.globe.renderContext.requestFrame();
		this.publish("visibility:changed", this);
	}
	return this._visible;
}

/**************************************************************************************************************/

/**
  Get/Set the opacity of the layer
 */
BaseLayer.prototype.opacity = function( arg )
{
	if ( typeof arg == "number" )
	{
		this._opacity = arg;
		if ( this.globe ) this.globe.renderContext.requestFrame();
		this.publish("opacity:changed");
	}
	return this._opacity;
}

return BaseLayer;

});
