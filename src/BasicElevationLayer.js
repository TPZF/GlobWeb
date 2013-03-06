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

define( ['./RasterLayer', './Utils', './GeoTiling' ],
		function(RasterLayer, KeyboardNavigationHandler, GeoTiling) {

/**************************************************************************************************************/

/** @export
	@constructor
	BasicElevationLayer constructor
 */
var BasicElevationLayer = function( options )
{
	RasterLayer.prototype.constructor.call( this, options );
	this.tilePixelSize = options['tilePixelSize'] || 33;
	this.tiling = new GeoTiling( 4, 2 );
	this.numberOfLevels = options['numberOfLevels'] || 21;
	this.type = "ElevationRaster";
	this.baseUrl = options['baseUrl'];
}

Utils.inherits(RasterLayer, BasicElevationLayer);

/**************************************************************************************************************/

/**
	Get an url for the given tile
 */
BasicElevationLayer.prototype.getUrl = function(tile)
{
	var geoBound = tile.geoBound;
	var url = this.baseUrl;
	url += "?extent=";
/*
	var deltaLon = (extent[1] - extent[0]) / size;
	var deltaLat = (extent[2] - extent[3]) / size;

	url += extent[0] - 0.5 * deltaLon;
	url += ",";
	url += extent[3] - 0.5 * deltaLat;
	url += ",";
	url += extent[1] + 0.5 * deltaLon;
	url += ",";
	url += extent[2] + 0.5 * deltaLat;*/

	url += geoBound.west;
	url += ",";
	url += geoBound.south;
	url += ",";
	url += geoBound.east;
	url += ",";
	url += geoBound.north;

	url += "&size="
	url += this.tilePixelSize;
	url += ","
	url += this.tilePixelSize;
	
	return url;
}

/**************************************************************************************************************/

/**
	Parse a elevation response
 */
BasicElevationLayer.prototype.parseElevations = function(text)
{
	var elevations = JSON.parse( text );
	
	// Remove invalid elevations
	for ( var i = 0; i < elevations.length; i++ )
	{
		if ( elevations[i] < 0.0 )
		{
			elevations[i] = 0.0;
		}
	}
	
	return elevations;
}

/**************************************************************************************************************/

return BasicElevationLayer;

});
