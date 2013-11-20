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

 define( function() {

/**************************************************************************************************************/


/** @constructor
 *	TiledVectorRenderable constructor
 */
var TiledVectorRenderable = function( bucket )
{
	this.gl = bucket.renderer.tileManager.renderContext.gl;
	this.bucket = bucket;
 	this.vertexBuffer = null;
 	this.indexBuffer = null;
	this.vertices = [];
	this.indices = [];
	this.geometryInfos = [];
	this.dirtyVB = true;
	this.dirtyIB = true;
	this.childrenIndexBuffers = null;
	this.childrenIndices = null;
	this.glMode = -1;
	this.tile = null;
	this.hasChildren = false;
}


/**************************************************************************************************************/

/**
 *	Child renderable constructor.
 * 	To be used when the tile is not loaded but still displayed
 */
 var ChildTiledVectorRenderable = function( parent, index )
{
	this.bucket = parent.bucket;
	this.tile = parent.tile;
	this.parent = parent;
	this.index = index;
}

/**************************************************************************************************************/

/**
 *	Dispose graphics data 
 */
ChildTiledVectorRenderable.prototype.dispose = function()
{
	// Nothing to do
}

/**************************************************************************************************************/

/**
 * Initialize a child renderable
 */
TiledVectorRenderable.prototype.initChild = function(i,j)
{				
	return new ChildTiledVectorRenderable(this, j*2+i);
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
	this.hasChildren = true;
}

/**************************************************************************************************************/

/**
 * Build children indices.
 * Children indices are used to render a tile children when it is not completely loaded.
 */
TiledVectorRenderable.prototype.buildChildrenIndices = function( )
{
	// Default method : nothing is done
	this.childrenIndices = [ [], [], [], [] ];
	this.childrenIndexBuffers = [ null, null, null, null ];
}


/**************************************************************************************************************/

/**
 *	Remove a geometry from the renderable
 */
TiledVectorRenderable.prototype.remove = function( geometry )
{
	var fiIndex = -1;

	// Find the feature
	for ( var i = 0; i < this.geometryInfos.length; i++ )
	{
		var fi = this.geometryInfos[i];
		if ( fi.geometry == geometry )
		{
			// Remove feature from vertex and index buffer
			this.vertices.splice( fi.startVertices, fi.vertexCount );
			this.indices.splice( fi.startIndices, fi.indexCount );
		
			// Update index buffer
			var vertexOffset = fi.vertexCount / 3;
			for ( var n = fi.startIndices; n < this.indices.length; n++ )
			{
				this.indices[n] -= vertexOffset;
			}
			
			fiIndex = i;
			
			break;
		}
	}
	
	if ( fiIndex >= 0 )
	{
		this.dirtyVB = true;
		this.dirtyIB = true;
		
		// Update feature infos
		for ( var i = fiIndex + 1; i < this.geometryInfos.length; i++ )
		{
			var fi = this.geometryInfos[i];
			fi.startVertices -= this.geometryInfos[fiIndex].vertexCount;
			fi.startIndices -= this.geometryInfos[fiIndex].indexCount;
		}
			
		// Remove the feature from the infos array
		this.geometryInfos.splice( fiIndex, 1 );
		
		// Erase children buffers : need to be rebuild
		this.disposeChildrenIndexBuffers();
		this.childrenIndices = null;
		
		return this.vertices.length;
	}
	else
	{
		return this.vertices.length;
	}	
}

/**************************************************************************************************************/

/** 
  Check if a geometry crosses the date line
*/
TiledVectorRenderable.prototype._fixDateLine = function( tile, coords ) 
{		
	var crossDateLine = false;
	var startLon = coords[0][0];
	for ( var i = 1; i < coords.length && !crossDateLine; i++) {
		var deltaLon = Math.abs( coords[i][0] - startLon );
		if ( deltaLon > 180 ) {
			// DateLine!
			crossDateLine =  true;
		}
	}
	
	if ( crossDateLine )
	{
		var fixCoords = [];
		
		if ( tile.geoBound.west < 0.0 )
		{
			// Ensure coordinates are always negative
			for ( var n = 0; n < coords.length; n++) {
				if ( coords[n][0] > 0 ) {
					fixCoords[n] = [ coords[n][0] - 360, coords[n][1] ];
				} else {
					fixCoords[n] = [ coords[n][0], coords[n][1] ];
				}
			}
		}
		else
		{
			// Ensure coordinates are always positive
			for ( var n = 0; n < coords.length; n++) {
				if ( coords[n][0] < 0 ) {
					fixCoords[n] = [ coords[n][0] + 360, coords[n][1] ];
				} else {
					fixCoords[n] = [ coords[n][0], coords[n][1] ];
				}
			}
		}
		
		return fixCoords;
	}
	else
	{
		return coords;
	}
};

/**************************************************************************************************************/

/**
 *	Add a feature to the renderable
 */
TiledVectorRenderable.prototype.add = function( geometry, tile )
{
	this.tile = tile;
	var geometryInfo = { geometry: geometry,
						startVertices: this.vertices.length,
						startIndices: this.indices.length,
						vertexCount: 0,
						indexCount: 0 };
						
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
	
	geometryInfo.vertexCount = this.vertices.length - geometryInfo.startVertices;
	geometryInfo.indexCount = this.indices.length - geometryInfo.startIndices;
		
	if ( geometryInfo.vertexCount > 0 )
	{
		this.geometryInfos.push( geometryInfo );
		this.dirtyVB = true;
		this.dirtyIB = true;
		
		// Erase children buffers : need to be rebuild
		this.disposeChildrenIndexBuffers();
		this.childrenIndices = null;
		
		return true;
	}
	else
	{
		// Feature not in the tile
		return false;
	}
}

/**************************************************************************************************************/

/**
 *	Dispose children index buffers
 */
TiledVectorRenderable.prototype.disposeChildrenIndexBuffers = function()
{
	var gl = this.gl;

	if ( this.childrenIndexBuffers )
	{
		if ( this.childrenIndexBuffers[0] )
			gl.deleteBuffer(this.childrenIndexBuffers[0]);
		if ( this.childrenIndexBuffers[1] )
			gl.deleteBuffer(this.childrenIndexBuffers[1]);
		if ( this.childrenIndexBuffers[2] )
			gl.deleteBuffer(this.childrenIndexBuffers[2]);
		if ( this.childrenIndexBuffers[3] )
			gl.deleteBuffer(this.childrenIndexBuffers[3]);
	}
	
	this.childrenIndexBuffers = null;
}

/**************************************************************************************************************/

/**
 *	Dispose graphics data 
 */
TiledVectorRenderable.prototype.dispose = function()
{
	var gl = this.gl;
	
	if ( this.indexBuffer )
		gl.deleteBuffer(this.indexBuffer);
	if ( this.vertexBuffer )
		gl.deleteBuffer(this.vertexBuffer);
	
	this.disposeChildrenIndexBuffers();
	
	this.indexBuffer = null;
	this.vertexBuffer = null;
}

/**************************************************************************************************************/

/**
 *	Render the line string for a child tile
 *  Used for loading tiles
 */
ChildTiledVectorRenderable.prototype.render = function(attributes)
{
	var p = this.parent;
	if ( p.childrenIndices == null )
		p.buildChildrenIndices();
	
	var childIndices = p.childrenIndices[this.index];
	if ( childIndices.length == 0 )
		return;
		
	var gl = p.gl;
			
	// Bind and update VertexBuffer
	if ( p.vertexBuffer == null )
		p.vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, p.vertexBuffer);
	if ( p.dirtyVB )
	{
		gl.bufferData(gl.ARRAY_BUFFER,	new Float32Array(p.vertices), gl.STATIC_DRAW);
		p.dirtyVB = false;
	}

	// Warning : use quoted strings to access properties of the attributes, to work correclty in advanced mode with closure compiler
	gl.vertexAttribPointer(attributes['vertex'], 3, gl.FLOAT, false, 0, 0);

	// Bind IndexBuffer
	var ib = p.childrenIndexBuffers[this.index];
	if ( !ib ) 
	{
		ib = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(childIndices), gl.STATIC_DRAW);
		p.childrenIndexBuffers[this.index] = ib;
	}
	else
	{
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
	}

		
	gl.drawElements( p.glMode, childIndices.length, gl.UNSIGNED_SHORT, 0);
}

/**************************************************************************************************************/

/**
 *	Render the line string
 */
TiledVectorRenderable.prototype.render = function(attributes)
{
	var gl = this.gl;
			
	// Bind and update VertexBuffer
	if ( this.vertexBuffer == null )
		this.vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	if ( this.dirtyVB )
	{
		gl.bufferData(gl.ARRAY_BUFFER,	new Float32Array(this.vertices), gl.STATIC_DRAW);
		this.dirtyVB = false;
	}

	// Warning : use quoted strings to access properties of the attributes, to work correclty in advanced mode with closure compiler
	gl.vertexAttribPointer(attributes['vertex'], 3, gl.FLOAT, false, 0, 0);

	// Bind and update IndexBuffer
	if ( this.indexBuffer == null )
		this.indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	if ( this.dirtyIB )
	{
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
		this.dirtyIB = false;
	}
		
	gl.drawElements( this.glMode, this.indices.length, gl.UNSIGNED_SHORT, 0);
}

/**************************************************************************************************************/

return TiledVectorRenderable;

});
