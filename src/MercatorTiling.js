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

 define (['./Tile', './GeoBound', './GeoTiling'], function(Tile,GeoBound,GeoTiling) {

/**************************************************************************************************************/

/** @constructor
	MercatorTiling constructor
 */
var MercatorTiling = function(startLevel)
{
	this.startLevel = startLevel;
	this.level0NumTilesX = Math.pow(2,this.startLevel);
}

/** inherits from geotiling */
MercatorTiling.prototype = new GeoTiling;


var lon2merc = function(lon) {
	return lon * 20037508.34 / 180;
};

var lat2merc = function(lat) {
	var y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
	return y * 20037508.34 / 180;
};

/**************************************************************************************************************/

/** 
	Generate the tiles for level zero
 */
MercatorTiling.prototype.generateLevelZeroTiles = function(config)
{
	config.skirt = true;
	config.cullSign = 1;
	config.srs = 'EPSG:3857';
	config.project = function(coord) {
		return [ lon2merc(coord[0]), lat2merc(coord[1]) ];
	};
	
	var level0Tiles = [];
	
	var level0NumTilesX = Math.pow(2,this.startLevel);
	var level0NumTilesY = Math.pow(2,this.startLevel);
	
	for (var j = 0; j < level0NumTilesY; j++)
	{
		for (var i = 0; i < level0NumTilesX; i++)
		{
			var tile = new MercatorTile( this.startLevel, i, j );
			tile.config = config;
			level0Tiles.push( tile );
		}
	}

	return level0Tiles;
}

/**************************************************************************************************************/

/** 
	Locate a level zero tile
 */
MercatorTiling.prototype._lon2LevelZeroIndex = function(lon)
{	
	var x = (lon + 180) / 360; 
	return Math.min(  this.level0NumTilesX-1, Math.floor( x * this.level0NumTilesX ) );
}

/**************************************************************************************************************/

/** 
	Locate a level zero tile
 */
MercatorTiling.prototype._lat2LevelZeroIndex = function(lat)
{	
	var sinLatitude = Math.sin(lat * Math.PI / 180);
	var y = 0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI);
	return Math.min(  this.level0NumTilesX-1, Math.floor( y * this.level0NumTilesX ) );
}


/**************************************************************************************************************/

var tile2long = function(x,z) {
	return ( x /Math.pow(2,z) * 360 - 180 );
}

var tile2lat = function(y,z) {
	var n = Math.PI - 2 * Math.PI * y / Math.pow(2,z);
	return ( 180 / Math.PI * Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
}		

/**************************************************************************************************************/

/** @constructor
	Tile constructor
 */
var MercatorTile = function( level, x, y )
{
    // Call ancestor constructor
    Tile.prototype.constructor.call(this);
	
	this.level = level;
	this.x = x;
	this.y = y;
	
	this.geoBound = new GeoBound( tile2long(x,level), tile2lat(y+1,level), tile2long(x+1,level), tile2lat(y,level) );	
	this.bound = new GeoBound( lon2merc(this.geoBound.west), lat2merc(this.geoBound.south), lon2merc(this.geoBound.east), lat2merc(this.geoBound.north) );
}

/**************************************************************************************************************/

/** Inhertis from tile */
MercatorTile.prototype = new Tile;

/**************************************************************************************************************/

/** @export
  Get elevation at a geo position
*/
MercatorTile.prototype.getElevation = function(lon,lat)
{
	// TODO
	return 0.0;
}

/**************************************************************************************************************/

/**
	Create the children
 */
MercatorTile.prototype.createChildren = function()
{
	// Create the children
	var tile00 = new MercatorTile( this.level+1, 2*this.x, 2*this.y );
	var tile10 = new MercatorTile( this.level+1, 2*this.x+1, 2*this.y );
	var tile01 = new MercatorTile( this.level+1, 2*this.x, 2*this.y+1 );
	var tile11 = new MercatorTile( this.level+1, 2*this.x+1, 2*this.y+1 );
	
	tile00.initFromParent( this, 0, 0 );
	tile10.initFromParent( this, 1, 0 );
	tile01.initFromParent( this, 0, 1 );
	tile11.initFromParent( this, 1, 1 );
	
	this.children = [ tile00, tile10, tile01, tile11 ];	
}

/**************************************************************************************************************/

/**
	Convert coordinates in longitude,latitude to coordinate in "tile space"
	Tile space means coordinates are between [0,tesselation-1] if inside the tile
	Used by renderers algorithm to clamp coordinates on the tile
 */
MercatorTile.prototype.lonlat2tile = function(coordinates)
{
	var tpl = Math.pow(2,this.level);
	var factor = this.config.tesselation-1;
	
	var tileCoords = [];
	for ( var i = 0; i < coordinates.length; i++ )
	{
		var x = ( coordinates[i][0] + 180.) / 360.; 
		var sinLat = Math.sin(coordinates[i][1] * Math.PI / 180.);
		var y = 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4. * Math.PI);
		
		tileCoords.push( [ factor * (x * tpl - this.x), factor * (y * tpl - this.y) ] );	
	}
	
	return tileCoords;
}

/**************************************************************************************************************/

/**
	Generate vertices for tile
 */
MercatorTile.prototype.generateVertices = function(elevations)
{	 
	// Compute tile matrix
	this.matrix = this.config.coordinateSystem.getLHVTransform( this.geoBound.getCenter() );
	var invMatrix = mat4.create();
	mat4.inverse( this.matrix, invMatrix );
	this.inverseMatrix = invMatrix;

	// Build the vertices
	var size = this.config.tesselation;
	var vertices = new Float32Array( 3*size*(size+6) );
	var step = 1.0 / (size-1);
	var radius = this.config.coordinateSystem.radius;
	var scale = this.config.coordinateSystem.heightScale;
	var offset = 0;
	
	var twoPowLevel = Math.pow(2,this.level);
	
	var v = this.y;
	for ( var j=0; j < size; j++)
	{
		var n = Math.PI * (1.0  - 2.0 * v / twoPowLevel);
		var lat = Math.atan( 0.5 * (Math.exp(n) - Math.exp(-n)) );
	
		var cosLat = Math.cos( lat );
		var sinLat = Math.sin( lat );
		
		var u = this.x;
				
		for ( var i=0; i < size; i++)
		{
			var lon = Math.PI * ( 2.0 * u / twoPowLevel - 1.0 );
			var height = elevations ? scale * elevations[ offset ] : 0.0;
			
			var x = (radius + height) * Math.cos( lon ) * cosLat;
			var y = (radius + height) * Math.sin( lon ) * cosLat;
			var z = (radius + height) * sinLat;
			
			var vertexOffset = offset * 3;
			vertices[vertexOffset] = invMatrix[0]*x + invMatrix[4]*y + invMatrix[8]*z + invMatrix[12];
			vertices[vertexOffset+1] = invMatrix[1]*x + invMatrix[5]*y + invMatrix[9]*z + invMatrix[13];
			vertices[vertexOffset+2] = invMatrix[2]*x + invMatrix[6]*y + invMatrix[10]*z + invMatrix[14];
						
			offset++;
			u += step;
		}
		
		v += step;
	}
	
	return vertices;
}


/**************************************************************************************************************/

/**
	Override buildSkirtVertices for mercator.
	Use skirt to "fill" the pole
 */
 MercatorTile.prototype.buildSkirtVertices = function(center,srcOffset,srcStep,dstOffset)
{
	var size = this.config.tesselation;
	var vertexSize = this.config.vertexSize;
	var numTilesY = Math.pow(2,this.level);
	
	// Check if the tile is at the north (isTop) or south (isBottom) pole
	var isTop = this.y == 0 && dstOffset == vertexSize * (size * size);
	var isBottom = this.y == numTilesY-1 && dstOffset == vertexSize * ((size+1) * size);
		
	if ( isTop || isBottom )
	{
		var vertices = this.vertices;
		
		var pt = this.config.coordinateSystem.fromGeoTo3D( isTop ? [ 0.0, 90.0, 0.0 ] : [ 0.0, -90.0, 0.0 ] );
		mat4.multiplyVec3( this.inverseMatrix, pt );
		
		for ( var i = 0; i < size; i++)
		{			
			vertices[ dstOffset ] = pt[0];
			vertices[ dstOffset+1 ] = pt[1];
			vertices[ dstOffset+2 ] = pt[2];
			
			for (var n = 3; n < vertexSize; n++)
			{
				vertices[ dstOffset+n ] = vertices[srcOffset+n];
			}
			
			dstOffset += vertexSize;
		}	
		
		// Recompute the bbox to have correct culling
		//this.bbox.compute(this.vertices,dstOffset + vertexSize*size,vertexSize);
		//this.radius = this.bbox.getRadius();
	}
	else
	{
		Tile.prototype.buildSkirtVertices.call(this,center,srcOffset,srcStep,dstOffset);
	}
}

/**************************************************************************************************************/

return MercatorTiling;

});
