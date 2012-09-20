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
	RasterLayer constructor
 */
 GlobWeb.RasterLayer = function( options )
{
	// Base properties
	this.tilePixelSize = -1;
	this.tiling = null;
	this.numberOfLevels = -1;
	this.name = options && options.hasOwnProperty('name') ? options['name'] : "";
	this.overlay = options && options.hasOwnProperty('overlay') ? options['overlay'] : true;
	this.geoBound = options['geoBound'] || null;
	this.coordinates = options['coordinates'] || null;
	this.attribution = options['attribution'] || "";
	
	// Internal
	this.ready = true;
	this.globe = null;
}

/**************************************************************************************************************/

/** 
  Attach the raster layer to the globe
 */
GlobWeb.RasterLayer.prototype._attach = function( g )
{
	this.globe = g;
	
	// When raster is an overlvay, RasterOverlayRenderer is used to render it 
	if ( this.overlay )
	{
		// Create the renderer if needed
		if ( !g.rasterOverlayRenderer )
		{
			var renderer = new GlobWeb.RasterOverlayRenderer(g.tileManager);
			g.tileManager.addPostRenderer(renderer);
			g.rasterOverlayRenderer = renderer;
		}
		g.rasterOverlayRenderer.addOverlay(this);
	}
}

/**************************************************************************************************************/

/** 
  Detach the raster layer from the globe
 */
GlobWeb.RasterLayer.prototype._detach = function( g )
{
	// Remove raster from overlay renderer if needed
	if ( this.overlay && this.globe.rasterOverlayRenderer )
	{
		this.globe.rasterOverlayRenderer.removeOverlay(this);
	}
	this.globe = null;
}

/**************************************************************************************************************/
