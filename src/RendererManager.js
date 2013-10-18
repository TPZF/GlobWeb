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

define(['./RendererTileData','./ConvexPolygonRenderer', './PointSpriteRenderer'],
	function(RendererTileData,ConvexPolygonRenderer,PointSpriteRenderer) {

/**************************************************************************************************************/

/** @constructor
	RenderererManager constructor
 */
var RendererManager = function(globe)
{
	this.tileManager = globe.tileManager;
	
	this.buckets = [];
	this.bucketId = 0;
	
	this.renderers = [ new ConvexPolygonRenderer(globe), new PointSpriteRenderer(globe) ];
	
	this.renderables = [];
	
	this.maxTilePerGeometry = 2;
	
	this.levelZeroTiledGeometries = [];
}

/**************************************************************************************************************/

/**
	Get a renderer
 */
RendererManager.prototype.getRenderer = function(geometry,style)
{
	for ( var i = 0; i < this.renderers.length; i++ )
	{
		if ( this.renderers[i].canApply(geometry.type,style) )
		{
			return this.renderers[i];
		}
	}
	
	return null;
}

/**************************************************************************************************************/

/**
	Find a compatible bucket
 */
RendererManager.prototype.findBucket = function(renderer,layer,style)
{
	// Find an existing bucket for the given style
	for ( var i = 0; i < this.buckets.length; i++ )
	{
		var bucket = this.buckets[i];
		if ( bucket.layer == layer 
			&& bucket.renderer == renderer 
			&& bucket.isCompatible(style) )
		{
			return bucket;
		}
	}

	return null;
}

/**************************************************************************************************************/

/**
 *	Generate the tile data
 */
RendererManager.prototype.generate = function(tile)
{
	if ( !tile.parent )
	{
		for ( var i=0; i < this.levelZeroTiledGeometries.length; i++ )
		{
			var geometry = this.levelZeroTiledGeometries[i];
			var range = geometry._tileRange;
			
			if ( range.indexOf( tile.pixelIndex ) >= 0 )
			{
				this._addGeometryToTile(geometry._bucket, geometry, tile);
			}
		}
	}
}

/**************************************************************************************************************/

/**
 	Add a geometry to the renderer
 */
RendererManager.prototype.addGeometry = function(layer, geometry, style)
{
	var bucket = this.getOrCreateBucket(layer, geometry, style);
	
	var range = this.tileManager.imageryProvider.tiling.getTileRange(geometry, 0);
		
	if ( range && range.length < this.maxTilePerGeometry )
	{
		// Add geometry to each tile in range
		for ( var i=0; i < range.length; i++ )
		{
			var index = range[i];
			this._addGeometryToTile(bucket, geometry, this.tileManager.level0Tiles[index]);
		}
		
		geometry._bucket = bucket;
		geometry._tileRange = range;
		this.levelZeroTiledGeometries.push(geometry);
	}
	else
	{
		// Attach to mainRenderable
		if (!bucket.mainRenderable)
		{
			bucket.mainRenderable = bucket.createRenderable();
		}
		bucket.mainRenderable.add(geometry);
	}
}

/**************************************************************************************************************/

/**
 	Remove a geometry from the renderer
 */
RendererManager.prototype.removeGeometry = function(geometry)
{
	var range = geometry._tileRange;

	if ( range )
	{
		// Remove from tile
		for ( var i = 0; i < range.length; i++ )
		{
			var tileIndex = range[i];
			this.removeGeometryFromTile(geometry, this.tileManager.level0Tiles[tileIndex]);
		}
		// Remove from geometry arrays
		this.levelZeroTiledGeometries.splice( this.levelZeroTiledGeometries.indexOf(geometry), 1 );
	}
	else
	{
		for ( var n = 0; n < this.buckets.length; n++ )
		{
			var bucket = this.buckets[n];
			if ( bucket.mainRenderable )
			{
				bucket.mainRenderable.remove(geometry);
				if ( bucket.mainRenderable.vertices.length == 0 )
				{
					bucket.mainRenderable.dispose(this.renderContext);
					bucket.mainRenderable = null;
				}
			}
		}
	}
}

/**************************************************************************************************************/

/**
 	Get or create a bucket for the given configuration
 */
RendererManager.prototype.getOrCreateBucket = function(layer, geometry, style )
{
	// First get a renderer
	var renderer = this.getRenderer(geometry,style);
	if (!renderer)
		return null;
		
	// Then find an existing bucket
	var bucket = this.findBucket(renderer,layer,style);
	if (!bucket)
	{
		bucket = renderer.createBucket(layer,style);
		bucket.id = this.bucketId++;
		this.buckets.push( bucket );
	}
	return bucket;
}

/**************************************************************************************************************/

/**
	Add a geometry to a tile
 */
RendererManager.prototype.addGeometryToTile = function(layer, geometry, style, tile)
{
	var bucket = this.getOrCreateBucket(layer, geometry, style);
	this._addGeometryToTile( bucket, geometry, tile );
}
	
/**************************************************************************************************************/

/**
	Internal method to add a geometry to a tile
 */
RendererManager.prototype._addGeometryToTile = function(bucket, geometry, tile)
{	
	var tileData = tile.extension.renderer;
	if (!tileData)
	{
		tileData = tile.extension.renderer = new RendererTileData(this);
	}
	
	var renderable = tileData.getRenderable(bucket);
	if (!renderable) 
	{
		renderable = bucket.createRenderable();
		tileData.renderables.push(renderable);
	}
	renderable.add(geometry);
}

/**************************************************************************************************************/

/**
	Remove a geometry from a tile
 */
RendererManager.prototype.removeGeometryFromTile = function(geometry,tile)
{
	var tileData = tile.extension.renderer;
	if (tileData)
	{
		for ( var i=0; i < tileData.renderables.length; i++ )
		{
			tileData.renderables[i].remove(geometry);
		}
	}
}

/**************************************************************************************************************/

/**
	Function to sort with zIndex, then bucket
 */
var renderableSort = function(r1,r2)
{
	var zdiff = r1.bucket.style.zIndex - r2.bucket.style.zIndex;
	if ( zdiff == 0 )
		return r1.bucket.id - r2.bucket.id;
	else
		return zdiff;
};

/**************************************************************************************************************/

/**
	Render all
 */
RendererManager.prototype.render = function()
{
	// Add main renderables
	for ( var i = 0; i < this.buckets.length; i++ )
	{
		if ( this.buckets[i].mainRenderable )
		{
			this.renderables.push( this.buckets[i].mainRenderable );
		}
	}
	
	// Renderable sort
	this.renderables.sort( renderableSort );
	
	//var renderCall = 0;
	
	var i = 0;
	while ( i < this.renderables.length )
	{
		var j = i + 1;
		
		var currentRenderer = this.renderables[i].bucket.renderer;
		while ( j < this.renderables.length && this.renderables[j].bucket.renderer == currentRenderer )
		{
			j++;
		}
		currentRenderer.render( this.renderables, i, j );
		//renderCall++;
		
		i = j;
	}
	
	//console.log( "# of render calls "  + renderCall );
	
	this.renderables.length = 0;
}

/**************************************************************************************************************/

return RendererManager;

});