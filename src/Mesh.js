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

define(function() {

/**************************************************************************************************************/

/** @constructor
	Mesh constructor
 */
var Mesh = function(renderContext)
{
	this.renderContext = renderContext;
	this.vertexBuffer = null;
	this.tcoordBuffer = null;
	this.indexBuffer = null;
	this.colorBuffer = null;
	this.numVertices = 0;
	this.mode = renderContext.gl.TRIANGLES;
}

/**************************************************************************************************************/

/*
	Mesh setVertices method
 */
Mesh.prototype.setVertices = function(vertices)
{
	var gl = this.renderContext.gl;
	if ( this.vertexBuffer == null )
	{
		this.vertexBuffer = gl.createBuffer();
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	this.numVertices = vertices.length;
}

/**************************************************************************************************************/

/*
	Mesh setTexCoords method
 */
Mesh.prototype.setTexCoords = function(tcoords)
{
	var gl = this.renderContext.gl;
	if ( this.tcoordBuffer == null )
	{
		this.tcoordBuffer = gl.createBuffer();
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, this.tcoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tcoords), gl.STATIC_DRAW);
}

/**************************************************************************************************************/

/*
	Mesh setColors method
 */
Mesh.prototype.setColors = function(colors)
{
	var gl = this.renderContext.gl;
	if ( this.colorBuffer == null )
	{
		this.colorBuffer = gl.createBuffer();
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
}

/**************************************************************************************************************/

/*
	Mesh setIndices method
 */
Mesh.prototype.setIndices = function(indices)
{
	var gl = this.renderContext.gl;
	if ( this.indexBuffer == null )
	{
		this.indexBuffer = gl.createBuffer();
	}
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
	this.numIndices = indices.length;
}

/**************************************************************************************************************/

/*
	Convert to wireframe (for debug purposes)
 */
Mesh.prototype.setIndicesToWireframe = function(indices)
{
	this.mode = this.renderContext.gl.LINES;
	
	// Convert indices
	var wireframeIndices = [];
	wireframeIndices.length = 2 * indices.length;
	
	for ( var i =0;  i < indices.length; i += 3 )
	{
		wireframeIndices[2*i] = indices[i];
		wireframeIndices[2*i+1] = indices[i+1];
		
		wireframeIndices[2*i+2] = indices[i+1];
		wireframeIndices[2*i+3] = indices[i+2];
		
		wireframeIndices[2*i+4] = indices[i+2];
		wireframeIndices[2*i+5] = indices[i];
	}
	
	this.setIndices( wireframeIndices );
}

/**************************************************************************************************************/

/*
	Mesh render method
 */
Mesh.prototype.render = function(attributes)
{
	var gl = this.renderContext.gl;
	
	// Warning : use quoted strings to access properties of the attributes, to work correclty in advanced mode with closure compiler
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.vertexAttribPointer(attributes['vertex'], 3, gl.FLOAT, false, 0, 0);
	if ( attributes.hasOwnProperty('tcoord') )
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, this.tcoordBuffer);
		gl.vertexAttribPointer(attributes['tcoord'], 2, gl.FLOAT, false, 0, 0);
	}
	if ( attributes.hasOwnProperty('color') )
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
		gl.vertexAttribPointer(attributes['color'], 4, gl.FLOAT, false, 0, 0);
	}
	if ( this.indexBuffer ) 
	{
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		gl.drawElements(this.mode, this.numIndices, gl.UNSIGNED_SHORT, 0);
	}
	else
	{
		gl.drawArrays(this.mode, 0, this.numVertices / 3);
	}
}

/**************************************************************************************************************/

/*
	Mesh dispose method
 */
Mesh.prototype.dispose = function()
{
	var gl = this.renderContext.gl;
	if ( this.indexBuffer )
		gl.deleteBuffer(this.indexBuffer);
	if ( this.vertexBuffer )
		gl.deleteBuffer(this.vertexBuffer);
	if ( this.tcoordBuffer )
		gl.deleteBuffer(this.tcoordBuffer);
	if ( this.colorBuffer )
		gl.deleteBuffer(this.colorBuffer);
	
	this.indexBuffer = null;
	this.vertexBuffer = null;
	this.tcoordBuffer = null;
	this.colorBuffer = null;
}

/**************************************************************************************************************/

return Mesh;

});

