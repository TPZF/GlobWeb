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

 define(['./Utils','./RasterLayer','./MercatorTiling'], function(Utils,RasterLayer,MercatorTiling) {

/**************************************************************************************************************/


/** @name OSMLayer
	@class
	A layer to display data coming from OpenStreetMap server.
	@augments RasterLayer
	@param options Configuration properties for the OSMLayer. See {@link RasterLayer} for base properties :
		<ul>
			<li>baseUrl : the base Url to access the OSM server</li>
		</ul>
 */
var OSMLayer = function( options )
{
	RasterLayer.prototype.constructor.call( this, options );
	this.tilePixelSize = options.tilePixelSize || 256;
	this.tiling = new MercatorTiling( options.baseLevel || 2 );
	this.numberOfLevels = options.numberOfLevels || 21;
	this.baseUrl = options.baseUrl;
}

/**************************************************************************************************************/

Utils.inherits(RasterLayer,OSMLayer);

/**************************************************************************************************************/

/**
	Get an url for the given tile
 */
OSMLayer.prototype.getUrl = function(tile)
{
	var url = this.baseUrl + '/' + tile.level + '/' + tile.x + '/' + tile.y + '.png';
	return url;
}


/**************************************************************************************************************/

return OSMLayer;

});
