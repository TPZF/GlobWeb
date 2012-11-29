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
	WMTSLayer constructor
 */
GlobWeb.WMTSLayer = function( options )
{
	GlobWeb.RasterLayer.prototype.constructor.call( this, options );
	
	this.baseUrl = options['baseUrl'];
	this.tilePixelSize = options['tilePixelSize'] || 256;
	this.tiling = new GlobWeb.GeoTiling( 4, 2 );
	this.numberOfLevels = options['numberOfLevels'] || 21;
	this.type = "ImageryRaster";
	this.startLevel = options['startLevel'] || 1;
	
	// Build the base GetTile URL
	var url = this.baseUrl;
	if ( url.indexOf('?',0) == -1 )
	{
		url += '?service=wmts';
	}
	else
	{
		url += '&service=wmts';
	}
	url += "&version="
	url += options.hasOwnProperty('version') ? options['version'] : '1.0.0';
	url += "&request=GetTile";
	url += "&layer=" + options['layer'];
	url += "&tilematrixset=" + options['matrixSet'];
	if ( options.hasOwnProperty('style') )
	{
		url += "&style=" + options.style;
	}
	url += "&format=";
	url += options.hasOwnProperty('format') ? options['format'] : 'image/png';
/*	if ( options.hasOwnProperty('time') )
	{
		url += "&time=" + options.time;
	}*/
	
	this.getTileBaseUrl = url;
}

/**************************************************************************************************************/

GlobWeb.inherits(GlobWeb.RasterLayer,GlobWeb.WMTSLayer);

/**************************************************************************************************************/

/**
	Get an url for the given tile
 */
GlobWeb.WMTSLayer.prototype.getUrl = function(tile)
{
	var url = this.getTileBaseUrl;
	url += "&tilematrix=";
	url += tile.level + this.startLevel;
	url += "&tilecol=" + tile.x;
	url += "&tilerow=" + tile.y;
	
	return url;
}

/**************************************************************************************************************/
