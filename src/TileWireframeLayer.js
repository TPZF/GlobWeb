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

/** 
	@constructor
	Function constructor for TileWireframeLayer
 */
GlobWeb.TileWireframeLayer = function( options )
{
	this.globe = null;
}

/**************************************************************************************************************/

/** 
  Attach the layer to the globe
 */
GlobWeb.TileWireframeLayer.prototype._attach = function( g )
{
	this.globe = g;
	this.globe.tileManager.addPostRenderer(this);
	if (!this.program)
	{
		var vertexShader = "\
		attribute vec3 vertex;\n\
		uniform mat4 modelViewMatrix;\n\
		uniform mat4 projectionMatrix;\n\
		void main(void) \n\
		{\n\
			gl_Position = projectionMatrix * modelViewMatrix * vec4(vertex, 1.0);\n\
		}\n\
		";

		var fragmentShader = "\
		precision highp float; \n\
		void main(void)\n\
		{\n\
				gl_FragColor = vec4(1.0,1.0,1.0,1.0);\n\
		}\n\
		";
		
		this.program = new GlobWeb.Program(this.globe.renderContext);
		this.program.createFromSource( vertexShader, fragmentShader );
	}
}

/**************************************************************************************************************/

/** 
  Detach the layer from the globe
 */
GlobWeb.TileWireframeLayer.prototype._detach = function()
{
	this.globe.tileManager.removePostRenderer(this);
	this.globe = null;
}

/**************************************************************************************************************/

/**
	Render the tiles outline
 */
GlobWeb.TileWireframeLayer.prototype.render = function( tiles )
{
	var rc = this.globe.renderContext;
	var gl = rc.gl;
		
    // Setup program
    this.program.apply();
	gl.uniformMatrix4fv(this.program.uniforms["projectionMatrix"], false, rc.projectionMatrix);
	
	var vertexAttribute = this.program.attributes['vertex'];
	var tileIndexBuffer = this.globe.tileManager.tileIndexBuffer;
	var currentIB = null;	
	
	for ( var i = 0; i < tiles.length; i++ )
	{
		var tile = tiles[i];
		
		var isLoaded = ( tile.state == GlobWeb.Tile.State.LOADED );
		var isLevelZero = ( tile.parentIndex == -1 );
	
		// Update uniforms for modelview matrix
		mat4.multiply( rc.viewMatrix, tile.matrix, rc.modelViewMatrix );
		gl.uniformMatrix4fv(this.program.uniforms["modelViewMatrix"], false, rc.modelViewMatrix);
			
		// Bind the vertex buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, tile.vertexBuffer);
		gl.vertexAttribPointer(vertexAttribute, 3, gl.FLOAT, false, 4*tile.config.vertexSize, 0);
		
		var indexBuffer = ( isLoaded || isLevelZero ) ? tileIndexBuffer.getWireframe() : tileIndexBuffer.getSubWireframe(tile.parentIndex);
		// Bind the index buffer only if different (index buffer is shared between tiles)
		if ( currentIB != indexBuffer )
		{
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
			currentIB = indexBuffer;
		}
		
		// Draw the tiles in wireframe mode
		var numIndices = currentIB.numIndices;
		gl.drawElements(gl.LINES, currentIB.numIndices, gl.UNSIGNED_SHORT, 0);
	}
}

/**************************************************************************************************************/
