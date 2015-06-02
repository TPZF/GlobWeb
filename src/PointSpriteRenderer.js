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

define(['./Utils','./VectorRenderer','./Program','./FeatureStyle', './VectorRendererManager'],
	function(Utils,VectorRenderer,Program,FeatureStyle,VectorRendererManager) {

/**************************************************************************************************************/

/** @constructor
	PointSpriteRenderer constructor
 */
var PointSpriteRenderer = function(globe)
{
	VectorRenderer.prototype.constructor.call( this, globe );
	
	// For stats
	this.numberOfRenderPoints = 0;
 	
	var vertexShader = "\
	attribute vec3 vertex; \n\
	uniform mat4 viewProjectionMatrix; \n\
	uniform float pointSize; \n\
	void main(void)  \n\
	{ \n\
		gl_Position = viewProjectionMatrix * vec4(vertex,1.0); \n\
		gl_PointSize = pointSize; \n\
	} \n\
	";
	
	var fragmentShader = "\
	precision lowp float; \n\
	uniform sampler2D texture; \n\
	uniform float alpha; \n\
	uniform vec3 color; \n\
	\n\
	void main(void) \n\
	{ \n\
		vec4 textureColor = texture2D(texture, gl_PointCoord); \n\
		gl_FragColor = vec4(textureColor.rgb * color, textureColor.a * alpha); \n\
		if (gl_FragColor.a <= 0.0) discard; \n\
		//gl_FragColor = vec4(1.0); \n\
	} \n\
	";

    this.program = new Program(globe.renderContext);
    this.program.createFromSource(vertexShader, fragmentShader);
	
	this.defaultTexture = null;
}

Utils.inherits(VectorRenderer,PointSpriteRenderer);

/**************************************************************************************************************/

/**
 * Renderable constructor for PointSprite
 */
var Renderable = function(bucket) 
{
	this.bucket = bucket;
	this.geometry2vb = {};
	this.vertices = [];
	this.vertexBuffer = null;
	this.vertexBufferDirty = false;
}

/**************************************************************************************************************/

/**
 * Add a geometry to the renderbale
 * @return if the geometry has been successfully added to the renderable
 */
Renderable.prototype.add = function(geometry)
{
	this.geometry2vb[ geometry.gid ] = this.vertices.length;
	// TODO: Find a better way to access to coordinate system
	var pt = this.bucket.renderer.globe.coordinateSystem.fromGeoTo3D( geometry['coordinates'] );
	// Hack : push away/abroad the point depending on globe type
	var scale = this.bucket.renderer.globe.isSky ? 0.99 : 1.01;
	this.vertices.push( scale * pt[0], scale * pt[1], scale * pt[2] );
	this.vertexBufferDirty = true;
	
	return true;
}

/**************************************************************************************************************/

/**
 * Remove a geometry from the renderable
 */
Renderable.prototype.remove = function(geometry)
{
	if ( this.geometry2vb.hasOwnProperty(geometry.gid) )
	{
		var vbIndex = this.geometry2vb[ geometry.gid ];
		delete this.geometry2vb[ geometry.gid ];
		this.vertices.splice( vbIndex, 3 );
		this.vertexBufferDirty = true;
		
		// Update render data for all other geometries
		for ( var g in this.geometry2vb ) 
		{
			if ( g ) 
			{
				if ( this.geometry2vb[g] > vbIndex ) 
				{
					this.geometry2vb[g] -= 3;
				}
			}
		}
	}
	return this.vertices.length;
}

/**************************************************************************************************************/

/**
 * Dispose the renderable
 */
Renderable.prototype.dispose = function(renderContext)
{
	if ( this.vertexBuffer ) 
	{
		renderContext.gl.deleteBuffer( this.vertexBuffer );
	}
}

/**************************************************************************************************************/

/**
	Build a default texture
 */
PointSpriteRenderer.prototype._buildDefaultTexture = function(bucket)
{  	
	if ( !this.defaultTexture )
	{
		var gl = this.globe.renderContext.gl;
		this.defaultTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.defaultTexture);
		var whitePixel = new Uint8Array([255, 255, 255, 255]);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, whitePixel);
	}

	bucket.texture = this.defaultTexture;
	bucket.textureWidth = 10;
	bucket.textureHeight = 10;
}

/**************************************************************************************************************/

/**
	Build a texture from an image and store in a bucket
 */
