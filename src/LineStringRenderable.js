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

 define(['./Utils','./FeatureStyle','./VectorRendererManager','./TiledVectorRenderable','./TiledVectorRenderer','./Numeric'],
	function(Utils,FeatureStyle,VectorRendererManager,TiledVectorRenderable,TiledVectorRenderer,Numeric) {

/**************************************************************************************************************/


/** @constructor
 *  @extends TiledVectorRenderable
 *	LineStringRenderable manages lineString data to be rendered on a tile.
 */
var LineStringRenderable = function( bucket )
{
	TiledVectorRenderable.prototype.constructor.call(this,bucket);
}

/**************************************************************************************************************/

// Inheritance
Utils.inherits(TiledVectorRenderable,LineStringRenderable);

/**************************************************************************************************************/

/**************************************************************************************************************/

/** 
  Check if a geometry crosses the date line
*/
LineStringRenderable.prototype._fixDateLine = function( tile, coords ) 
{		
	var newCoords = [];
	var lines = [ newCoords ]
	for ( var n = 0; n < coords.length-1; n++) {

		newCoords.push( coords[n] );
		
		var x1 = coords[n][0];
		var y1 = coords[n][1];
		var x2 = coords[n+1][0];
		var y2 = coords[n+1][1];
		
		if ( Math.abs(x2 - x1) > 180 ) 
		{
			if ( x1 < 0 ) {
				x1 += 360;
			}
			if ( x2 < 0 ) {
				x2 += 360;
			}
			
			var t = (180 - x1) / (x2 - x1);
			if ( t > 0 && t < 1) {
				var y = y1 + t * (y2 - y1);
				var x = coords[n][0] > 0 ? 180 : -180;
				newCoords.push( [x,y] );
				newCoords = [ [-x,y] ];
				lines.push( newCoords );
			}
		}
	}
	
	newCoords.push( coords[0] );
	
	return lines;
};

/**
 * Build vertices and indices from the coordinates.
 * Clamp a line string on a tile
 */
LineStringRenderable.prototype.buildVerticesAndIndices = function( tile, coords )
{
	if ( coords.length == 0 )
		return;
		
	// Fix date line for coordinates first
	var coordinates = this._fixDateLine( tile, coords );
	
	for ( var i = 0; i < coordinates.length; i++ ) {
		this._buildVerticesAndIndices( tile, coordinates[i] );
	}
}

/**
 * Build vertices and indices from the coordinates.
 * Clamp a line string on a tile
 */
LineStringRenderable.prototype._buildVerticesAndIndices = function( tile, coords )
{		
	var size = tile.config.tesselation;
	var vs = tile.config.vertexSize;
	
	// Convert lon/lat coordinates to tile coordinates (between [0,size-1] inside the tile)
	var tileCoords = tile.lonlat2tile(coords);

	for ( var i = 0; i < coords.length - 1; i++ )
	{
		var u1 = tileCoords[i][0];
		var v1 = tileCoords[i][1];
		
		var u2 = tileCoords[i+1][0];
		var v2 = tileCoords[i+1][1];
		
		var intersections = [];
	
		// Intersect the segment with the tile grid
		
		// First intersect with columns
		// uStart, uEnd represent a range of the tile columns that the segement can intersect
		var uStart = Math.max( -1, Math.min( u1, u2 ) );
		var uEnd = Math.min( size-1, Math.max( u1, u2 ) );
		for ( var n = Math.floor(uStart)+1; n < Math.floor(uEnd)+1; n++)
		{
			var u = n;
			var res = Numeric.lineIntersection( u1, v1, u2, v2, u, 0.0, u, size-1 );
			if ( res[0] > 0.0 && res[0] < 1.0 && res[1] >= 0.0 && res[1] <= 1.0 )
			{
				var v = res[1] * (size-1);
				var vFloor = Math.floor( v );
				var vFrac = v - vFloor;
				var vertexOffset = vs*( vFloor*size + n );
				var x = (1.0 - vFrac) * tile.vertices[ vertexOffset ] + vFrac * tile.vertices[ vertexOffset + vs*size ];
				var y = (1.0 - vFrac) * tile.vertices[ vertexOffset + 1 ] + vFrac * tile.vertices[ vertexOffset + vs*size + 1 ];
				var z = (1.0 - vFrac) * tile.vertices[ vertexOffset + 2 ] + vFrac * tile.vertices[ vertexOffset + vs*size + 2 ];
				intersections.push( [ res[0], x, y, z ] );
			}
		}
	
		// Then intersect with rows
		// vStart, vEnd represent a range of the tile rows that the segement can intersect
		var vStart = Math.max( -1, Math.min( v1, v2 ) );
		var vEnd = Math.min( size-1, Math.max( v1, v2 ) );
		for ( var n = Math.floor(vStart)+1; n < Math.floor(vEnd)+1; n++)
		{
			var v = n;
			var res = Numeric.lineIntersection( u1, v1, u2, v2, 0.0, v, size-1, v );
			if ( res[0] > 0.0 && res[0] < 1.0 && res[1] >= 0.0 && res[1] <= 1.0 )
			{
				var u = res[1] * (size-1);
				var uFloor = Math.floor( u );
				var uFrac = u - uFloor;
				var vertexOffset = vs*( n*size + uFloor );
				var x = (1.0 - uFrac) * tile.vertices[ vertexOffset ] + uFrac * tile.vertices[ vertexOffset + vs ];
				var y = (1.0 - uFrac) * tile.vertices[ vertexOffset + 1 ] + uFrac * tile.vertices[ vertexOffset + vs+1 ];
				var z = (1.0 - uFrac) * tile.vertices[ vertexOffset + 2 ] + uFrac * tile.vertices[ vertexOffset + vs+2 ];
				intersections.push( [ res[0], x, y, z ] );
			}
		}
/*			for ( var n = 0; n < size; n++)
		{
			var u = n;
			var v = n;
			var res = lineIntersection( u1, v1, u2, v2, u, 0.0, 0.0, v );
			if ( res[0] > 0.0 && res[0] < 1.0 && res[1] > 0.0 && res[1] < 1.0 )
			{
				intersections.push( res[0] );
			}
			if ( n != size-1 )
			{
				var res = lineIntersection( u1, v1, u2, v2, u, size, size, v );
				if ( res[0] > 0.0 && res[0] < 1.0 && res[1] > 0.0 && res[1] < 1.0 )
				{
					intersections.push( res[0] );
				}
			}
		}*/
		
		// Sort intersections found on the segment
		intersections.sort( function(a,b) { return a[0] > b[0]; } );
		
		// Build the vertices from the intersections found
		var startIndex = this.vertices.length / 3;
		
		if ( u1 >= 0.0 && u1 <= size-1 &&  v1 >= 0.0 && v1 <= size-1 )
		{
			var vec = tile.computePosition(u1,v1);
			this.vertices.push( vec[0] );
			this.vertices.push( vec[1] );
			this.vertices.push( vec[2] );
		}
					
		for ( var n = 0; n < intersections.length; n++ )
		{
			this.vertices.push( intersections[n][1] );
			this.vertices.push( intersections[n][2] );
			this.vertices.push( intersections[n][3] );
		}
		
		if ( u2 >= 0.0 && u2 <= size-1 &&  v2 >= 0.0 && v2 <= size-1 )
		{
			var vec = tile.computePosition(u2,v2);
			this.vertices.push( vec[0] );
			this.vertices.push( vec[1] );
			this.vertices.push( vec[2] );
		}
		
		var endIndex = this.vertices.length / 3;
		
		for ( var n = startIndex; n < endIndex - 1; n++ )
		{
			this.lineIndices.push( n );
			this.lineIndices.push( n+1 );
		}
	}
}

/**************************************************************************************************************/

/** @constructor
 *  @extends TiledVectorRenderer
 */
var LineStringRenderer = function( globe )
{
	TiledVectorRenderer.prototype.constructor.call(this,globe);
}

// Inheritance
Utils.inherits(TiledVectorRenderer,LineStringRenderer);

/**************************************************************************************************************/

/**
	Check if renderer is applicable
 */
LineStringRenderer.prototype.canApply = function(type,style)
{
	if ( this.globe.isSky )
		return false;

	return (type == "LineString" || type == "MultiLineString"
							|| (!style.fill && (type == "Polygon" || type == "MultiPolygon")))
						&& !style.gradientLength;
}
/**************************************************************************************************************/

/**
	Bucket constructor for LineStringRenderer
 */
var LineStringBucket = function(layer,style)
{
	this.layer = layer;
	this.style = new FeatureStyle(style);
	this.renderer = null;
}

/**************************************************************************************************************/

/**
	Create a renderable for this bucket
 */
LineStringBucket.prototype.createRenderable = function()
{
	return new LineStringRenderable(this);
}

/**************************************************************************************************************/

/**
	Check if a bucket is compatible
 */
LineStringBucket.prototype.isCompatible = function(style)
{
	return this.style.strokeColor[0] == style.strokeColor[0]
		&& this.style.strokeColor[1] == style.strokeColor[1]
		&& this.style.strokeColor[2] == style.strokeColor[2]
		&& this.style.strokeColor[3] == style.strokeColor[3]
		&& this.style.strokeWidth == style.strokeWidth;
}

/**************************************************************************************************************/

/**
	Get or create a bucket to store a feature with the given style
 */
LineStringRenderer.prototype.createBucket = function( layer, style )
{
	// Create a bucket
	return new LineStringBucket(layer,style);
}

/**************************************************************************************************************/

// Register the renderer
VectorRendererManager.factory.push( function(globe) { return new LineStringRenderer(globe); } );
				
return LineStringRenderable;

});

										