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

define(['./Utils','./VectorRendererManager','./TiledVectorRenderable','./TiledVectorRenderer','./Numeric','./CoordinateSystem','./Triangulator'],
	function(Utils,VectorRendererManager,TiledVectorRenderable,TiledVectorRenderer,Numeric,CoordinateSystem,Triangulator) {

/**************************************************************************************************************/


/** @constructor
 *	PolygonRenderable constructor
 */
var PolygonRenderable = function( bucket, gl )
{
	TiledVectorRenderable.prototype.constructor.call(this,bucket,gl);
	this.glMode = gl.TRIANGLES;
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
}

var PolygonCutter = function(points)
{
	this.points = points;
	this.insidePolygons = [];
	this.outsidePolygons = [];
}

PolygonCutter.prototype.reset = function()
{
	this.insidePolygons = [];
	this.outsidePolygons = [];
}
	
PolygonCutter.prototype._lineIntersection = function( p1, p2, p3, p4 )
{
	var x1 = p1[0];
	var x2 = p2[0];
	var x3 = p3[0];
	var x4 = p4[0];
	
	var y1 = p1[1];
	var y2 = p2[1];
	var y3 = p3[1];
	var y4 = p4[1];
	
	var det = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
	if ( det == 0 )
	{
		var dist = this._pointLineDistance(p1,p2,p3);
		if ( dist == 0 )
		{
			return [ 0, 0 ];
		}
		else
		{
			return [ -1, -1 ];
		}
	}
	
	var ua = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
	var ub = (x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3);

	ua /= det;
	ub /= det;
	
	return [ ua, ub ];
}

PolygonCutter.prototype._pointLineDistance = function( p, a , b )
{
	var ba0 = b[0] - a[0];
	var ba1 = b[1] - a[1];
	var abLength = Math.sqrt( ba0 * ba0 + ba1 * ba1 );
	return ((p[0] - a[0]) * ba1 - (p[1] - a[1]) * ba0) / abLength;
}

PolygonCutter.prototype.cutMulti = function( polygons, a, b )
{
	this.reset();
	for ( var i = 0; i < polygons.length; i++ )
	{
		this._cut( polygons[i], a, b );
	}
}

PolygonCutter.prototype.cut = function( polygon, a, b )
{
	this.reset();
	this._cut( polygon, a, b );
}

PolygonCutter.prototype._cut = function( polygon, a, b )
{
	var EPS = 1e-6;
	if ( polygon.length < 3 )
	{
		return;
	}
		
	// Find all intersection between the line (a,b) and edges of polygon	
	var polygonWithIntersections = [];
	var intersections = [];
	
	for ( var i = 0; i < polygon.length - 1; i++ )
	{
		var p1 = this.points[ polygon[i] ];
		var p2 = this.points[ polygon[i+1] ];
		
		polygonWithIntersections.push( polygon[i] );
		
		var t = this._lineIntersection( a, b, p1, p2 );
		if ( t[1] > EPS && t[1] < 1.0 - EPS )
		{
			var newPoint = [ (1.0 - t[0]) * a[0] + t[0] * b[0], (1.0 - t[0]) * a[1] + t[0] * b[1] ];
			this.points.push( newPoint );
			var index = this.points.length-1;
			polygonWithIntersections.push( index );
			
			intersections.push( { index: polygonWithIntersections.length-1, t: t[0], crossIndex: -1, polygon: null } );
		} 
		else if ( Math.abs(t[1]) < EPS )
		{
			intersections.push( { index: polygonWithIntersections.length-1, t: t[0], crossIndex: -1, polygon: null } );
		}
	}
		
	// Sort intersections
	if ( intersections.length > 0 )
	{
		intersections.sort( function(a,b) { return a.t < b.t; } );
	}
	intersections.length = intersections.length & (~1);
		
	// Build cross
	var intersectionMap = new Array( polygonWithIntersections.length );
	for ( var i = 0; i < intersections.length; i+= 2 )
	{
		intersections[i].crossIndex = intersections[i+1].index;
		intersections[i+1].crossIndex = intersections[i].index;
		
		intersectionMap[ intersections[i].index ] = intersections[i];
		intersectionMap[ intersections[i+1].index ] = intersections[i+1];
	}
	
	var startIndex = 0;
	var firstPoint = this.points[ polygonWithIntersections[0] ];
	var dist = this._pointLineDistance(firstPoint,a,b);
	while (dist == 0)
	{
		startIndex++;
		firstPoint = this.points[ polygonWithIntersections[startIndex] ];
		dist = this._pointLineDistance(firstPoint,a,b);
	}
	
	// Builds outputPolygons
	var currentPolygons;
	var otherPolygons;
	if ( dist > 0 )
	{
		currentPolygons = this.insidePolygons;
		otherPolygons = this.outsidePolygons; 
	}
	else
	{
		currentPolygons = this.outsidePolygons;
		otherPolygons = this.insidePolygons; 
	}
	
	// Create a polygon and add it to the list
	var currentPolygon = [];
	currentPolygons.push( currentPolygon );
	
	for ( var i = 0; i < polygonWithIntersections.length; i++ )
	{
		var n = (i+startIndex) % polygonWithIntersections.length;
		var index = polygonWithIntersections[ n  ];
		currentPolygon.push( index );
		
		var intersection = intersectionMap[ n ];
		if ( intersection )
		{
			// Swap polygons 
			var temp = currentPolygons;
			currentPolygons = otherPolygons;
			otherPolygons = temp;
			
			var crossIntersection = intersectionMap[intersection.crossIndex];
			if ( !crossIntersection.polygon )
			{
				crossIntersection.polygon = currentPolygon;
			}
				
			if ( !intersection.polygon )
			{				
				// Create a new polygon
				var newPolygon = [];
				currentPolygons.push( newPolygon );
				
				intersection.polygon = newPolygon;
				
				currentPolygon = newPolygon;
			}
			else
			{
				currentPolygon = intersection.polygon;
			}
			
			currentPolygon.push( index );
		}
	}
	
	// Close all polygons
	for ( var i = 0; i < this.outsidePolygons.length; i++ )
	{
		var poly = this.outsidePolygons[i];
		poly.push( poly[0] );
	}
	for ( var i = 0; i < this.insidePolygons.length; i++ )
	{
		var poly = this.insidePolygons[i];
		poly.push( poly[0] );
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
	//var coords = clipPolygon( coordinates, [ tile.geoBound.west, tile.geoBound.south, tile.geoBound.east, tile.geoBound.north ] );
	var points = coordinates.slice(0);
	var polygons = clipPolygonToTriGridStartUp( points, [ tile.geoBound.west, tile.geoBound.south, tile.geoBound.east, tile.geoBound.north ], 3 );
	if ( polygons.length > 0 )
	{
		for ( var n = 0; n < polygons.length; n++ )
		{
			var invMatrix = tile.inverseMatrix;
			var radius = CoordinateSystem.radius;
			var height = 100 * CoordinateSystem.heightScale;
			
			var vertexOffset = this.vertices.length;
			var indexOffset = this.vertices.length / 3;
			
			var coords = [];
			var polygon = polygons[n];
			for ( var i = 0; i < polygon.length; i++ )
			{
				coords[i] = points[ polygon[i] ];
				
				var cosLat = Math.cos( coords[i][1] * Math.PI / 180.0 );
				var x = (radius + height) * Math.cos( coords[i][0] * Math.PI / 180.0 ) * cosLat;
				var y = (radius + height) * Math.sin( coords[i][0] * Math.PI / 180.0 ) * cosLat;
				var z = (radius + height) * Math.sin( coords[i][1] * Math.PI / 180.0 );
				
				this.vertices[vertexOffset] = invMatrix[0]*x + invMatrix[4]*y + invMatrix[8]*z + invMatrix[12];
				this.vertices[vertexOffset+1] = invMatrix[1]*x + invMatrix[5]*y + invMatrix[9]*z + invMatrix[13];
				this.vertices[vertexOffset+2] = invMatrix[2]*x + invMatrix[6]*y + invMatrix[10]*z + invMatrix[14];
				
				vertexOffset += 3;
			}
			
			var tris = Triangulator.process( coords );
			if ( tris )
			{		
				for ( var i = 0; i < tris.length; i++ )
				{
					this.indices.push( tris[i] + indexOffset );
				}
			}
			else
			{
				console.log("Triangulation problem");
			}
		}
	}
}

/**************************************************************************************************************/

// Register the renderer
VectorRendererManager.registerRenderer({
	creator: function(globe) { 
			var polygonRenderer = new TiledVectorRenderer(globe.tileManager);
			polygonRenderer.id = "polygon";
			polygonRenderer.styleEquals = function(s1,s2) { return s1.isEqualForPoly(s2); };
			polygonRenderer.renderableConstuctor = PolygonRenderable;
			return polygonRenderer;
	},
	canApply: function(type,style) {return type == "Polygon" && style.fill; }
});
				
});
