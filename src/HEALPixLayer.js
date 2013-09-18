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

define(['./Utils', './HEALPixTiling', './RasterLayer'], 
	function(Utils, HEALPixTiling, RasterLayer) {

/**************************************************************************************************************/

/** @export
	@constructor
	HEALPixLayer constructor
*/

var HEALPixLayer = function(options)
{
	RasterLayer.prototype.constructor.call( this, options );
	
	this.tilePixelSize = options.tilePixelSize || 512;
	this.tiling = new HEALPixTiling( options.baseLevel || 3, options );
	this.numberOfLevels = options.numberOfLevels || 10;
	this.type = "ImageryRaster";
	this.baseUrl = options['baseUrl'];
	this.dataType = options.dataType || "jpg";
	
	// allsky
	this.levelZeroImage = new Image();
	var self = this;
	this.levelZeroImage.crossOrigin = '';
	this.levelZeroImage.onload = function () 
	{
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
	}
	this.levelZeroImage.onerror = function(event) {
		self.globe.publish("baseLayersError", self);
		self._ready = false;
		
		console.log("Cannot load " + self.levelZeroImage.src );
	}
	
	this._ready = false;
}

/**************************************************************************************************************/

Utils.inherits(RasterLayer, HEALPixLayer);

/**************************************************************************************************************/

/** 
  Attach the raster layer to the globe
 */
HEALPixLayer.prototype._attach = function( g )
{
	RasterLayer.prototype._attach.call( this, g );

	// Load level zero image now
	this.levelZeroImage.src = this.baseUrl + "/Norder3/Allsky."+this.dataType;
}

/**************************************************************************************************************/

/**
 *	Get url from a given tile
 */
HEALPixLayer.prototype.getUrl = function(tile)
{
	var url = this.baseUrl;
	
	url += "/Norder";
	url += tile.order;
	
	url += "/Dir";
	var indexDirectory = Math.floor(tile.pixelIndex/10000) * 10000;
	url += indexDirectory;
	
	url += "/Npix";
	url += tile.pixelIndex;
	url += "."+this.dataType;
	
	return url;
}

/**************************************************************************************************************/

return HEALPixLayer;

});