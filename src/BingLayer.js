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

var BingTileSystem = (function() 
{
	var EarthRadius = 6378137;
	var MinLatitude = -85.05112878;
	var MaxLatitude = 85.05112878;
	var MinLongitude = -180;
	var MaxLongitude = 180;


	// <summary>
	// Clips a number to the specified minimum and maximum values.
	// </summary>
	// <param name="n">The number to clip.</param>
	// <param name="minValue">Minimum allowable value.</param>
	// <param name="maxValue">Maximum allowable value.</param>
	// <returns>The clipped value.</returns>
	function Clip( n, minValue, maxValue)
	{
		return Math.min(Math.max(n, minValue), maxValue);
	}
        

	// <summary>
	// Determines the map width and height (in pixels) at a specified level
	// of detail.
	// </summary>
	// <param name="levelOfDetail">Level of detail, from 1 (lowest detail)
	// to 23 (highest detail).</param>
	// <returns>The map width and height in pixels.</returns>
	function MapSize(levelOfDetail)
	{
		return 256 << levelOfDetail;
	}


	// <summary>
	// Determines the ground resolution (in meters per pixel) at a specified
	// latitude and level of detail.
	// </summary>
	// <param name="latitude">Latitude (in degrees) at which to measure the
	// ground resolution.</param>
	// <param name="levelOfDetail">Level of detail, from 1 (lowest detail)
	// to 23 (highest detail).</param>
	// <returns>The ground resolution, in meters per pixel.</returns>
	function GroundResolution(latitude, levelOfDetail)
	{
		latitude = Clip(latitude, MinLatitude, MaxLatitude);
		return Math.cos(latitude * Math.PI / 180.0) * 2.0 * Math.PI * EarthRadius / MapSize(levelOfDetail);
	}



	// <summary>
	// Determines the map scale at a specified latitude, level of detail,
	// and screen resolution.
	// </summary>
	// <param name="latitude">Latitude (in degrees) at which to measure the
	// map scale.</param>
	// <param name="levelOfDetail">Level of detail, from 1 (lowest detail)
	// to 23 (highest detail).</param>
	// <param name="screenDpi">Resolution of the screen, in dots per inch.</param>
	// <returns>The map scale, expressed as the denominator N of the ratio 1 : N.</returns>
	function MapScale( latitude, levelOfDetail, screenDpi)
	{
		return GroundResolution(latitude, levelOfDetail) * screenDpi / 0.0254;
	}

	// <summary>
	// Converts a point from latitude/longitude WGS-84 coordinates (in degrees)
	// into pixel XY coordinates at a specified level of detail.
	// </summary>
	// <param name="latitude">Latitude of the point, in degrees.</param>
	// <param name="longitude">Longitude of the point, in degrees.</param>
	// <param name="levelOfDetail">Level of detail, from 1 (lowest detail)
	// to 23 (highest detail).</param>
	// <param name="pixelX">Output parameter receiving the X coordinate in pixels.</param>
	// <param name="pixelY">Output parameter receiving the Y coordinate in pixels.</param>
	function LatLongToPixelXY(latitude, longitude, levelOfDetail)
	{
		latitude = Clip(latitude, MinLatitude, MaxLatitude);
		longitude = Clip(longitude, MinLongitude, MaxLongitude);

		var x = (longitude + 180) / 360; 
		var sinLatitude = Math.sin(latitude * Math.PI / 180);
		var y = 0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI);

		var mapSize = MapSize(levelOfDetail);
		var pixelX = Clip(x * mapSize + 0.5, 0, mapSize - 1);
		var pixelY = Clip(y * mapSize + 0.5, 0, mapSize - 1);
		
		return [ Math.floor(pixelX),  Math.floor(pixelY) ];
	}



	// <summary>
	// Converts a pixel from pixel XY coordinates at a specified level of detail
	// into latitude/longitude WGS-84 coordinates (in degrees).
	// </summary>
	// <param name="pixelX">X coordinate of the point, in pixels.</param>
	// <param name="pixelY">Y coordinates of the point, in pixels.</param>
	// <param name="levelOfDetail">Level of detail, from 1 (lowest detail)
	// to 23 (highest detail).</param>
	// <param name="latitude">Output parameter receiving the latitude in degrees.</param>
	// <param name="longitude">Output parameter receiving the longitude in degrees.</param>
	function PixelXYToLatLong( pixelX, pixelY, levelOfDetail)
	{
		var mapSize = MapSize(levelOfDetail);
		var x = (Clip(pixelX, 0, mapSize - 1) / mapSize) - 0.5;
		var y = 0.5 - (Clip(pixelY, 0, mapSize - 1) / mapSize);

		var latitude = 90 - 360 * Math.atan(Math.exp(-y * 2 * Math.PI)) / Math.PI;
		var longitude = 360 * x;
		
		return [ latitude, longitude ];
	}



	// <summary>
	// Converts pixel XY coordinates into tile XY coordinates of the tile containing
	// the specified pixel.
	// </summary>
	// <param name="pixelX">Pixel X coordinate.</param>
	// <param name="pixelY">Pixel Y coordinate.</param>
	// <param name="tileX">Output parameter receiving the tile X coordinate.</param>
	// <param name="tileY">Output parameter receiving the tile Y coordinate.</param>
	function PixelXYToTileXY( pixelXY )
	{
		return [ pixelXY[0] / 256, pixelXY[1] / 256 ];
	}



	// <summary>
	// Converts tile XY coordinates into pixel XY coordinates of the upper-left pixel
	// of the specified tile.
	// </summary>
	// <param name="tileX">Tile X coordinate.</param>
	// <param name="tileY">Tile Y coordinate.</param>
	// <param name="pixelX">Output parameter receiving the pixel X coordinate.</param>
	// <param name="pixelY">Output parameter receiving the pixel Y coordinate.</param>
	function TileXYToPixelXY( tileXY )
	{
		return [ tileXY[0] * 256, tileXY[1] * 256 ];
	}



	// <summary>
	// Converts tile XY coordinates into a QuadKey at a specified level of detail.
	// </summary>
	// <param name="tileX">Tile X coordinate.</param>
	// <param name="tileY">Tile Y coordinate.</param>
	// <param name="levelOfDetail">Level of detail, from 1 (lowest detail)
	// to 23 (highest detail).</param>
	// <returns>A string containing the QuadKey.</returns>
	function TileXYToQuadKey( tileX,  tileY, levelOfDetail)
	{
		var quadKey = "";
		for ( var i = levelOfDetail; i > 0; i--)
		{
			var digit = '0';
			var mask = 1 << (i - 1);
			if ((tileX & mask) != 0)
			{
				digit++;
			}
			if ((tileY & mask) != 0)
			{
				digit++;
				digit++;
			}
			quadKey += digit;
		}
		return quadKey;
	}



	// <summary>
	// Converts a QuadKey into tile XY coordinates.
	// </summary>
	// <param name="quadKey">QuadKey of the tile.</param>
	// <param name="tileX">Output parameter receiving the tile X coordinate.</param>
	// <param name="tileY">Output parameter receiving the tile Y coordinate.</param>
	// <param name="levelOfDetail">Output parameter receiving the level of detail.</param>
	function QuadKeyToTileXY( quadKey)
	{
		var tileX = 0, tileY = 0;
		var levelOfDetail = quadKey.length();
		for (var i = levelOfDetail; i > 0; i--)
		{
			var mask = 1 << (i - 1);
			switch (quadKey[levelOfDetail - i])
			{
				case '0':
					break;

				case '1':
					tileX |= mask;
					break;

				case '2':
					tileY |= mask;
					break;

				case '3':
					tileX |= mask;
					tileY |= mask;
					break;

				default:
					throw new ArgumentException("Invalid QuadKey digit sequence.");
			}
		}
	}
	
	return {
		tileXYToQuadKey: TileXYToQuadKey,
		latLongToPixelXY : LatLongToPixelXY
	}
})();
 
