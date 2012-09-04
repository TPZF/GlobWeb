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
	OSMLayer constructor
 */
GlobWeb.OSMLayer = function( options )
{
	GlobWeb.RasterLayer.prototype.constructor.call( this, options );
	this.tilePixelSize = options.tilePixelSize || 256;
	this.tiling = new GlobWeb.MercatorTiling( options.baseLevel || 2 );
	this.numberOfLevels = options.numberOfLevels || 21;
	this.type = "ImageryRaster";
	this.baseUrl = options.baseUrl;
}

/**************************************************************************************************************/

GlobWeb.inherits(GlobWeb.RasterLayer,GlobWeb.OSMLayer);

/**************************************************************************************************************/

/**
	Get an url for the given tile
 */
GlobWeb.OSMLayer.prototype.getUrl = function(tile)
{
	var url = this.baseUrl + '/' + tile.level + '/' + tile.x + '/' + tile.y + '.png';
	return url;
}


/**************************************************************************************************************/
