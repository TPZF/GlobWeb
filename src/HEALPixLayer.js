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
	this.tiling = new HEALPixTiling( options.baseLevel || 2, options );
	this.numberOfLevels = options.numberOfLevels || 10;
	this.type = "ImageryRaster";
	this.baseUrl = options['baseUrl'];
	this.format = options.format || "jpg";
	this.coordSystem = options.coordSystem || "EQ";
	
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

	// Load level zero image now, only for background
	if ( !this._overlay )
	{
		this.levelZeroImage.src = this.baseUrl + "/Norder3/Allsky."+this.format;
	}
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
	url += "."+this.format;
	
	return url;
}


/**************************************************************************************************************/

/**
 *	Generate the level0 texture for the tiles
 */
HEALPixLayer.prototype.generateLevel0Textures = function(tiles,tilePool)
{
	// Create a canvas to build the texture
	var canvas = document.createElement("canvas");
	canvas.width = 128;
	canvas.height = 128;
	
	var context = canvas.getContext("2d");
	
	for ( var i = 0; i < tiles.length; i++ )
	{
		var tile = tiles[i];
		
		// Top left
		var pi = tile.pixelIndex * 4;
		var sx = ( pi % 27) * 64;
		var sy = ( Math.floor(pi /27) ) * 64;
		context.drawImage(this.levelZeroImage,sx,sy,64,64,0,0,64,64);
		
		// Top right
		pi = tile.pixelIndex * 4 + 2;
		var sx = ( pi % 27) * 64;
		var sy = ( Math.floor(pi /27) ) * 64;
		context.drawImage(this.levelZeroImage,sx,sy,64,64,64,0,64,64);
		
		// Bottom left
		pi = tile.pixelIndex * 4 + 1;
		var sx = ( pi % 27) * 64;
		var sy = ( Math.floor(pi /27) ) * 64;
		context.drawImage(this.levelZeroImage,sx,sy,64,64,0,64,64,64);
		
		// Bottom right
		pi = tile.pixelIndex * 4 + 3;
		var sx = ( pi % 27) * 64;
		var sy = ( Math.floor(pi /27) ) * 64;
		context.drawImage(this.levelZeroImage,sx,sy,64,64,64,64,64,64);

		var imgData = context.getImageData(0, 0, 128, 128);
		imgData.dataType = 'byte';
		
		tile.texture = tilePool.createGLTexture( imgData );
		tile.imageSize = 128;
	}
}

/**************************************************************************************************************/

return HEALPixLayer;

});