PointSpriteRenderer.prototype._buildTextureFromImage = function(bucket,image)
{  	
	bucket.texture = this.globe.renderContext.createNonPowerOfTwoTextureFromImage(image);
	bucket.textureWidth = image.width;
	bucket.textureHeight = image.height;
}

/**************************************************************************************************************/

/**
	Check if renderer is applicable
 */
PointSpriteRenderer.prototype.canApply = function(type,style)
{
	return type == "Point" && !style.label; 
}

/**************************************************************************************************************/

/**
	Bucket constructor for PointSpriteRenderer
 */
 var Bucket = function(layer,style)
{
	this.layer = layer;
	this.style = new FeatureStyle(style);
	this.texture = null;
	this.renderer = null;
}

/**************************************************************************************************************/

/**
	Create a renderable for this bucket
 */
Bucket.prototype.createRenderable = function()
{
	return new Renderable(this);
}

/**************************************************************************************************************/

/**
	Check if a bucket is compatible
 */
Bucket.prototype.isCompatible = function(style)
{
	if ( this.style.iconUrl == style.iconUrl
		&& this.style.icon == style.icon
		&& this.style.fillColor[0] == style.fillColor[0]
		&& this.style.fillColor[1] == style.fillColor[1]
		&& this.style.fillColor[2] == style.fillColor[2] )
	{
		return true;
	}
	
	return false;
}

/**************************************************************************************************************/

/**
	Create bucket to render a point
 */
PointSpriteRenderer.prototype.createBucket = function(layer,style)
{
	var gl = this.globe.renderContext.gl;
	var vb = gl.createBuffer();

	// Create a bucket
	var bucket = new Bucket(layer,style);
	bucket.renderer = this;
		
	// Initialize bucket : create the texture	
	if ( style['iconUrl'] )
	{
		var image = new Image();
		image.crossOrigin = '';
		var self = this;
		image.onload = function() {self._buildTextureFromImage(bucket,image); self.globe.renderContext.requestFrame(); }
		image.onerror = function() { self._buildDefaultTexture(bucket); }
		image.src = style.iconUrl;
	}
	else if ( style['icon'] )
	{
		this._buildTextureFromImage(bucket,style.icon);
	}
	else
	{
		this._buildDefaultTexture(bucket);
	}
	
	return bucket;
}

/**************************************************************************************************************/

/**
	Render
 */
PointSpriteRenderer.prototype.render = function(renderables,start,end)
{	
	var renderContext = this.globe.renderContext;
	var gl = renderContext.gl;
	
	// Setup states
	//gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendEquation(gl.FUNC_ADD);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	// Setup program
	this.program.apply();
	
	// The shader only needs the viewProjection matrix, use GlobWeb.modelViewMatrix as a temporary storage
	mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, renderContext.modelViewMatrix)
	gl.uniformMatrix4fv(this.program.uniforms["viewProjectionMatrix"], false, renderContext.modelViewMatrix);
	gl.uniform1i(this.program.uniforms["texture"], 0);
	
	// Render each renderables
	var currentBucket = null;
	for ( var n = start; n < end; n++ )
	{
		var renderable = renderables[n];
		var bucket = renderable.bucket;
		
		if ( currentBucket != bucket )
		{
			gl.uniform1f(this.program.uniforms["alpha"], bucket.layer._opacity);
			var color = bucket.style.fillColor;
			gl.uniform3f(this.program.uniforms["color"], color[0], color[1], color[2] );
			gl.uniform1f(this.program.uniforms["pointSize"], bucket.textureWidth);
			
			// Bind point texture
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, bucket.texture);
			
			currentBucket = bucket;
		}
		
			
		if ( !renderable.vertexBuffer )
		{
			renderable.vertexBuffer = gl.createBuffer();
		}
		
		gl.bindBuffer(gl.ARRAY_BUFFER, renderable.vertexBuffer);
		gl.vertexAttribPointer(this.program.attributes['vertex'], 3, gl.FLOAT, false, 0, 0);
		
		if ( renderable.vertexBufferDirty )
		{
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(renderable.vertices), gl.STATIC_DRAW);
			renderable.vertexBufferDirty = false;
		}

							
		gl.drawArrays(gl.POINTS, 0, renderable.vertices.length/3);
	}

    //gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
}


/**************************************************************************************************************/

// Register the renderer
VectorRendererManager.factory.push( function(globe) { return new PointSpriteRenderer(globe); } );

return PointSpriteRenderer;

});