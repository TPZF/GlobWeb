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

 define( ['./Utils','./VectorRenderer','./VectorRendererManager','./FeatureStyle','./Program'], 
	function(Utils,VectorRenderer,VectorRendererManager,FeatureStyle,Program) {

/**************************************************************************************************************/

/** @constructor
	Basic module to generate texture from text
 */	
var Text = (function()
{
	var fontSize = 18;
	var margin = 1;
	var canvas2d = null;
	
	var initialize = function()
	{
		canvas2d = document.createElement("canvas");
		canvas2d.width = 512;
		canvas2d.height = fontSize  + 2 * margin;
	}
	
	var generateImageData = function(text, textColor)
	{
		if (!canvas2d)
			initialize();
		
		var fillColor = textColor;
		if (!fillColor)
			fillColor = '#fff';
		else if ( fillColor instanceof Array )
			fillColor = FeatureStyle.fromColorToString(textColor);
		
		var ctx = canvas2d.getContext("2d");
		ctx.clearRect(0,0,canvas2d.width,canvas2d.height);
		ctx.fillStyle = fillColor;
		ctx.font = fontSize + 'px sans-serif';
		ctx.textBaseline = 'top';
		ctx.shadowColor = '#000';
		ctx.shadowOffsetX = 1;
		ctx.shadowOffsetY = 1;
		ctx.shadowBlur = 2;
		ctx.fillText(text, margin, margin);
		//ctx.lineWidth = 1.0;
		//ctx.strokeText(text, margin, margin);
		
		var metrics = ctx.measureText(text);
		return ctx.getImageData(0,0, Math.floor(metrics.width)+2*margin,canvas2d.height)
	}
	
	
	return { generateImageData: generateImageData };
})();

/**************************************************************************************************************/

/** @constructor
	POI Renderer constructor
 */
var PointRenderer = function(globe)
{
	VectorRenderer.prototype.constructor.call( this, globe );

	// Store object for rendering
	this.renderContext = globe.tileManager.renderContext;
	this.tileConfig = globe.tileManager.tileConfig;
	
	// For stats
	this.numberOfRenderPoints = 0;
 	
	var vertexShader = "\
	attribute vec3 vertex; // vertex have z = 0, spans in x,y from -0.5 to 0.5 \n\
	uniform mat4 viewProjectionMatrix; \n\
	uniform vec3 poiPosition; // world position \n\
	uniform vec2 poiScale; // x,y scale \n\
	uniform vec2 tst; \n\
	\n\
	varying vec2 texCoord; \n\
	\n\
	void main(void)  \n\
	{ \n\
		// Generate texture coordinates, input vertex goes from -0.5 to 0.5 (on x,y) \n\
		texCoord = vertex.xy + vec2(0.5) + tst; \n\
		// Invert y \n\
		texCoord.y = 1.0 - texCoord.y; \n\
		\n\
		// Compute poi position in clip coordinate \n\
		gl_Position = viewProjectionMatrix * vec4(poiPosition, 1.0); \n\
		gl_Position.xy += vertex.xy * gl_Position.w * poiScale; \n\
	} \n\
	";
	
	var fragmentShader = "\
	precision lowp float; \n\
	varying vec2 texCoord; \n\
	uniform sampler2D texture; \n\
	uniform float alpha; \n\
	uniform vec3 color; \n\
	\n\
	void main(void) \n\
	{ \n\
		vec4 textureColor = texture2D(texture, texCoord); \n\
		gl_FragColor = vec4(textureColor.rgb * color, textureColor.a * alpha); \n\
		if (gl_FragColor.a <= 0.0) discard; \n\
	} \n\
	";

    this.program = new Program(this.renderContext);
    this.program.createFromSource(vertexShader, fragmentShader);

	var vertices = new Float32Array([-0.5, -0.5, 0.0,
                     0.5,  -0.5, 0.0,
                     0.5,  0.5, 0.0,
                     -0.5, 0.5, 0.0]);
					 
	var gl = this.renderContext.gl;
	this.vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

	this.defaultTexture = null;
}

Utils.inherits(VectorRenderer,PointRenderer);

/**************************************************************************************************************/

/*
	Build a default texture
 */
PointRenderer.prototype._buildDefaultTexture = function(bucket)
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
PointRenderer.prototype._buildTextureFromImage = function(bucket,image)
{  	
	bucket.texture = this.renderContext.createNonPowerOfTwoTextureFromImage(image);
	bucket.textureWidth = image.width;
	bucket.textureHeight = image.height;
}

/**************************************************************************************************************/

/**
 * Renderable constructor for Point
 */
var PointRenderable = function(bucket) 
{
	this.bucket = bucket;
	this.points = [];
}

/**************************************************************************************************************/

/**
 * Add a geometry to the renderable
 * @return if the geometry has been successfully added to the renderable
 */
PointRenderable.prototype.add = function(geometry)
{
	var posGeo = geometry['coordinates'];
	// TODO: Find a better way to access to coordinate system
	var pos3d = this.bucket.layer.globe.coordinateSystem.fromGeoTo3D( posGeo );
	var vertical = vec3.create();
	vec3.normalize(pos3d, vertical);

	this.points.push({
		pos3d: pos3d,
		vertical: vertical,
		geometry: geometry
	});
	
	// Always add the geometry
	return true;
}

/**************************************************************************************************************/

/**
 * Remove a geometry from the renderable
 */
PointRenderable.prototype.remove = function(geometry)
{
	for ( var j = 0; j < this.points.length; j++ )
	{
		if ( this.points[j].geometry == geometry )
		{
			this.points.splice( j, 1 );
			return this.points.length;
		}
	}
	return this.points.length;
}

/**************************************************************************************************************/

/**
 * Dispose the renderable
 */
PointRenderable.prototype.dispose = function(renderContext)
{
	// Nothing to do
}


/**************************************************************************************************************/

/**
	Bucket constructor for PointRenderer
 */
var PointBucket = function(layer,style)
{
	this.layer = layer;
	this.style = new FeatureStyle(style);
	this.renderer = null;
	this.texture = null;
}

/**************************************************************************************************************/

/**
	Create a renderable for this bucket
 */
PointBucket.prototype.createRenderable = function()
{
	return new PointRenderable(this);
}

/**************************************************************************************************************/

/**
	Check if a bucket is compatible
 */
PointBucket.prototype.isCompatible = function(style)
{
	return this.style.iconUrl == style.iconUrl
		&& this.style.icon == style.icon
		&& this.style.label == style.label;
}

/**************************************************************************************************************/

/**
	Create bucket to render a point
 */
PointRenderer.prototype.createBucket = function(layer,style)
{
	// Create a bucket
	var bucket = new PointBucket(layer,style);
	
	// Initialize bucket : create the texture	
	if ( style['label'] )
	{
		var imageData = Text.generateImageData(style['label'], style['textColor']);
		this._buildTextureFromImage(bucket,imageData);
	}
	else if ( style['iconUrl'] )
	{
		var image = new Image();
		image.crossOrigin = '';
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
		
	return bucket;
}

/**************************************************************************************************************/

/*
	Render all the POIs
 */
PointRenderer.prototype.render = function(renderables,start,end)
{
	this.numberOfRenderPoints = 0;
	
	var renderContext = this.renderContext;
	var gl = this.renderContext.gl;
	
	// Setup states
	// gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendEquation(gl.FUNC_ADD);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	// Setup program
	this.program.apply();
	
	// The shader only needs the viewProjection matrix, use modelViewMatrix as a temporary storage
	mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, renderContext.modelViewMatrix)
	gl.uniformMatrix4fv(this.program.uniforms["viewProjectionMatrix"], false, renderContext.modelViewMatrix);
	gl.uniform1i(this.program.uniforms["texture"], 0);

	// Compute eye direction from inverse view matrix
	mat4.inverse(renderContext.viewMatrix, renderContext.modelViewMatrix);
	var camZ = [renderContext.modelViewMatrix[8], renderContext.modelViewMatrix[9], renderContext.modelViewMatrix[10]];
	vec3.normalize(camZ);
	vec3.scale(camZ, this.tileConfig.cullSign, camZ);
	
	// Compute pixel size vector to offset the points from the earth
	var pixelSizeVector = renderContext.computePixelSizeVector();
	
	// Warning : use quoted strings to access properties of the attributes, to work correclty in advanced mode with closure compiler
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.vertexAttribPointer(this.program.attributes['vertex'], 3, gl.FLOAT, false, 0, 0);

	var currentBucket = null;
	for ( var n = start; n < end; n++ )
	{
		var renderable = renderables[n];
		var bucket = renderable.bucket;
		
		if ( renderable.points.length == 0 )
			continue;
			
		if ( bucket != currentBucket )
		{
			// Bind point texture
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, bucket.texture);

			// 2.0 * because normalized device coordinates goes from -1 to 1
			var scale = [2.0 * bucket.textureWidth / renderContext.canvas.width,
						 2.0 * bucket.textureHeight / renderContext.canvas.height];
			gl.uniform2fv(this.program.uniforms["poiScale"], scale);
			gl.uniform2fv(this.program.uniforms["tst"], [ 0.5 / (bucket.textureWidth), 0.5 / (bucket.textureHeight)  ]);
		}
		
		for ( var i = 0; i < renderable.points.length; i++ )
		{	
			// Poi culling
			var worldPoi = renderable.points[i].pos3d;
			var poiVec = renderable.points[i].vertical;
			var scale = bucket.textureHeight * ( pixelSizeVector[0] * worldPoi[0] + pixelSizeVector[1] * worldPoi[1] + pixelSizeVector[2] * worldPoi[2] + pixelSizeVector[3] );
			scale *= this.tileConfig.cullSign;
			var scaleInKm = (scale / this.globe.coordinateSystem.heightScale) * 0.001;
			if ( scaleInKm > bucket.style.pointMaxSize )
				continue;
				
			if ( vec3.dot(poiVec, camZ) > 0 
				&& renderContext.worldFrustum.containsSphere(worldPoi,scale) >= 0 )
			{
				var x = poiVec[0] * scale + worldPoi[0];
				var y = poiVec[1] * scale + worldPoi[1];
				var z = poiVec[2] * scale + worldPoi[2];
				
				gl.uniform3f(this.program.uniforms["poiPosition"], x, y, z);
				gl.uniform1f(this.program.uniforms["alpha"], bucket.layer._opacity);
				var color = bucket.style.fillColor;
				gl.uniform3f(this.program.uniforms["color"], color[0], color[1], color[2] );
				
				gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
				
				this.numberOfRenderPoints++;
			}
		}
	}

//    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
}

/**************************************************************************************************************/

/**
 * Check if renderer is applicable
 */
PointRenderer.prototype.canApply = function(type,style)
{
	return type == "Point";
}

/**************************************************************************************************************/

// Register the renderer
VectorRendererManager.factory.push( function(globe) { return new PointRenderer(globe); } );
									
return PointRenderer;

});
