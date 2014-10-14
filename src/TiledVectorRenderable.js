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

	this.childrenIndexBuffers = null;
	this.childrenIndices = null;
	this.glMode = -1;
	this.tile = null;
	this.hasChildren = false;
}

/**************************************************************************************************************/

Utils.inherits(BatchRenderable,TiledVectorRenderable);

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
TiledVectorRenderable.prototype.build = function( geometry, tile )
{
	this.tile = tile;
						
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

/**************************************************************************************************************/

/**
 *	Dispose children index buffers
 */
TiledVectorRenderable.prototype.disposeChildrenIndexBuffers = function(renderContext)
{
	var gl = renderContext.gl;

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
	this.childrenIndices = null;
}

/**************************************************************************************************************/

/**
 *	Dispose graphics data 
 */
TiledVectorRenderable.prototype.dispose = function(renderContext)
{
	BatchRenderable.prototype.dispose.call( this, renderContext );
	
	this.disposeChildrenIndexBuffers(renderContext);
}

/**************************************************************************************************************/

/**
 *	Render the line string for a child tile
 *  Used for loading tiles
 */
ChildTiledVectorRenderable.prototype.render = function(renderContext, program)
{
	var p = this.parent;
	
	p.bindBuffers(renderContext);
	
	if ( p.childrenIndices == null )
		p.buildChildrenIndices();
	
	var childIndices = p.childrenIndices[this.index];
	if ( childIndices.length == 0 )
		return;
		
	var gl = renderContext.gl;
			
	// Bind and update VertexBuffer
	gl.bindBuffer(gl.ARRAY_BUFFER, p.vertexBuffer);

	// Warning : use quoted strings to access properties of the attributes, to work correclty in advanced mode with closure compiler
	gl.vertexAttribPointer(program.attributes['vertex'], 3, gl.FLOAT, false, 0, 0);

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
 *	Render the line string for a child tile
 *  Used for loading tiles
 */
TiledVectorRenderable.prototype.render = function(renderContext, program)
{
	var gl = renderContext.gl;
	this.bindBuffers(renderContext);
	
	gl.vertexAttribPointer(program.attributes['vertex'], 3, gl.FLOAT, false, 0, 0);
		
	gl.drawElements( this.glMode, this.lineIndices.length, this.indexType, 0);
}

/**************************************************************************************************************/

return TiledVectorRenderable;

});
