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
	GlobWeb.BaseLayer.prototype.constructor.call( this, options );
	
	// Base properties
	this.tilePixelSize = -1;
	this.tiling = null;
	this.numberOfLevels = -1;
	this.overlay = options && options.hasOwnProperty('overlay') ? options['overlay'] : true;
	this.geoBound = options['geoBound'] || null;
	this.coordinates = options['coordinates'] || null;
	
	// Internal
	this.ready = true;
}

/**************************************************************************************************************/

GlobWeb.inherits( GlobWeb.BaseLayer,GlobWeb.RasterLayer );

/**************************************************************************************************************/

/** 
  Attach the raster layer to the globe
 */
GlobWeb.RasterLayer.prototype._attach = function( g )
{
	GlobWeb.BaseLayer.prototype._attach.call( this, g );
	
	if ( this.attribution )
	{
		if ( !this.overlay )
		{
			// Override id of background layer because of unicity of background not overlayed layer
			this.id = 0;
		}
		this.globe.attributionHandler.addAttribution(this);
	}
	
	if ( this._visible )
	{
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
	
	GlobWeb.BaseLayer.prototype._detach.call( this, g );
}

/**************************************************************************************************************/

/**
  Set the raster layer visible
 */
GlobWeb.RasterLayer.prototype.visible = function( arg )
{
	if ( this._visible != arg ) 
	{
		this._visible = arg;
		// When raster is an overlay, RasterOverlayRenderer is used to render it 
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
}

/**************************************************************************************************************/

/**
  Set the opacity of the raster layer
 */
GlobWeb.RasterLayer.prototype.opacity = function( arg )
{
	// TODO
}
