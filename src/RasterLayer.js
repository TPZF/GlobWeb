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

 define(['./Utils', './BaseLayer', './RasterOverlayRenderer', './Cache' ], 
	function(Utils, BaseLayer, RasterOverlayRenderer, Cache) {

/**************************************************************************************************************/


/** @name RasterLayer
	@class
	Base class for raster layer
	@augments BaseLayer
	@param options Configuration properties for the RasterLayer. See {@link BaseLayer} for base properties :
		<ul>
			<li>tilePixelSize : the image size for a tile, default is 256.</li>
			<li>numberOfLevels : the maximum number of levels</li> 
			<li>geoBound : the extent of the layer</li>
			<li>cache : Object containing cache options</li>
		</ul>
*/
var RasterLayer = function( options )
{
	BaseLayer.prototype.constructor.call( this, options );
	
	// Base properties
	this.tilePixelSize = -1;
	this.tiling = null;
	this.numberOfLevels = -1;
	this.geoBound = options.geoBound || null;
	this.coordinates = options.coordinates || null;
	this.zIndex = options.zIndex || 0;
	this.crossOrigin = options.crossOrigin || 'anonymous';

	// Init cache if defined
	if ( options.cache )
	{
		options.cache.layer = this;
		this.cache = new Cache(options.cache);
	}
	
	// Internal
	this._overlay = true; 
	this._ready = true; // Ready is use by TileManager
}

/**************************************************************************************************************/

Utils.inherits( BaseLayer,RasterLayer );

/**************************************************************************************************************/

/** 
  Attach the raster layer to the globe
 */
RasterLayer.prototype._attach = function( g )
{
	if ( !this._overlay )
	{
		// Override id of background layer because of unicity of background not overlayed layer
		this.id = 0;
	}

	BaseLayer.prototype._attach.call( this, g );
		
	if ( this._overlay )
	{
		// Create the renderer if needed
		if ( !g.rasterOverlayRenderer )
		{
			var renderer = new RasterOverlayRenderer(g);
			g.vectorRendererManager.renderers.push( renderer );
			g.rasterOverlayRenderer = renderer;
		}
		g.rasterOverlayRenderer.addOverlay(this);
	}
}

/**************************************************************************************************************/

/** 
  Detach the raster layer from the globe
 */
RasterLayer.prototype._detach = function()
{
	// Remove raster from overlay renderer if needed
	if ( this._overlay && this.globe.rasterOverlayRenderer )
	{
		this.globe.rasterOverlayRenderer.removeOverlay(this);
	}
	
	BaseLayer.prototype._detach.call(this);
}

/**************************************************************************************************************/

return RasterLayer;

});
