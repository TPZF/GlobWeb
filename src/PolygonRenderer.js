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
 * along with  If not, see <http://www.gnu.org/licenses/>.
 ***************************************/
 
define( ['./CoordinateSystem','./VectorRendererManager','./FeatureStyle','./Program','./Triangulator'], 
	function(CoordinateSystem,VectorRendererManager,FeatureStyle,Program,Triangulator) {

/**************************************************************************************************************/

/** @constructor
 *	Basic renderer for polygon
 */

var PolygonRenderer = function(tileManager)
{
	this.renderContext = tileManager.renderContext;
	var gl = this.renderContext.gl;
	
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
PolygonRenderer.prototype.addGeometry = function(geometry, layer, style){
	
	var gl = this.renderContext.gl;
	
	// Create renderable
	var renderable = {
		geometry : geometry,
		style : style,
		layer: layer,
		vertexBuffer : gl.createBuffer(),
		indexBuffer : gl.createBuffer(),
	};
	
	// Create texture
	var self = this;
		
	// Create vertex buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, renderable.vertexBuffer);
	
	var coords = geometry['coordinates'][0];
	var vertices = new Float32Array( style.extrude ? coords.length * 6 : coords.length * 3 );
	
	// For polygons only
	for ( var i=0; i < coords.length; i++)
	{
		var pos3d = [];
		CoordinateSystem.fromGeoTo3D(coords[i], pos3d);
		vertices[i*3] = pos3d[0];
		vertices[i*3+1] = pos3d[1];
		vertices[i*3+2] = pos3d[2];
	}
	
	if ( style.extrude )
	{
		var offset = coords.length * 3;
		for ( var i=0; i < coords.length; i++)
		{
			var pos3d = [];
			var coordAtZero = [ coords[i][0], coords[i][1], 0.0 ];
			CoordinateSystem.fromGeoTo3D( coordAtZero, pos3d);
			vertices[offset] = pos3d[0];
			vertices[offset+1] = pos3d[1];
			vertices[offset+2] = pos3d[2];
			offset += 3;
		}
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
	
	
	if ( style.extrude )
	{
		var upOffset = 0;
		var lowOffset = coords.length;
		
		for ( var i = 0; i < coords.length-1; i++ )
		{
			indices.push( upOffset, upOffset + 1, lowOffset );
			indices.push( upOffset + 1, lowOffset + 1, lowOffset );
			
			upOffset += 1;
			lowOffset += 1;
		}
	}
	
	renderable.numTriIndices = indices.length;
	
	var offset = 0;
	for ( var i = 0; i < coords.length-1; i++ )
	{
		indices.push( offset, offset + 1 );
		offset += 1;
	}
	if ( style.extrude )
	{
		var upOffset = 0;
		var lowOffset = coords.length;
		for ( var i = 0; i < coords.length-1; i++ )
		{
			indices.push( upOffset, lowOffset );
			
			upOffset += 1;
			lowOffset += 1;
		}
	}
	
	renderable.numLineIndices = indices.length - renderable.numTriIndices;

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderable.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
	
	this.renderables.push(renderable);

}

/**************************************************************************************************************/

/**
 * 	Remove polygon from renderer
 */
PolygonRenderer.prototype.removeGeometry = function(geometry,style){
	
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
PolygonRenderer.prototype.render = function()
{
	var renderContext = this.renderContext;
	var gl = renderContext.gl;
	
	gl.enable(gl.BLEND);
	gl.blendEquation(gl.FUNC_ADD);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.depthFunc(gl.LEQUAL);
	//gl.disable(gl.DEPTH_TEST);
	
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
		
		gl.drawElements( gl.TRIANGLES, renderable.numTriIndices, gl.UNSIGNED_SHORT, 0);
		if ( renderable.numLineIndices > 0 )
		{
			gl.uniform4f(this.program.uniforms["u_color"], style.strokeColor[0], style.strokeColor[1], style.strokeColor[2], style.strokeColor[3] * renderable.layer._opacity);  
			gl.drawElements( gl.LINES, renderable.numLineIndices, gl.UNSIGNED_SHORT, renderable.numTriIndices * 2);
		}
	}
	
	//gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LESS);
	gl.disable(gl.BLEND);
}

/**************************************************************************************************************/

// Register the renderer
VectorRendererManager.registerRenderer({
	creator: function(globe) { 
			return new PolygonRenderer(globe.tileManager);
		},
	canApply: function(type,style) {return (type == "Polygon") && (style.fill == true); }
});

});