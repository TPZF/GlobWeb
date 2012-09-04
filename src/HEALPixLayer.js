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
	HEALPixLayer constructor
*/

GlobWeb.HEALPixLayer = function(options)
{
	GlobWeb.RasterLayer.prototype.constructor.call( this, options );
	
	this.tilePixelSize = options.tilePixelSize || 512;
	this.tiling = new GlobWeb.HEALPixTiling( options.baseLevel || 3 );
	this.numberOfLevels = options.numberOfLevels || 10;
	this.type = "ImageryRaster";
	this.baseUrl = options['baseUrl'];
	
	// allsky
	this.levelZeroImage = new Image();
	var self = this;
	this.levelZeroImage.crossOrigin = '';
	this.levelZeroImage.onload = function () 
	{
		self.ready = true;
		
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
		console.log("Cannot load " + self.levelZeroImage.src );
	}
	
	this.ready = false;
	this.levelZeroImage.src = this.baseUrl + "/Norder3/Allsky.jpg";
}

/**************************************************************************************************************/

GlobWeb.inherits(GlobWeb.RasterLayer,GlobWeb.HEALPixLayer);

/**************************************************************************************************************/

/*
*	Get url from a given tile
*/
GlobWeb.HEALPixLayer.prototype.getUrl = function(tile)
{
	var url = this.baseUrl;
	
	url += "/Norder";
	url += tile.order;
	
	url += "/Dir";
	var indexDirectory = Math.floor(tile.pixelIndex/10000) * 10000;
	url += indexDirectory;
	
	url += "/Npix";
	url += tile.pixelIndex;
	url += ".jpg";
	
	return url;
}

/**************************************************************************************************************/