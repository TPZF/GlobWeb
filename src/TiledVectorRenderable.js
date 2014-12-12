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

 define( ['./Utils','./BatchRenderable'], 
	function(Utils,BatchRenderable) {

/**************************************************************************************************************/


/** @constructor
 *	TiledVectorRenderable constructor
 */
var TiledVectorRenderable = function( bucket )
{
	BatchRenderable.prototype.constructor.call( this, bucket );

	this.tile = null;
	// The tiled vector renderable always has a children
	this.hasChildren = true;
}

/**************************************************************************************************************/

Utils.inherits(BatchRenderable,TiledVectorRenderable);

/**************************************************************************************************************/

/**
 * Initialize a child renderable
 */
TiledVectorRenderable.prototype.initChild = function(i,j)
{				
	var child = new TiledVectorRenderable(this.bucket);
	child.tile = this.tile;
	child.vertexBufferShared = true;
	child.vertexBuffer = this.vertexBuffer;
	child.vertices = this.vertices;
	child.buildChildrenIndices(this,j*2 + i);
	return child;
}

/**************************************************************************************************************/

/**
 * Generate a child renderable
 */
TiledVectorRenderable.prototype.generateChild = function(tile)
{				
	for ( var j = 0; j < this.geometryInfos.length; j++ )
	{
		this.bucket.renderer._addGeometryToTile( this.bucket, this.geometryInfos[j].geometry, tile );
	}
}

/**************************************************************************************************************/

/**
 * Build children indices.
 * Children indices are used to render a tile children when it is not completely loaded.
 */
TiledVectorRenderable.prototype.buildChildrenIndices = function( parent, index )
{	
	for ( var n = 0;  n < parent.triIndices.length; n+=3 )
	{	
		var vertexOffset1 = 3 * parent.triIndices[n];
		var vertexOffset2 = 3 * parent.triIndices[n+1];
		var vertexOffset3 = 3 * parent.triIndices[n+2];
		
		var x1 = parent.vertices[vertexOffset1];
		var x2 = parent.vertices[vertexOffset2];
		var x3 = parent.vertices[vertexOffset3];
		
		var i = 0;
		if ( x1 > 0 ||  ( x1 == 0 && x2 > 0 ) || (x1 == 0 && x2 == 0 && x3 > 0) )
			i = 1;			
		
		var y1 = parent.vertices[vertexOffset1+1];
		var y2 = parent.vertices[vertexOffset2+1];
		var y3 = parent.vertices[vertexOffset3+1];
		
		var j = 1;
		if ( y1 > 0 ||  ( y1 == 0 && y2 > 0 ) || (y1 == 0 && y2 == 0 && y3 > 0) )
			j = 0;
		
		if ( index == 2*j + i )
		{
			this.triIndices.push( parent.triIndices[n], parent.triIndices[n+1], parent.triIndices[n+2] )
		}
	}
	for ( var n = 0;  n < parent.lineIndices.length/2; n++ )
	{	
		var vertexOffset1 = 3 * parent.lineIndices[2*n];
		var vertexOffset2 = 3 * parent.lineIndices[2*n+1];
		
		var x1 = parent.vertices[vertexOffset1];
		var x2 = parent.vertices[vertexOffset2];
		
		var i = 0;
		if ( x1 > 0 ||  ( x1 == 0 && x2 > 0 ) )
			i = 1;			
		
		var y1 = parent.vertices[vertexOffset1+1];
		var y2 = parent.vertices[vertexOffset2+1];
		
		var j = 1;
		if ( y1 > 0 ||  ( y1 == 0 && y2 > 0 ) )
			j = 0;
		
		if ( index == 2*j + i )
		{
			this.lineIndices.push( parent.lineIndices[2*n], parent.lineIndices[2*n+1] );
		}
	}
}


/**************************************************************************************************************/

/**
 *	Add a feature to the renderable
 *	@return	Boolean indicating if geometry intersects the given tile
 */
TiledVectorRenderable.prototype.build = function( geometry, tile )
{
	this.tile = tile;
	var tileInRange = this.bucket.layer.minLevel <= tile.level && this.bucket.layer.maxLevel > tile.level;
	if ( tileInRange )
	{
		var coords = geometry['coordinates'];
		switch (geometry['type'])
		{
			case "LineString":
				this.buildVerticesAndIndices( tile, coords );
				break;
			case "Polygon":
				for ( var i = 0; i < coords.length; i++ )
					this.buildVerticesAndIndices( tile, coords[i] );
				break;
			case "MultiLineString":
				for ( var i = 0; i < coords.length; i++ )
					this.buildVerticesAndIndices( tile, coords[i] );
				break;
			case "MultiPolygon":
				for ( var j = 0; j < coords.length; j++ )
					for ( var i = 0; i < coords[j].length; i++ )
						this.buildVerticesAndIndices( tile, coords[j][i] );
				break;
		}
	}
	return tile.geoBound.intersectsGeometry(geometry);
}

/**************************************************************************************************************/

return TiledVectorRenderable;

});
