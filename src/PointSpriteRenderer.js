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

define(['./Program','./CoordinateSystem','./RendererTileData','./FeatureStyle', './VectorRendererManager'],
	function(Program,CoordinateSystem,RendererTileData,FeatureStyle,VectorRendererManager) {

/**************************************************************************************************************/

/** @constructor
	PointSpriteRenderer constructor
 */
var PointSpriteRenderer = function(tileManager,style)
{
	// Store object for rendering
	this.renderContext = tileManager.renderContext;
	this.tileConfig = tileManager.tileConfig;
	
	// Bucket management for rendering : a bucket is a texture with its points
	this.buckets = [];
	
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

    this.program = new Program(this.renderContext);
    this.program.createFromSource(vertexShader, fragmentShader);
	
	this.frameNumber = 0;

	this.defaultTexture = null;
}

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
 */
Renderable.prototype.add = function(geometry)
{
	this.geometry2vb[ geometry.gid ] = this.vertices.length;
	var pt = CoordinateSystem.fromGeoTo3D( geometry['coordinates'] );
	// Hack : push away the point, only works for AstroWeb, sufficient for now
	this.vertices.push( 0.99 * pt[0], 0.99 * pt[1], 0.99 * pt[2] );
	this.vertexBufferDirty = true;
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

/*
	Build a default texture
 */
PointSpriteRenderer.prototype._buildDefaultTexture = function(bucket)
{  	
	if ( !this.defaultTexture )
	{
		var gl = this.renderContext.gl;
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

/*
	Build a texture from an image and store in a bucket
 */
PointSpriteRenderer.prototype._buildTextureFromImage = function(bucket,image)
{  	
	bucket.texture = this.renderContext.createNonPowerOfTwoTextureFromImage(image);
	bucket.textureWidth = image.width;
	bucket.textureHeight = image.height;
}


/**************************************************************************************************************/

/**
	Add a point to the renderer
 */
PointSpriteRenderer.prototype.addGeometryToTile = function(bucket,geometry,tile)
{
	var tileData = tile.extension.pointSprite;
	if (!tileData)
	{
		tileData = tile.extension.pointSprite = new RendererTileData();
	}
	var renderable = tileData.getRenderable(bucket);
	if (!renderable) 
	{
		renderable = new Renderable(bucket);
		tileData.renderables.push(renderable);
	}
	renderable.add(geometry);

}

/**************************************************************************************************************/

/**
	Remove a point from the renderer
 */
PointSpriteRenderer.prototype.removeGeometryFromTile = function(geometry,tile)
{
	var tileData = tile.extension.pointSprite;
	if (tileData)
	{
		for ( var i=0; i < tileData.renderables.length; i++ )
		{
			tileData.renderables[i].remove(geometry);
		}
	}
}

PointSpriteRenderer.prototype.removeGeometry = function()
{
}

/**************************************************************************************************************/

/*
	Get or create bucket to render a point
 */
PointSpriteRenderer.prototype.getOrCreateBucket = function(layer,style)
{
	// Find an existing bucket for the given style, except if label is set, always create a new one
	for ( var i = 0; i < this.buckets.length; i++ )
	{
		var bucket = this.buckets[i];
		if ( bucket.layer == layer && bucket.style.iconUrl == style.iconUrl
			&& bucket.style.icon == style.icon
			&& bucket.style.label == style.label
			&& bucket.style.fillColor[0] == style.fillColor[0]
			&& bucket.style.fillColor[1] == style.fillColor[1]
			&& bucket.style.fillColor[2] == style.fillColor[2])
		{
			return bucket;
		}
	}

	var gl = this.renderContext.gl;
	var vb = gl.createBuffer();


	// Create a bucket
	var bucket = {
		style: new FeatureStyle(style),
		layer: layer,
		texture: null
	};
		
	// Initialize bucket : create the texture	
	if ( style['label'] )
	{
		var imageData = Text.generateImageData(style['label'], style['textColor']);
		this._buildTextureFromImage(bucket,imageData);
	}
	else if ( style['iconUrl'] )
	{
		var image = new Image();
		var self = this;
		image.onload = function() {self._buildTextureFromImage(bucket,image); self.renderContext.requestFrame(); }
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
	
	this.buckets.push( bucket );
	
	return bucket;
}

/**************************************************************************************************************/

/*
	Render all the POIs
 */
PointSpriteRenderer.prototype.render = function(tiles)
{	
	var renderContext = this.renderContext;
	var gl = this.renderContext.gl;
	
	// Setup states
	gl.enable(gl.BLEND);
	gl.blendEquation(gl.FUNC_ADD);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	// Setup program
	this.program.apply();
	
	// The shader only needs the viewProjection matrix, use GlobWeb.modelViewMatrix as a temporary storage
	mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, renderContext.modelViewMatrix)
	gl.uniformMatrix4fv(this.program.uniforms["viewProjectionMatrix"], false, renderContext.modelViewMatrix);
	gl.uniform1i(this.program.uniforms["texture"], 0);
	
	for ( var n = 0; n < tiles.length; n++ )
	{
		var tile = tiles[n];
		var tileData = tile.extension.pointSprite;
		while (tile.parent && !tileData)
		{
			tile = tile.parent;
			tileData = tile.extension.pointSprite;
		}
		
		if (!tileData || tileData.frameNumber == this.frameNumber)
			continue;
		
		tileData.frameNumber = this.frameNumber;
		
		for (var i=0; i < tileData.renderables.length; i++ ) 
		{
			var renderable = tileData.renderables[i];
			if (!renderable.bucket.layer._visible)
				continue;
			gl.uniform1f(this.program.uniforms["alpha"], renderable.bucket.layer._opacity);
			var color = renderable.bucket.style.fillColor;
			gl.uniform3f(this.program.uniforms["color"], color[0], color[1], color[2] );
			gl.uniform1f(this.program.uniforms["pointSize"], renderable.bucket.textureWidth);
				
			// Warning : use quoted strings to access properties of the attributes, to work correclty in advanced mode with closure compiler
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

			
			// Bind point texture
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, renderable.bucket.texture);
					
			gl.drawArrays(gl.POINTS, 0, renderable.vertices.length/3);
		}
			
		
	}

    gl.disable(gl.BLEND);
	
	this.frameNumber++;
}

/**************************************************************************************************************/

/*
	Render all the POIs
 */
/*PointSpriteRenderer.prototype.render = function()
{
	if (this.buckets.length == 0)
	{
		return;
	}
	
	this.numberOfRenderPoints = 0;
	
	var renderContext = this.renderContext;
	var gl = this.renderContext.gl;
	
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
	
	for ( var n = 0; n < this.buckets.length; n++ )
	{
		var bucket = this.buckets[n];
		
		if ( bucket.texture == null || bucket.vertices.length == 0
			|| !bucket.layer._visible || bucket.layer._opactiy <= 0.0 )
			continue;
			
		gl.uniform1f(this.program.uniforms["alpha"], bucket.layer._opacity);
		gl.uniform3f(this.program.uniforms["color"], 1.0, 1.0, 1.0 );
		gl.uniform1f(this.program.uniforms["pointSize"], bucket.textureWidth);
			
		// Warning : use quoted strings to access properties of the attributes, to work correclty in advanced mode with closure compiler
		gl.bindBuffer(gl.ARRAY_BUFFER, bucket.vertexBuffer);
		gl.vertexAttribPointer(this.program.attributes['vertex'], 3, gl.FLOAT, false, 0, 0);
		
		if ( bucket.vertexBufferDirty )
		{
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bucket.vertices), gl.STATIC_DRAW);
			bucket.vertexBufferDirty = false;
		}

		
		// Bind point texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, bucket.texture);
				
		gl.drawArrays(gl.POINTS, 0, bucket.vertices.length/3);
	}

   // gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
}*/

/**************************************************************************************************************/

// Register the renderer
VectorRendererManager.registerRenderer({
	id: "PointSprite",
	creator: function(globe) { return new PointSpriteRenderer(globe.tileManager); },
	canApply: function(type,style) {return false; }
});

return PointSpriteRenderer;

});