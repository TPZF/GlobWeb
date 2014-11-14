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

define(['./Utils','./FeatureStyle','./VectorRendererManager','./TiledVectorRenderable','./TiledVectorRenderer','./Numeric','./Triangulator','./PolygonCutter'],
	function(Utils,FeatureStyle,VectorRendererManager,TiledVectorRenderable,TiledVectorRenderer,Numeric,Triangulator,PolygonCutter) {

/**************************************************************************************************************/


/** @constructor
 *	PolygonRenderable constructor
 */
var PolygonRenderable = function( bucket )
{
	TiledVectorRenderable.prototype.constructor.call(this,bucket);
	this.glMode = bucket.renderer.tileManager.renderContext.gl.TRIANGLES;
}

/**************************************************************************************************************/

// Inheritance
Utils.inherits(TiledVectorRenderable,PolygonRenderable);

/**************************************************************************************************************/

/**
 * Build children indices.
 * Children indices are used to render a tile children when it is not completely loaded.
 */
PolygonRenderable.prototype.buildChildrenIndices = function( tile )
{
	this.childrenIndices = [ [], [], [], [] ];
	this.childrenIndexBuffers = [ null, null, null, null ];
	
	for ( var n = 0;  n < this.triIndices.length; n+=3 )
	{	
		var vertexOffset1 = 3 * this.triIndices[n];
		var vertexOffset2 = 3 * this.triIndices[n+1];
		var vertexOffset3 = 3 * this.triIndices[n+2];
		
		var x1 = this.vertices[vertexOffset1];
		var x2 = this.vertices[vertexOffset2];
		var x3 = this.vertices[vertexOffset3];
		
		var i = 0;
		if ( x1 > 0 ||  ( x1 == 0 && x2 > 0 ) || (x1 == 0 && x2 == 0 && x3 > 0) )
			i = 1;			
		
		var y1 = this.vertices[vertexOffset1+1];
		var y2 = this.vertices[vertexOffset2+1];
		var y3 = this.vertices[vertexOffset3+1];
		
		var j = 1;
		if ( y1 > 0 ||  ( y1 == 0 && y2 > 0 ) || (y1 == 0 && y2 == 0 && y3 > 0) )
			j = 0;
		
		this.childrenIndices[ 2*j + i ].push( this.triIndices[n], this.triIndices[n+1], this.triIndices[n+2] )
	}
}



var clipPolygonToTriGrid_O = function( polygons, points, a, b, c, level, res )
{
	if  ( level == 0 )
	{
		for ( var i = 0; i < polygons.length; i++ )
			res.push( polygons[i] );
		return;
	}
	
	var ab = [ (a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5 ];
	var bc = [ (c[0] + b[0]) * 0.5, (c[1] + b[1]) * 0.5 ];
	var ca = [ (a[0] + c[0]) * 0.5, (a[1] + c[1]) * 0.5 ];
	
	var cutter = new PolygonCutter( points );
	cutter.cutMulti( polygons, bc, ab );
	
	if ( cutter.insidePolygons.length > 0 )
		clipPolygonToTriGrid_O( cutter.insidePolygons, points, bc, ab, b, level-1, res );
	
	if ( cutter.outsidePolygons.length > 0 )
	{
		cutter.cutMulti( cutter.outsidePolygons, ca, bc );
				
		if ( cutter.insidePolygons.length > 0 )
			clipPolygonToTriGrid_O( cutter.insidePolygons, points, ca, bc, c, level-1, res );
		
		if ( cutter.outsidePolygons.length > 0 )
		{
			cutter.cutMulti( cutter.outsidePolygons, ab, ca );

			if ( cutter.insidePolygons.length > 0 ) clipPolygonToTriGrid_O( cutter.insidePolygons, points, ab, ca, a, level-1, res );
			if ( cutter.outsidePolygons.length > 0 ) clipPolygonToTriGrid_O( cutter.outsidePolygons, points, ca, ab, bc, level-1, res );
		}
	}
}

var clipPolygonToTriGridStartUp = function( points, bounds, level )
{
	// Build an index polygon
	var poly = [];
	for ( var i = 0; i < points.length; i++ )
	{
		poly[i] = i;
	}

	var cutter = new PolygonCutter( points );
	cutter.cut( poly, [ bounds[0], bounds[1] ], [ bounds[0], bounds[3] ] );
	cutter.cutMulti( cutter.insidePolygons, [ bounds[0], bounds[3] ], [ bounds[2], bounds[3] ] );
	cutter.cutMulti( cutter.insidePolygons, [ bounds[2], bounds[3] ], [ bounds[2], bounds[1] ] );
	cutter.cutMulti( cutter.insidePolygons, [ bounds[2], bounds[1] ], [ bounds[0], bounds[1] ] );

//	return cutter.insidePolygons;
	
	cutter.cutMulti( cutter.insidePolygons, [ bounds[0], bounds[3] ], [ bounds[2], bounds[1] ] );
	var res = [];
	if ( cutter.insidePolygons.length > 0 ) clipPolygonToTriGrid_O( cutter.insidePolygons, points, [ bounds[0], bounds[1] ], [ bounds[0], bounds[3] ], [ bounds[2], bounds[1] ], level, res );
	if ( cutter.outsidePolygons.length > 0 ) clipPolygonToTriGrid_O( cutter.outsidePolygons, points, [ bounds[0], bounds[3] ], [ bounds[2], bounds[3] ], [ bounds[2], bounds[1] ], level, res );
	return res;
}

/**************************************************************************************************************/

/**
 * Clamp a polygon on a tile
 */
PolygonRenderable.prototype.buildVerticesAndIndices = function( tile, coordinates )
{
	var coordinateSystem = tile.config.coordinateSystem;
	
	var numLevel = Math.floor( Math.log( tile.config.tesselation-1 ) / Math.log(2) );
	//var coords = clipPolygon( coordinates, [ tile.geoBound.west, tile.geoBound.south, tile.geoBound.east, tile.geoBound.north ] );
	var points = coordinates.slice(0);
	var polygons = clipPolygonToTriGridStartUp( points, [ tile.geoBound.west, tile.geoBound.south, tile.geoBound.east, tile.geoBound.north ], numLevel );
	if ( polygons.length > 0 )
	{
		for ( var n = 0; n < polygons.length; n++ )
		{
			var invMatrix = tile.inverseMatrix;
			var radius = coordinateSystem.radius;
			var height = 10 * coordinateSystem.heightScale;
			
			var vertexOffset = this.vertices.length;
			var indexOffset = this.vertices.length / 3;
			
			var coords = [];
			var polygon = polygons[n];
			for ( var i = 0; i < polygon.length; i++ )
			{
				coords[i] = points[ polygon[i] ];
				
				// Cleanup coords
				if ( i > 0 )
				{
					// Skip coincident points
					if ( coords[i-1][0] == coords[i][0] && coords[i-1][1] == coords[i][1] )
						continue;
				}
				
				
				/*if ( coords[i][0] < tile.geoBound.west || coords[i][0] > tile.geoBound.east )
					console.log('error!');
				if ( coords[i][1] < tile.geoBound.south || coords[i][1] > tile.geoBound.north )
					console.log('error!');*/
				
				var cosLat = Math.cos( coords[i][1] * Math.PI / 180.0 );
				var x = (radius + height) * Math.cos( coords[i][0] * Math.PI / 180.0 ) * cosLat;
				var y = (radius + height) * Math.sin( coords[i][0] * Math.PI / 180.0 ) * cosLat;
				var z = (radius + height) * Math.sin( coords[i][1] * Math.PI / 180.0 );
				
				this.vertices[vertexOffset] = invMatrix[0]*x + invMatrix[4]*y + invMatrix[8]*z + invMatrix[12];
				this.vertices[vertexOffset+1] = invMatrix[1]*x + invMatrix[5]*y + invMatrix[9]*z + invMatrix[13];
				this.vertices[vertexOffset+2] = invMatrix[2]*x + invMatrix[6]*y + invMatrix[10]*z + invMatrix[14];
				
				vertexOffset += 3;
			}
			
			if ( coords.length == 4 ) {
				this.triIndices.push( indexOffset, indexOffset+2, indexOffset+1 );
				//this.lineIndices.push(  indexOffset, indexOffset+2, indexOffset+2, indexOffset+1,indexOffset+1, indexOffset );
			}
			else if ( coords.length == 5 ) {
				this.triIndices.push( indexOffset, indexOffset+3, indexOffset+1 );
				this.triIndices.push( indexOffset+3, indexOffset+2, indexOffset+1 );
				//this.lineIndices.push(  indexOffset, indexOffset+3, indexOffset+3, indexOffset+1,indexOffset+1, indexOffset );
				//this.lineIndices.push(  indexOffset+1, indexOffset+2, indexOffset+2, indexOffset+3,indexOffset+3, indexOffset+1 );
			} else {
				var tris = Triangulator.process( coords );
				if ( tris )
				{		
					for ( var i = 0; i < tris.length; i+= 3 )
					{
						this.triIndices.push( tris[i] + indexOffset, tris[i+1] + indexOffset, tris[i+2] + indexOffset  );
						//this.lineIndices.push( tris[i] + indexOffset, tris[i+1] + indexOffset );
						//this.lineIndices.push( tris[i+1] + indexOffset, tris[i+2] + indexOffset );
						//this.lineIndices.push( tris[i+2] + indexOffset, tris[i] + indexOffset );
					}
				}
				else
				{
					console.log("Triangulation problem");
				}
			}
		}
	}
}

/**************************************************************************************************************/

/** @constructor
 *  @extends TiledVectorRenderer
 */
var PolygonRenderer = function( globe )
{
	TiledVectorRenderer.prototype.constructor.call(this,globe);
}

// Inheritance
Utils.inherits(TiledVectorRenderer,PolygonRenderer);

/**************************************************************************************************************/

/**
	Check if renderer is applicable
 */
PolygonRenderer.prototype.canApply = function(type,style)
{
	return style.fill && (type == "Polygon" || type == "MultiPolygon");
}

/**************************************************************************************************************/

/**
	Bucket constructor for PolygonRenderer
 */
var PolygonBucket = function(layer,style)
{
	this.layer = layer;
	this.style = new FeatureStyle(style);
	this.renderer = null;
}

/**************************************************************************************************************/

/**
	Create a renderable for this bucket
 */
PolygonBucket.prototype.createRenderable = function()
{
	return new PolygonRenderable(this);
}

/**************************************************************************************************************/

/**
	Check if a bucket is compatible
 */
PolygonBucket.prototype.isCompatible = function(style)
{
	return this.style.fillColor[0] == style.fillColor[0]
		&& this.style.fillColor[1] == style.fillColor[1]
		&& this.style.fillColor[2] == style.fillColor[2]
		&& this.style.fillColor[3] == style.fillColor[3];
}

/**************************************************************************************************************/

/**
	Get or create a bucket to store a feature with the given style
 */
PolygonRenderer.prototype.createBucket = function( layer, style )
{
	// Create a bucket
	return new PolygonBucket(layer,style);
}

/**************************************************************************************************************/

// Register the renderer
VectorRendererManager.factory.push( function(globe) { return new PolygonRenderer(globe); } );
				
return PolygonRenderable;
				
});
