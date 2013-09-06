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

define(['./Tile', './HEALPixBase', './GeoBound', './CoordinateSystem', './Numeric', './AstroCoordTransform'], 
	function(Tile, HEALPixBase, GeoBound, CoordinateSystem, Numeric, AstroCoordTransform) {

/**************************************************************************************************************/
 
/** @constructor
 *	HEALPixTiling constructor
 *	
 *	@param order Starting tiling order
 *	@param options Options
 *		<ul>
 *			<li>coordSystem: Coordinate system of the given tiling</li>
 *		</ul>
 *	
 */
var HEALPixTiling = function(order, options)
{
	this.order = order;
	this.nside = Math.pow(2,this.order);
	this.coordSystem = options.coordSystem || "EQ";
}

/**************************************************************************************************************/

/** 
	Generate the tiles for level zero
 */
HEALPixTiling.prototype.generateLevelZeroTiles = function( config, tilePool )
{	
	config.skirt = false;
	config.cullSign = -1;
	config.tesselation = 5;
	config.coordSystem = this.coordSystem;

	var level0Tiles = [];
	
	var qpf = Math.pow(this.nside,2); // quad per face
	var nFaces = 12;
	var nQuads = nFaces * qpf;
	
	for (var i = 0; i < nQuads; i++){
		var face = Math.floor(i/qpf);
		var tile = new HEALPixTile(this.order, i, face);
		tile.config = config;
		level0Tiles.push( tile );
		tile.generate(tilePool);
		tile.state = Tile.State.NONE;
	}

	return level0Tiles;
}

/**************************************************************************************************************/

/** 
	Locate a level zero tile
 */
HEALPixTiling.prototype.lonlat2LevelZeroIndex = function(lon,lat)
{	
	// var i = Math.floor( (lon + 180) * this.level0NumTilesX / 360 );
 	// var j = Math.floor( (lat + 90) * this.level0NumTilesY / 180 );
	// return j * this.level0NumTilesX + i;
	return 0;

}

/**************************************************************************************************************/

/**
 *	Get range set of tile indices that overlap with geometry
 */
HEALPixTiling.prototype.getTileRange = function(geometry, level)
{
	var rings = [];
	if ( geometry['type'] == 'MultiPolygon' )
	{
		for ( var i=0; i<geometry['coordinates'].length; i++ )
		{
			rings.push( geometry['coordinates'][i][0] );
		}
	}
	else
	{
		rings.push( geometry['coordinates'][0] );
	}

	var range = [];
	for ( var r=0; r<rings.length; r++ )
	{
		var coords = rings[r];
		var numPoints = coords.length;
		for ( var i = 0; i < numPoints; i++ ) 
		{

			var lon = coords[i][0];
			var lat = coords[i][1];
			if ( this.coordSystem != CoordinateSystem.type )
			{
				var geo = CoordinateSystem.convertFromDefault( [lon, lat], this.coordSystem );
				lon = geo[0];
				lat = geo[1];
			}

			var tileIndex = HEALPixBase.lonLat2pix( this.order + level, lon, lat );
			if ( range.indexOf(tileIndex) == -1 )
			{
				range.push(tileIndex);
			}
		}
	}
	return range;
}

/**************************************************************************************************************/

/**
 	Return tile of given longitude/latitude from tiles array if exists, null otherwise
 */
HEALPixTiling.prototype.findInsideTile = function(lon, lat, tiles)
{
	if ( this.coordSystem != CoordinateSystem.type )
	{
		var geo = CoordinateSystem.convertFromDefault( [lon, lat], this.coordSystem );
		lon = geo[0];
		lat = geo[1];
	}

	for ( var i=0; i<tiles.length; i++ )
	{
		var tile = tiles[i];
		var index = HEALPixBase.lonLat2pix( tile.order, lon, lat );
		if ( index == tile.pixelIndex )
			return tile;
	}
	return null;
}

/**************************************************************************************************************/

/** @constructor
	Tile constructor
	
		Quadrilateral which composes one tile of HEALPix sphere
		
		nside : 2^order
		order : log2(nside);
		pix : pixel index number
		face : face number = [0..11]
 */
var HEALPixTile = function( order, pix, face )
{
    // Call ancestor constructor
    Tile.prototype.constructor.call(this);
	
	this.order = order;
	this.nside = Math.pow(2, this.order);
	this.pixelIndex = pix;
	this.face = face;

	// Compute texture transform
	var width = 1728/64;
	var height = 1856/64;
	this.texTransform = [64/1728, 64/1856, ((this.pixelIndex % width))/width, ((Math.floor(this.pixelIndex/width))/height)];

	this.geoBound = null;
}

/**************************************************************************************************************/

/** inherits from Tile */
HEALPixTile.prototype = new Tile;

/**************************************************************************************************************/

/**
	Create the children
 */
HEALPixTile.prototype.createChildren = function()
{
	// Create the children
	
	var child00 = new HEALPixTile(this.order + 1, this.pixelIndex*4, this.face);
	var child10 = new HEALPixTile(this.order + 1, this.pixelIndex*4+2, this.face);
	var child01 = new HEALPixTile(this.order + 1, this.pixelIndex*4+1, this.face);
	var child11 = new HEALPixTile(this.order + 1, this.pixelIndex*4+3, this.face);
	
	child00.initFromParent( this, 0, 0 );
	child10.initFromParent( this, 1, 0 );
	child01.initFromParent( this, 0, 1 );
	child11.initFromParent( this, 1, 1 );
	
	this.children = [ child00, child10, child01, child11 ];

}

/**************************************************************************************************************/

/**
	Compute the local matrix for the tile
 */
HEALPixTile.prototype.computeLocalMatrix = function(vertices){
	var matrix = mat4.create();
	
	var east = vec3.create();
	var north = vec3.create();
	var up = vec3.create();
	
	var mx = 0;
	var my = 0;
	var mz = 0;
	for(var i=0; i<vertices.length; i++){
		mx+=vertices[i][0];
		my+=vertices[i][1];
		mz+=vertices[i][2];
	}
	var barycenter = vec3.create([mx/vertices.length,my/vertices.length,mz/vertices.length]);
	
	vec3.set(barycenter,up);
	vec3.normalize(up);
	
	vec3.subtract(vertices[0],vertices[3],north);
	
	vec3.cross(up, north, east);
	vec3.normalize(east);
	vec3.cross(up, east, north);
	vec3.normalize(north);
		
	matrix[0] = east[0];
	matrix[1] = east[1];
	matrix[2] = east[2];
	matrix[3] = 0.0;
	
	matrix[4] = north[0];
	matrix[5] = north[1];
	matrix[6] = north[2];
	matrix[7] = 0.0;
	
	matrix[8] = up[0];
	matrix[9] = up[1];
	matrix[10] = up[2];
	matrix[11] = 0.0;
	
	matrix[12] = barycenter[0];
	matrix[13] = barycenter[1];
	matrix[14] = barycenter[2];
	matrix[15] = 1.0;
	
	return matrix;
}

/**************************************************************************************************************/

/**
	Generate vertices for tile
 */
HEALPixTile.prototype.generateVertices = function()
{
	// Build the vertices
	var size = this.config.tesselation;
	var worldSpaceVertices = new Array();
	var step = 1./(size - 1);
	
	// xyf calculation
	//var xyf = new healpixBase.Xyf(this.pixelIndex, this.order);
	var pix=this.pixelIndex&(this.nside*this.nside-1);
	var ix = HEALPixBase.compress_bits(pix);
	var iy = HEALPixBase.compress_bits(pix>>>1);
	
	// Compute array of worldspace coordinates
	for(var u = 0; u < size; u++){
		for(var v = 0; v < size; v++){


			if ( this.config.coordSystem != CoordinateSystem.type )
			{
				var vertice = HEALPixBase.fxyf((ix+u*step)/this.nside, (iy+v*step)/this.nside, this.face);
				var geo = CoordinateSystem.from3DToGeo( vertice );
				var eq = CoordinateSystem.convertToDefault(geo, this.config.coordSystem);
				worldSpaceVertices[u*size + v] = CoordinateSystem.fromGeoTo3D( eq );
			}
			else
			{
				worldSpaceVertices[u*size + v] = HEALPixBase.fxyf((ix+u*step)/this.nside, (iy+v*step)/this.nside, this.face);
			}
		}
	}
	
	// Compute geoBound using corners of tile
	this.geoBound = new GeoBound();

	var corners = [];
	corners.push( CoordinateSystem.from3DToGeo( worldSpaceVertices[0] ) );
	corners.push( CoordinateSystem.from3DToGeo( worldSpaceVertices[size-1] ) );
	corners.push( CoordinateSystem.from3DToGeo( worldSpaceVertices[size*(size-1)] ) );
	corners.push( CoordinateSystem.from3DToGeo( worldSpaceVertices[size*size-1] ) );

	this.geoBound.computeFromCoordinates( corners );

	// Compute tile matrix
	this.matrix = this.computeLocalMatrix(worldSpaceVertices);	
	var invMatrix = mat4.create();
	mat4.inverse( this.matrix, invMatrix );
	this.inverseMatrix = invMatrix;
	
	// Compute tile matrix
	/*var center = HEALPixBase.fxyf((ix+0.5)/this.nside, (iy+0.5)/this.nside, face);
	var geoCenter = CoordinateSystem.from3DToGeo(center);
	this.matrix = CoordinateSystem.getLHVTransform( geoCenter );
	var invMatrix = mat4.create();
	mat4.inverse( this.matrix, invMatrix );
	this.inverseMatrix = invMatrix;*/
	
	// Build the vertices
	var vertices = new Float32Array( 3*size*size );
	
	// Vertex coordinates in local space
	var vertexOffset = 0;
	for(var i=0;i<worldSpaceVertices.length;i++){
		vertices[vertexOffset] = invMatrix[0]*worldSpaceVertices[i][0] + invMatrix[4]*worldSpaceVertices[i][1] + invMatrix[8]*worldSpaceVertices[i][2] + invMatrix[12];
		vertices[vertexOffset+1] = invMatrix[1]*worldSpaceVertices[i][0] + invMatrix[5]*worldSpaceVertices[i][1] + invMatrix[9]*worldSpaceVertices[i][2] + invMatrix[13];
		vertices[vertexOffset+2] = invMatrix[2]*worldSpaceVertices[i][0] + invMatrix[6]*worldSpaceVertices[i][1] + invMatrix[10]*worldSpaceVertices[i][2] + invMatrix[14];
		vertexOffset += 3;
	}
	
	return vertices;
}

/**************************************************************************************************************/

return HEALPixTiling;

});