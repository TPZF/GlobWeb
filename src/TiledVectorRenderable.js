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

/**************************************************************************************************************/


/** @constructor
 *	TiledVectorRenderable constructor
 */
GlobWeb.TiledVectorRenderable = function( style, gl )
{
	this.gl = gl;
	this.style = style;
 	this.vertexBuffer = null;
 	this.indexBuffer = null;
	this.vertices = [];
	this.indices = [];
	this.featureInfos = [];
	this.dirtyVB = true;
	this.dirtyIB = true;
	this.childrenIndexBuffers = null;
	this.childrenIndices = null;
	this.glMode = -1;
}


/**************************************************************************************************************/

/**
 * Build children indices.
 * Children indices are used to render a tile children when it is not completely loaded.
 */
GlobWeb.TiledVectorRenderable.prototype.buildChildrenIndices = function( )
{
	// Default method : nothing is done
	this.childrenIndices = [ [], [], [], [] ];
	this.childrenIndexBuffers = [ null, null, null, null ];
}


/**************************************************************************************************************/

/**
 *	Remove a feature from the renderable
 */
GlobWeb.TiledVectorRenderable.prototype.removeFeature = function( feature )
{
	var fiIndex = -1;

	// Find the feature
	for ( var i = 0; i < this.featureInfos.length; i++ )
	{
		var fi = this.featureInfos[i];
		if ( fi.feature == feature )
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
		for ( var i = fiIndex + 1; i < this.featureInfos.length; i++ )
		{
			var fi = this.featureInfos[i];
			fi.startVertices -= this.featureInfos[fiIndex].vertexCount;
			fi.startIndices -= this.featureInfos[fiIndex].indexCount;
		}
			
		// Remove the feature from the infos array
		this.featureInfos.splice( fiIndex, 1 );
		
		// Erase children buffers : need to be rebuild
		this.disposeChildrenIndexBuffers();
		this.childrenIndices = null;
		
		return true;
	}
	else
	{
		return false;
	}
		
}

/**************************************************************************************************************/

/**
 *	Add a feature to the renderable
 */
GlobWeb.TiledVectorRenderable.prototype.addFeature = function( feature, tile )
{	
	var coords = null;
	
	// Note : use property defined as ['']  to avoid renaming when compiled in advanced mode with the closure compiler
	
	var crossDateLine = false;
	if ( feature['_crossDateLine']
		&& tile.geoBound.west < 0.0 ) 
	{
		crossDateLine = true;
	}
	
	var geometry = feature['geometry'];
	if ( geometry['type'] == "Polygon" )
	{
		// Close the coordinates if needed
		coords = crossDateLine ? geometry['_negCoordinates'][0] : geometry['coordinates'][0];
		if ( coords[0][0] != coords[coords.length-1][0] || coords[0][1] != coords[coords.length-1][1] )
		{
			coords.push( coords[0] );
		}
	}
	else if ( geometry['type'] == "LineString" )
	{
		coords = crossDateLine ? geometry['_negCoordinates'] : geometry['coordinates'];
	}
	
	if ( coords == null )
		return;
		
	var featureInfo = { feature: feature,
						startVertices: this.vertices.length,
						startIndices: this.indices.length,
						vertexCount: 0,
						indexCount: 0 };
	
	this.buildVerticesAndIndices( tile, coords );
	
	featureInfo.vertexCount = this.vertices.length - featureInfo.startVertices;
	featureInfo.indexCount = this.indices.length - featureInfo.startIndices;
		
	if ( featureInfo.vertexCount > 0 )
	{
		this.featureInfos.push( featureInfo );
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
GlobWeb.TiledVectorRenderable.prototype.disposeChildrenIndexBuffers = function()
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
GlobWeb.TiledVectorRenderable.prototype.dispose = function()
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
GlobWeb.TiledVectorRenderable.prototype.renderChild = function(attributes, childIndex)
{
	if ( this.childrenIndices == null )
		this.buildChildrenIndices();
	
	var childIndices = this.childrenIndices[childIndex];
	if ( childIndices.length == 0 )
		return;
		
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

	// Bind IndexBuffer
	var ib = this.childrenIndexBuffers[childIndex];
	if ( !ib ) 
	{
		var gl = this.gl;
		ib = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(childIndices), gl.STATIC_DRAW);
		this.childrenIndexBuffers[childIndex] = ib;
	}
	else
	{
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
	}

		
	gl.drawElements( this.glMode, childIndices.length, gl.UNSIGNED_SHORT, 0);
}

/**************************************************************************************************************/

/**
 *	Render the line string
 */
GlobWeb.TiledVectorRenderable.prototype.render = function(attributes)
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
