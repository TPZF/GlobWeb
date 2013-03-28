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
 
define( ['./CoordinateSystem','./VectorRendererManager','./FeatureStyle','./Program','./Triangulator','./RenderContext'], 
	function(CoordinateSystem,VectorRendererManager,FeatureStyle,Program,Triangulator,RenderContext) {

/**************************************************************************************************************/

/** @constructor
 *	Basic renderer for polygon
 */

var StencilPolygonRenderer = function(tileManager)
{
	this.renderContext = tileManager.renderContext;
	
	this.renderables = [];
		
	this.vertexShader = "\
	attribute vec3 vertex;\n\
	uniform mat4 viewProjectionMatrix;\n\
	void main(void) \n\
	{\n\
		gl_Position = viewProjectionMatrix * vec4(vertex, 1.0);\n\
	}\n\
	";

	var fragmentShader = "\
	precision lowp float; \n\
	uniform vec4 u_color;\n\
	void main(void)\n\
	{\n\
		gl_FragColor = u_color;\n\
	}\n\
	";
	
	this.program = new Program(this.renderContext);
	this.program.createFromSource(this.vertexShader, fragmentShader);
}

/**************************************************************************************************************/

/**
 *	Add polygon to renderer
 */
StencilPolygonRenderer.prototype.addGeometry = function(geometry, layer, style){
	
	var gl = this.renderContext.gl;
	
	// Create renderable
	var renderable = {
		geometry : geometry,
		style : style,
		layer: layer,
		vertexBuffer : gl.createBuffer(),
		indexBuffer : gl.createBuffer(),
	};
		
	// Create vertex buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, renderable.vertexBuffer);
	
	var coords = geometry['coordinates'][0];
	var vertices = new Float32Array( coords.length * 6 );
	
	// For polygons only
	var topIndex = 0;
	var bottomIndex = coords.length * 3;
	for ( var i=0; i < coords.length; i++)
	{
		var pos3d = [];
		var coord = [ coords[i][0], coords[i][1], 50000 ];
		CoordinateSystem.fromGeoTo3D(coord, pos3d);
		vertices[topIndex] = pos3d[0];
		vertices[topIndex+1] = pos3d[1];
		vertices[topIndex+2] = pos3d[2];
		
		coord[2] = -50000;
		
		CoordinateSystem.fromGeoTo3D(coord, pos3d);
		vertices[bottomIndex] = pos3d[0];
		vertices[bottomIndex+1] = pos3d[1];
		vertices[bottomIndex+2] = pos3d[2];
		
		topIndex += 3;
		bottomIndex += 3;
	}
	
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
	// Create index buffer(make shared ?)
	var indices = [];
	indices = Triangulator.process( coords );
	
	if ( indices == null )
	{
		console.error("Triangulation error ! Check if your GeoJSON geometry is valid");
		return false;
	}
	
	/*for ( var i = 0; i < numTopIndices; i+=3 )
	{
		var tmp = indices[i+1];
		indices[i+1] = indices[i+2];
		indices[i+2] = tmp;
	}*/
	
	
	var numTopIndices = indices.length;
	
	// Add side 
	topIndex = 0;
	bottomIndex = coords.length;
	for ( var i = 0; i < coords.length - 1; i++ )
	{
		indices.push( topIndex, bottomIndex, topIndex + 1  );
		indices.push( topIndex + 1, bottomIndex, bottomIndex + 1 );
		//indices.push( topIndex, topIndex + 1, bottomIndex  );
		//indices.push( topIndex + 1, bottomIndex + 1, bottomIndex );
		
		topIndex++;
		bottomIndex++;
	}
	
	// Add bottom : invert top indices and add offset 
	for ( var i = 0; i < numTopIndices; i+=3 )
	{
		indices.push( indices[i] + coords.length, indices[i+2] + coords.length, indices[i+1] + coords.length );
	}
		
	renderable.numTriIndices = indices.length;
	
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderable.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
	
	this.renderables.push(renderable);

}

/**************************************************************************************************************/

/**
 * 	Remove polygon from renderer
 */
StencilPolygonRenderer.prototype.removeGeometry = function(geometry,style){
	
	for ( var i = 0; i<this.renderables.length; i++ )
	{
		var currentRenderable = this.renderables[i];
		if ( currentRenderable.geometry == geometry){

			// Dispose resources
			var gl = this.renderContext.gl;
	
			if ( currentRenderable.indexBuffer )
				gl.deleteBuffer(currentRenderable.indexBuffer);
			if ( currentRenderable.vertexBuffer )
				gl.deleteBuffer(currentRenderable.vertexBuffer);

			currentRenderable.indexBuffer = null;
			currentRenderable.vertexBuffer = null;

			// Remove from array
			this.renderables.splice(i, 1);
			break;
		}
	}
}

/**************************************************************************************************************/

/**
 * 	Render all the polygons
 */
StencilPolygonRenderer.prototype.render = function()
{
	var renderContext = this.renderContext;
	var gl = renderContext.gl;
	
	gl.enable(gl.BLEND);
	gl.blendEquation(gl.FUNC_ADD);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	
	// Configure stencil
	gl.enable(gl.STENCIL_TEST);
	gl.stencilMask(255);     
	gl.depthMask(false);
	
	this.program.apply();
	
	// The shader only needs the viewProjection matrix, use GlobWeb.modelViewMatrix as a temporary storage
	mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, renderContext.modelViewMatrix)
	gl.uniformMatrix4fv(this.program.uniforms["viewProjectionMatrix"], false, renderContext.modelViewMatrix);

	
	for ( var n = 0; n < this.renderables.length; n++ )
	{
		var renderable = this.renderables[n];
		
		if ( !renderable.layer._visible
			|| renderable.layer._opacity <= 0.0 )
			continue;
			
		var style = renderable.style;
		gl.uniform4f(this.program.uniforms["u_color"], style.fillColor[0], style.fillColor[1], style.fillColor[2], 
				style.fillColor[3] * renderable.layer._opacity);  // use fillColor
				
		gl.bindBuffer(gl.ARRAY_BUFFER, renderable.vertexBuffer);
		gl.vertexAttribPointer(this.program.attributes['vertex'], 3, gl.FLOAT, false, 0, 0);
		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderable.indexBuffer);
				
		//create the mask
		gl.disable( gl.CULL_FACE );
		gl.colorMask( false, false, false, false );
		gl.depthFunc(gl.LESS);
		gl.stencilFunc(gl.ALWAYS, 0, 0);
		gl.disable(gl.CULL_FACE);
		//set the stencil buffer operation
		gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.INCR_WRAP, gl.KEEP);
		gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.DECR_WRAP, gl.KEEP);
		// draw the vector data
		gl.drawElements( gl.TRIANGLES, renderable.numTriIndices, gl.UNSIGNED_SHORT, 0);


		// render the color
		gl.colorMask( true, true, true, true );
		gl.disable(gl.DEPTH_TEST);
		//set the stencil buffer operation
		gl.stencilFunc( gl.NOTEQUAL, 0, 1);
		gl.stencilOp( gl.ZERO, gl.ZERO, gl.ZERO );
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);

		gl.drawElements( gl.TRIANGLES, renderable.numTriIndices, gl.UNSIGNED_SHORT, 0);
		gl.enable(gl.DEPTH_TEST);
	}
	
	gl.depthMask(true);
	gl.disable(gl.STENCIL_TEST)		
	gl.disable(gl.CULL_FACE);
	gl.disable(gl.BLEND);
	gl.enable(gl.DEPTH_TEST);
}

/**************************************************************************************************************/

// Add stencil for default context attributes
RenderContext.contextAttributes.stencil = true;

// Register the renderer
VectorRendererManager.registerRenderer({
	creator: function(globe) { 
			return new StencilPolygonRenderer(globe.tileManager);
		},
	canApply: function(type,style) {return (type == "Polygon") && style.fill; }
});

});