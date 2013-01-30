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
 *	SimplePolygonRenderer constructor
 *
 *	Renderer of textured or not quadrilaterals
 */

GlobWeb.SimplePolygonRenderer = function(tileManager)
{
	this.renderContext = tileManager.renderContext;
	var gl = this.renderContext.gl;
	
	this.renderables = [];
	
	// Texture cache management : avoid flickering when modifiying style
	// TODO : maybe put this in GlobWeb, can be used by other renderers
	this.textureCache = {};
	this.texturesToPurge = [];
	
	// Parameters used to implement ONE shader for color xor texture rendering
	this.whiteTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, this.whiteTexture);
	var whitePixel = new Uint8Array([255, 255, 255, 255]);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, whitePixel);
	
	this.vertexShader = "\
	attribute vec3 vertex;\n\
	attribute vec2 tcoord;\n\
	uniform mat4 viewProjectionMatrix;\n\
	\n\
	varying vec2 vTextureCoord;\n\
	\n\
	void main(void) \n\
	{\n\
		vTextureCoord = tcoord;\n\
		vTextureCoord.y = 1.0 - vTextureCoord.y; \n\
		gl_Position = viewProjectionMatrix * vec4(vertex, 1.0);\n\
	}\n\
	";

var fragmentShader = "\
	precision highp float; \n\
	uniform vec4 u_color;\n\
	varying vec2 vTextureCoord;\n\
	uniform sampler2D texture; \n\
	void main(void)\n\
	{\n\
		gl_FragColor = texture2D(texture, vTextureCoord) * u_color;\n\
	}\n\
	";
	
	this.defaultProgram = new GlobWeb.Program(this.renderContext);
	this.defaultProgram.createFromSource(this.vertexShader, fragmentShader);

	// Shared buffer
	// Create texCoord buffer
	this.tcoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.tcoordBuffer);
	
	var textureCoords = [
		0.0, 0.0,
		1.0, 0.0,
		1.0, 1.0,
		0.0, 1.0,
		0.0, 0.0
	];
	
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
	this.tcoordBuffer.itemSize = 2;
	this.tcoordBuffer.numItems = 5;
}

/**************************************************************************************************************/

/**
 *	Add polygon to renderer
 */
GlobWeb.SimplePolygonRenderer.prototype.addGeometry = function(geometry, layer, style){
	
	var gl = this.renderContext.gl;
	
	// Create renderable
	var renderable = {
		geometry : geometry,
		style : style,
		layer: layer,
		vertexBuffer : gl.createBuffer(),
		indexBuffer : gl.createBuffer(),
		texture : null,
		program: this.defaultProgram,
		textureUrl: ""
	}
	
	// Create texture
	var self = this;
	
	if ( style.fillTextureUrl )
	{
		var cacheTexture = this.textureCache[style.fillTextureUrl];
		if ( cacheTexture )
		{
			renderable.texture = cacheTexture.texture;
			cacheTexture.count++;
		}
		else
		{
			var image = new Image();
			image.crossOrigin = '';
			image.onload = function () 
			{
				renderable.texture = self.renderContext.createNonPowerOfTwoTextureFromImage(image);
				self.textureCache[style.fillTextureUrl] = { texture: renderable.texture, count: 1 };
			}
			
			image.onerror = function(event)
			{
				console.log("Cannot load " + image.src );
			}
			
			image.src = style.fillTextureUrl;
		}
		renderable.textureUrl = style.fillTextureUrl;
	}
	else if ( style.fillTexture )
	{
		renderable.texture = style.fillTexture;
	}

	if ( style.fillShader && style.fillShader.fragmentCode )
	{
		renderable.program = new GlobWeb.Program(this.renderContext);
		renderable.program.createFromSource(this.vertexShader, style.fillShader.fragmentCode);
	}
	
	// Create vertex buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, renderable.vertexBuffer);
	var vertices = [];
	var points = [];
	
	// For polygons only
	for ( var i=0; i<geometry['coordinates'][0].length; i++)
	{
		var pos3d = [];
		GlobWeb.CoordinateSystem.fromGeoTo3D(geometry['coordinates'][0][i], pos3d);
		vertices = vertices.concat(pos3d);
		points.push(pos3d);
	}

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	renderable.vertexBuffer.itemSize = 3;
	renderable.vertexBuffer.numItems = vertices.length/3;

	// Create index buffer(make shared ?)
	var indices = [];
	indices = GlobWeb.Triangulator.process( points );
	
	if ( indices == null )
	{
		console.error("Triangulation error ! Check if your GeoJSON geometry is valid");
		return false;
	}
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderable.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
	renderable.indexBuffer.itemSize = 1;
	renderable.indexBuffer.numItems = indices.length;
	
	this.renderables.push(renderable);

}

