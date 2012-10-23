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
 *	SimpleLineRenderer constructor
 */

GlobWeb.SimpleLineRenderer = function(tileManager)
{
	this.renderContext = tileManager.renderContext;
	
	this.renderables = [];
	
	var vertexShader = "\
	attribute vec3 vertex;\n\
	uniform mat4 viewProjectionMatrix;\n\
	\n\
	void main(void)\n\
	{\n\
		gl_Position = viewProjectionMatrix * vec4(vertex, 1.0);\n\
	}\n\
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
	
	this.program = new GlobWeb.Program(this.renderContext);
	this.program.createFromSource(vertexShader, fragmentShader);
}

/**************************************************************************************************************/

/**
 *	Add line shape to renderer
 */
GlobWeb.SimpleLineRenderer.prototype.addGeometry = function(geometry, style){
	
	var gl = this.renderContext.gl;
	
	// Create renderable
	var renderable = {
		geometry : geometry,
		vertexBuffer : gl.createBuffer(),
		indexBuffer : gl.createBuffer(),
		style : style
	}
	
	switch ( geometry.type )
	{
		case "Polygon" :
			// Fill array by line shape coordinates
			
			this.buildVertices( renderable, geometry['coordinates'][0] );
			
			// Compute the indices corresponding to line shape
			var indices = [];
			for ( var i=0; i<geometry['coordinates'][0].length-1; i++ )
			{
				indices.push(i);
				indices.push(i+1);
			}
			// Connect last point with the first one
			indices.push(i);
			indices.push(0);
			
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderable.indexBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
			renderable.indexBuffer.itemSize = 1;
			renderable.indexBuffer.numItems = indices.length;
			break;
		case "LineString":
			// TODO never tested
			
			this.buildVertices( geometry['coordinates'] );
			
			// Compute the indices corresponding to line shape
			var indices = [];
			for ( var i=0; i<geometry['coordinates'].length-1; i++ )
			{
				indices.push(i);
				indices.push(i+1);
			}
			
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderable.indexBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
			renderable.indexBuffer.itemSize = 1;
			renderable.indexBuffer.numItems = indices.length;
			
			break;
		default:
			console.log("Not implemented yet");
			break;
	}
	
	// Add to renderables
	this.renderables.push(renderable);
}

/**************************************************************************************************************/

GlobWeb.SimpleLineRenderer.prototype.buildVertices = function( renderable, coordinates )
{
	var gl = this.renderContext.gl;
	
	gl.bindBuffer(gl.ARRAY_BUFFER, renderable.vertexBuffer);
	var vertices = [];
	for ( var i=0; i<coordinates.length; i++)
	{
		var pos3d = [];
		GlobWeb.CoordinateSystem.fromGeoTo3D(coordinates[i], pos3d);
		vertices = vertices.concat(pos3d);
	}
	
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	renderable.vertexBuffer.itemSize = 3;
	renderable.vertexBuffer.numItems = vertices.length/3;
}

/**************************************************************************************************************/

/**
 * 	Remove line shape from renderer
 */
GlobWeb.SimpleLineRenderer.prototype.removeGeometry = function(geometry,style){
	
	for ( var i = 0; i<this.renderables.length; i++ )
	{
		var currentRenderable = this.renderables[i];
		if ( currentRenderable.geometry == geometry){
			this.renderables.splice(i, 1);
		}
	}
}

/**************************************************************************************************************/

/**
 * 	Render all the lines
 */
GlobWeb.SimpleLineRenderer.prototype.render = function(){
	var renderContext = this.renderContext;
	var gl = renderContext.gl;

	gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendEquation(gl.FUNC_ADD);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	this.program.apply();

	// The shader only needs the viewProjection matrix, use GlobWeb.modelViewMatrix as a temporary storage
	mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, renderContext.modelViewMatrix)
	gl.uniformMatrix4fv(this.program.uniforms["viewProjectionMatrix"], false, renderContext.modelViewMatrix);
	
	for ( var n = 0; n < this.renderables.length; n++ )
	{
		// opacity HACK
		gl.uniform4f(this.program.uniforms["color"], this.renderables[n].style.strokeColor[0] , this.renderables[n].style.strokeColor[1], this.renderables[n].style.strokeColor[2], this.renderables[n].style.opacity / 2.);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.renderables[n].vertexBuffer);
		gl.vertexAttribPointer(this.program.attributes['vertex'], this.renderables[n].vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.renderables[n].indexBuffer);
		
		gl.drawElements( gl.LINES, this.renderables[n].indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	}
	
	gl.enable(gl.DEPTH_TEST);
	gl.disable(gl.BLEND);
}


/**************************************************************************************************************/

// Register the renderer
GlobWeb.VectorRendererManager.registerRenderer({
	creator: function(globe) { 
			return new GlobWeb.SimpleLineRenderer(globe.tileManager);
		},
	canApply: function(type,style) {return (style.rendererHint == "Basic") && (type == "Polygon" || type == "LineString") && (style.fill == false); }
});