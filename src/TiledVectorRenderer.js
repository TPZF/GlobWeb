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

 define( ['./Utils','./VectorRenderer','./Program'], function(Utils,VectorRenderer,Program) {

/**************************************************************************************************************/


/** @constructor
	TiledVectorRenderer constructor
 */
var TiledVectorRenderer = function(globe)
{
	VectorRenderer.prototype.constructor.call( this, globe );
	
	var vertexShader = "\
	attribute vec3 vertex; \n\
	uniform float zOffset; \n\
	uniform mat4 modelViewMatrix;\n\
	uniform mat4 projectionMatrix;\n\
	\n\
	void main(void)  \n\
	{ \n\
		gl_Position = projectionMatrix * modelViewMatrix * vec4(vertex.x, vertex.y, vertex.z + zOffset, 1.0); \n\
	} \n\
	";
	
	var fragmentShader = "\
	#ifdef GL_ES \n\
	precision highp float; \n\
	#endif \n\
	uniform vec4 color; \n\
	\n\
	void main(void) \n\
	{ \n\
		gl_FragColor = color; \n\
	} \n\
	";

    this.program = new Program(this.tileManager.renderContext);
    this.program.createFromSource(vertexShader, fragmentShader);
}

Utils.inherits(VectorRenderer,TiledVectorRenderer);

/**************************************************************************************************************/

/**
	Render all redenrable on the given tiles
 */
TiledVectorRenderer.prototype.render = function(renderables,start,end)
{
	var renderContext = this.tileManager.renderContext;
	var gl = renderContext.gl;
	
	var modelViewMatrix = mat4.create();
	
    // Setup program
    this.program.apply();
	
	gl.depthFunc(gl.LEQUAL);
	// Do not write into z-buffer : the tiled vector are clamped to terrain, so the z of terrain should not change
	gl.depthMask(false);
 	gl.uniformMatrix4fv( this.program.uniforms["projectionMatrix"], false, renderContext.projectionMatrix);
    
	var currentStyle = null;
	
	for ( var n = start; n < end; n++ )
	{
		var renderable = renderables[n];
		var tile = renderable.tile;
		
		mat4.multiply( renderContext.viewMatrix, tile.matrix, modelViewMatrix );
		gl.uniformMatrix4fv( this.program.uniforms["modelViewMatrix"], false, modelViewMatrix );
		gl.uniform1f( this.program.uniforms["zOffset"], tile.radius * 0.0007 );
		
		var currentStyle = renderable.bucket.style;
			
		renderable.bindBuffers(renderContext);
	
		gl.vertexAttribPointer(this.program.attributes['vertex'], 3, gl.FLOAT, false, 0, 0);
			
		if ( renderable.triIndices.length > 0 ) 
		{
			gl.uniform4f( this.program.uniforms["color"], currentStyle.fillColor[0], currentStyle.fillColor[1], currentStyle.fillColor[2], 
				currentStyle.fillColor[3] * renderable.bucket.layer._opacity );
			gl.drawElements( gl.TRIANGLES, renderable.triIndices.length, renderable.indexType, 0);
		}
		
		if ( renderable.lineIndices.length > 0 ) 
		{
			gl.lineWidth( currentStyle.strokeWidth );
			gl.uniform4f( this.program.uniforms["color"], currentStyle.strokeColor[0], currentStyle.strokeColor[1], currentStyle.strokeColor[2], 
				currentStyle.strokeColor[3] * renderable.bucket.layer._opacity );
			var size = renderable.indexType == gl.UNSIGNED_INT ? 4 : 2;
			gl.drawElements( gl.LINES, renderable.lineIndices.length, renderable.indexType, renderable.triIndices.length * size);
		}
	}

	gl.depthMask(true);
	gl.depthFunc(gl.LESS);
}

/**************************************************************************************************************/

return TiledVectorRenderer;

});