/**************************************************************************************************************/


/** @name BingLayer
	@class
	A layer to display Bing imagery data.
	@augments RasterLayer
	@param options Configuration properties. See {@link RasterLayer} for base properties :
		<ul>
			<li>imageSet : the image set to use, can be Aerial, Road</li>
			<li>key : the bing key to use</li>
		</ul>
 */
var BingLayer = function( options )
{
	// Call ancestor
	RasterLayer.prototype.constructor.call( this, options );
	
	this.tilePixelSize = 256;
	this.tiling = new MercatorTiling( options.baseLevel || 2 );
	this.numberOfLevels = 18;
	this.baseUrl = "";
	this.baseUrlSubDomains = [];
	this._ready = false;
	
	var self = this;
	
	// Need to provide a global callback for JSONP
	window["_bingTileProviderCallback"] = function(result) {
	
			self.baseUrl = result.resourceSets[0].resources[0].imageUrl;
			self.baseUrlSubDomains = result.resourceSets[0].resources[0].imageUrlSubdomains;
			self._ready = true;
			
			// Call callback if set
			if (options.onready && options.onready instanceof Function)
			{
				options.onready(self);
			}
			
			// Request a frame
			if ( self.globe )
			{
				self.globe.renderContext.requestFrame();
			}
	};
	
	// JSONP Call : needed because of cross-site origin policy
	var script = document.createElement("script");
	script.type = "text/javascript";
	script.src = "http://dev.virtualearth.net/REST/V1/Imagery/Metadata/" + options.imageSet + "?jsonp=_bingTileProviderCallback&key=" + options.key;
	script.id = "_bingTileProviderCallback";
	document.getElementsByTagName("head")[0].appendChild(script);
}

Utils.inherits(RasterLayer,BingLayer);

/**************************************************************************************************************/

/**
	Get an url for the given tile
 */
BingLayer.prototype.getUrl = function(tile)
{
	var url = this.baseUrl.replace( "{quadkey}", BingTileSystem.tileXYToQuadKey(tile.x,tile.y,tile.level) );	
	return url.replace( "{subdomain}", this.baseUrlSubDomains[ Math.floor( Math.random() * this.baseUrlSubDomains.length ) ] );
}

/**************************************************************************************************************/

return BingLayer;

});
