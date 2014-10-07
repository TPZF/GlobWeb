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
 
define(['./Utils', './RasterLayer', './GeoTiling'], 
	function(Utils, RasterLayer, GeoTiling) {

/**************************************************************************************************************/


/** @name WMSLayer
	@class
	A layer to display WMS (Web Map Service) data.
	@augments RasterLayer
	@param options Configuration properties for the WMSLayer. See {@link RasterLayer} for base properties :
		<ul>
			<li>baseUrl : the base Url to access the WMS server</li>
			<li>layers : the list of layers to request (WMS parameter)</li>
			<li>srs : the spatial system reference to use, default is EPSG:4326 (WMS parameter)</li>
			<li>format : the file format to request, default is image/jpeg (WMS parameter)</li>
		</ul>
 */
var WMSLayer = function( options )
{
	RasterLayer.prototype.constructor.call( this, options );
	
	this.baseUrl = options['baseUrl'];
	this.tilePixelSize = options['tilePixelSize'] || 256;
	this.tiling = new GeoTiling( 4, 2 );
	this.numberOfLevels = options['numberOfLevels'] || 21;
	
	// Build the base GetMap URL
	var url = this.baseUrl;
	if ( url.indexOf('?',0) == -1 )
	{
		url += '?service=wms';
	}
	else
	{
		url += '&service=wms';
	}
	url += "&version="
	url += options.hasOwnProperty('version') ? options['version'] : '1.1.1';
	url += "&request=GetMap";
	url += "&layers=" + options['layers'];
	url += "&styles=";
	if ( options.hasOwnProperty('styles') )
	{
		url += options.styles;
	}
	url += "&format=";
	url += options.hasOwnProperty('format') ? options['format'] : 'image/jpeg';
	if ( options.hasOwnProperty('transparent') )
	{
		url += "&transparent=" + options.transparent;
	}
	url += "&width=";
	url += this.tilePixelSize;
	url += "&height=";
	url += this.tilePixelSize;
	if ( options.hasOwnProperty('time') )
	{
		url += "&time=" + options.time;
	}
	
	this.getMapBaseUrl = url;
}

/**************************************************************************************************************/

Utils.inherits(RasterLayer,WMSLayer);

/**************************************************************************************************************/

/**
	Get an url for the given tile
 */
WMSLayer.prototype.getUrl = function(tile)
{
	// Just add the bounding box to the GetMap URL
	var bound = tile.bound;
	var url = this.getMapBaseUrl;
	
	url += "&srs=" + tile.config.srs;
	url += "&bbox=";
	
	url += bound.west;
	url += ",";
	url += bound.south;
	url += ",";
	url += bound.east;
	url += ",";
	url += bound.north;

//	console.log(url);
	
	return url;
}

/**************************************************************************************************************/

return WMSLayer;

});

