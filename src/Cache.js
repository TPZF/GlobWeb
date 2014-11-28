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

define(function() {

/**
 *	Cache storing <RasterLayer> tile requests in browser's local storage
 *	Due to performance reasons, it's recommended to use it only for tiles of level 0
 *	@param options
 *		<ul>
 *			<li>layer: Layer which will contain the given cache(required)</li>
 *			<li>cacheLevel: the maximum level of tiles to be cached</li>
 *		</ul>
 */
var Cache = function(options) {
	
	this.layer = options.layer;

	this.cacheLevel = options.hasOwnProperty('cacheLevel') ? options.cacheLevel : 1;

	if ( !localStorage.getItem(this.layer.name) )
	{
		// Create cache space in local storage named after layer
		localStorage.setItem(this.layer.name, JSON.stringify({}));
	}

	this._cacheMap = JSON.parse(localStorage.getItem(this.layer.name));

	this.imgCanvas = document.createElement("canvas");
	// Make sure canvas is as big as layer requests
	this.imgCanvas.width = options['tilePixelSize'] || 256;
	this.imgCanvas.height = options['tilePixelSize'] || 256;

	this.imgContext = this.imgCanvas.getContext("2d");
}


/**************************************************************************************************************/

/**
 *	Get tile request from cache for the given tile
 *	@returns The image(TODO: handle elevations) corresponding to the given tile, null if doesn't exist in cache
 */
Cache.prototype.getFromCache = function( tile )
{
	var cachedTileRequest = null;
	if ( this.cacheLevel >= tile.level )
	{
		var tileId = this.layer.getUrl(tile);
		var tileInfo = this._cacheMap[tileId];
		if ( tileInfo )
		{
			// Update access info
			tileInfo.lastAccess = Date.now();

			var image = new Image();
			image.src = tileInfo.dataUrl;
			image.dataType = "byte";
			cachedTileRequest = {
				image: image,
				elevations: tileInfo.elevations
			};
		}
	}
	return cachedTileRequest;
};

/**************************************************************************************************************/

/**
 *	Internal method to generate data url from HTML image object
 */
Cache.prototype._createDataURL = function( image )
{
	// Draw image into canvas element
	this.imgContext.drawImage(image, 0, 0, image.width, image.height);

	// Save image as a data URL
	return this.imgCanvas.toDataURL("image/png");
};

/**************************************************************************************************************/

/**
 *	Store tile request in cache
 */
Cache.prototype.storeInCache = function( tileRequest )
{
	var tile = tileRequest.tile;
	if ( this.cacheLevel >= tile.level )
	{
		var tileId = this.layer.getUrl(tile);
		this._cacheMap[tileId] = {
			dataUrl: this._createDataURL(tileRequest.image),
			elevations: tileRequest.elevations,
			lastAccess: Date.now()
		};
		console.log("Stored for " + tileRequest.image.src);

		// Update local storage with new cache
		localStorage.setItem(this.layer.name, JSON.stringify(this._cacheMap));
	}
};

return Cache;

});