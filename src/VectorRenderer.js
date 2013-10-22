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

define(['./RendererTileData','./Tile'],
	function(RendererTileData, Tile) {

/**************************************************************************************************************/

/** @constructor
	VectorRenderer constructor
 */
var VectorRenderer = function(globe)
{
	this.tileManager = globe.tileManager;
	this.globe = globe;
	this.buckets = [];
	this.maxTilePerGeometry = 100;
	this.levelZeroTiledGeometries = [];
}

/**************************************************************************************************************/

/**
	Find a compatible bucket
 */
VectorRenderer.prototype.findBucket = function(layer,style)
{
	// Find an existing bucket for the given style
	for ( var i = 0; i < this.buckets.length; i++ )
	{
		var bucket = this.buckets[i];
		if ( bucket.layer == layer 
			&& bucket.isCompatible(style) )
		{
			return bucket;
		}
	}

	return null;
}


/**************************************************************************************************************/

/**
 	Generate the level zero for a tile
 */
VectorRenderer.prototype.generateLevelZero = function(tile)
{
	for ( var i=0; i < this.levelZeroTiledGeometries.length; i++ )
	{
		var geometry = this.levelZeroTiledGeometries[i];
		if ( geometry._tiles.indexOf( tile ) >= 0 )
		{
			this._addGeometryToTile(geometry._bucket, geometry, tile);
		}
	}
}

/**************************************************************************************************************/

/**
 	Recursively add a geometry to a tile
*/
VectorRenderer.prototype._recursiveAddGeometryToTile = function(bucket, geometry, tile)
{
	var renderable = this._addGeometryToTile(bucket, geometry, tile);
	
	if ( renderable && renderable.generateChild && tile.children)
	{
		for ( var i = 0; i < 4; i++ )
		{
			if ( tile.children[i].state == Tile.State.LOADED )
			{
				this._recursiveAddGeometryToTile( bucket, geometry, tile.children[i] );
			}
		}
	}
}

/**************************************************************************************************************/

/**
 	Add a geometry to a vector renderer
 */
VectorRenderer.prototype.addGeometry = function(layer, geometry, style)
{
	var bucket = this.getOrCreateBucket(layer, geometry, style);
	
	var tiles = this.maxTilePerGeometry > 0 ? this.tileManager.getOverlappedLevelZeroTiles(geometry) : null;
	if ( tiles && tiles.length < this.maxTilePerGeometry )
	{
		// Add geometry to each tile in range
		for ( var i=0; i < tiles.length; i++ )
		{
			var tile = tiles[i];
			if ( tile.state == Tile.State.LOADED )
			{
				this._recursiveAddGeometryToTile(bucket, geometry, tile);
			}
		}
		
		geometry._bucket = bucket;
		geometry._tiles = tiles;
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
 	Remove a geometry from a vector renderer
 */
VectorRenderer.prototype.removeGeometry = function(geometry)
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
VectorRenderer.prototype.getOrCreateBucket = function(layer, geometry, style )
{		
	// Then find an existing bucket
	var bucket = this.findBucket(layer,style);
	if (!bucket)
	{
		bucket = this.createBucket(layer,style);
		bucket.renderer = this;
		bucket.id = this.globe.vectorRendererManager.bucketId++;
		this.buckets.push( bucket );
	}
	return bucket;
}

/**************************************************************************************************************/

/**
	Add a geometry to a tile
 */
VectorRenderer.prototype.addGeometryToTile = function(layer, geometry, style, tile)
{
	var bucket = this.getOrCreateBucket(layer, geometry, style);
	return this._addGeometryToTile( bucket, geometry, tile );
}
	
/**************************************************************************************************************/

/**
	Internal method to add a geometry to a tile
 */
VectorRenderer.prototype._addGeometryToTile = function(bucket, geometry, tile)
{	
	var tileData = tile.extension.renderer;
	if (!tileData)
	{
		tileData = tile.extension.renderer = new RendererTileData(this.globe.vectorRendererManager);
	}
	
	var renderable = tileData.getRenderable(bucket);
	if (!renderable) 
	{
		renderable = bucket.createRenderable();
		tileData.renderables.push(renderable);
	}
	if ( renderable.add(geometry, tile) )
	{
		return renderable;
	}
	
	return null;
}

/**************************************************************************************************************/

/**
	Remove a geometry from a tile
 */
VectorRenderer.prototype.removeGeometryFromTile = function(geometry,tile)
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

return VectorRenderer;

});