/**************************************************************************************************************/

/**
 * 	Remove polygon from renderer
 */
GlobWeb.SimplePolygonRenderer.prototype.removeGeometry = function(geometry,style){
	
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
				
			// The texture is managed in a cache, so do not remove it right now
			if ( currentRenderable.textureUrl )
			{
				var cacheTexture = this.textureCache[currentRenderable.textureUrl];
				cacheTexture.count--;
				if ( cacheTexture.count <= 0 )
				{
					this.texturesToPurge.push(currentRenderable.textureUrl);
				}
			}
			else if ( currentRenderable.texture )
			{
				gl.deleteTexture( currentRenderable.texture )
			}

			currentRenderable.indexBuffer = null;
			currentRenderable.vertexBuffer = null;
			currentRenderable.texture = null;

			// Remove from array
			this.renderables.splice(i, 1);
			break;
		}
	}
}

/**************************************************************************************************************/

/**
 *	Update shader default parameters(texture, viewProjectionMatrix, tcoord)
 *
 *	@param program Shader program
 */
GlobWeb.SimplePolygonRenderer.prototype.updateShaderDefaultParameters = function(program)
{
	var renderContext = this.renderContext;
	var gl = renderContext.gl;

	// The shader only needs the viewProjection matrix, use GlobWeb.modelViewMatrix as a temporary storage
	mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, renderContext.modelViewMatrix)
	gl.uniformMatrix4fv(program.uniforms["viewProjectionMatrix"], false, renderContext.modelViewMatrix);
	gl.uniform1i(program.uniforms["texture"], 0);
	gl.activeTexture(gl.TEXTURE0);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, this.tcoordBuffer);
	gl.vertexAttribPointer(program.attributes['tcoord'], 2, gl.FLOAT, false, 0, 0);
}

/**************************************************************************************************************/

/**
 * 	Render all the polygons
 */
GlobWeb.SimplePolygonRenderer.prototype.render = function()
{
	var renderContext = this.renderContext;
	var gl = renderContext.gl;
	
	// Purge textures from the cache if nay
	for ( var i = 0; i < this.texturesToPurge.length; i++ )
	{
		var cacheTexture = this.textureCache[ this.texturesToPurge[i] ];
		if ( cacheTexture.count <= 0 )
		{
			gl.deleteTexture(cacheTexture.texture);
			delete this.textureCache[ this.texturesToPurge[i] ];
		}
	}
	this.texturesToPurge.length = 0;

	gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendEquation(gl.FUNC_ADD);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	
	this.defaultProgram.apply();
	var currentProgram = this.defaultProgram;
	this.updateShaderDefaultParameters(currentProgram);
	
	for ( var n = 0; n < this.renderables.length; n++ )
	{
		var renderable = this.renderables[n];
		
		if ( !renderable.layer._visible
			|| renderable.layer._opacity <= 0.0 )
			continue;
		
		if ( renderable.program && renderable.program != currentProgram )
		{
			currentProgram = renderable.program;
			currentProgram.apply();
			this.updateShaderDefaultParameters(currentProgram);
		}

		if ( renderable.style.fillShader && renderable.style.fillShader.updateUniforms )
			renderable.style.fillShader.updateUniforms(gl, renderable);
		
		if ( renderable.texture ) 
		{
			gl.bindTexture(gl.TEXTURE_2D, renderable.texture); // use texture of renderable
			gl.uniform4f(currentProgram.uniforms["u_color"], 1.0, 1.0, 1.0, renderable.layer._opacity);  // use whiteColor
		}
		else
		{
			gl.bindTexture(gl.TEXTURE_2D, this.whiteTexture);  // use white texture
			gl.uniform4f(currentProgram.uniforms["u_color"], renderable.style.fillColor[0], renderable.style.fillColor[1], renderable.style.fillColor[2], 
				renderable.style.fillColor[3] * renderable.layer._opacity);  // use fillColor
		}	

		gl.bindBuffer(gl.ARRAY_BUFFER, renderable.vertexBuffer);
		gl.vertexAttribPointer(currentProgram.attributes['vertex'], renderable.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderable.indexBuffer);
		
		gl.drawElements( gl.TRIANGLES, renderable.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	}
	
	gl.enable(gl.DEPTH_TEST);
	gl.disable(gl.BLEND);
}

/**************************************************************************************************************/

// Register the renderer
GlobWeb.VectorRendererManager.registerRenderer({
	creator: function(globe) { 
			return new GlobWeb.SimplePolygonRenderer(globe.tileManager);
		},
	canApply: function(type,style) {return (style.rendererHint == "Basic") && (type == "Polygon") && (style.fill == true); }
});