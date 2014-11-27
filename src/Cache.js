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
 *	@param options
 *		<ul>
 *			<li>layer: Layer which will contain the given cache(required)</li>
 *			<li>cacheLevel: the maximum level of tiles to be cached</li>
 *			<li>maxCacheSize: the number of tile request to be cached(work in progress..)</li>
 *		</ul>
 */
var Cache = function(options) {
	
	this.layer = options.layer;

	this.cacheLevel = options.hasOwnProperty('cacheLevel') ? options.cacheLevel : 1;
	this._maxCacheSize = options.hasOwnProperty('maxCacheSize') ? options.cacheLevel : 9;

	if ( !localStorage.getItem(this.layer.name) )
	{
		// Create cache space in local storage named after layer
		localStorage.setItem(this.layer.name, JSON.stringify({
			length: 0
		}));
	}

	this._cache = JSON.parse(localStorage.getItem(this.layer.name));
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
		var tileInfo = this._cache[tileId];
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
var _createDataURL = function( image )
{
	var imgCanvas = document.createElement("canvas"),
	imgContext = imgCanvas.getContext("2d");

	// Make sure canvas is as big as the picture
	imgCanvas.width = image.width;
	imgCanvas.height = image.height;

	// Draw image into canvas element
	imgContext.drawImage(image, 0, 0, image.width, image.height);

	// Save image as a data URL
	return imgCanvas.toDataURL("image/png");
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
		this._cache[tileId] = {
			dataUrl: _createDataURL(tileRequest.image),
			elevations: tileRequest.elevations,
			lastAccess: Date.now()
		};
		console.log("Stored for " + tileRequest.image.src);

		this._cache.length++;

		// Draft to purge some cached requests
		// if ( this._maxCacheSize < this._cache.length )
		// {
		// 	var keys = [];
		// 	// Purge the least accessed request
		// 	for ( var x in this._cache )
		// 	{
		// 		var lastAccess = this._cache[x].lastAccess;
		// 		if ( lastAccess ) // To avoid "length" property
		// 		{
		// 			keys.push(this._cache[x]);
		// 		}
		// 	}

		// 	keys.sort(function(a,b){
		// 		return a.lastAccess - b.lastAccess;
		// 	});

		// 	while( this._maxCacheSize < keys.length )
		// 	{
		// 		console.log("deleting: " + this._cache[0]);
		// 		delete this._cache[keys[0]];
		// 	}
		// }

		// Update local storage with new cache
		localStorage.setItem(this.layer.name, JSON.stringify(this._cache));
	}
};

return Cache;

});