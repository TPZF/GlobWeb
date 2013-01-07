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
	Function constructor for EquatorialGridLayer
 */
GlobWeb.EquatorialGridLayer = function( options )
{
	GlobWeb.BaseLayer.prototype.constructor.call( this, options );
	this.globe = null;

	// Equatorial coordinates label renderables
	this.labels = {};

	// WebGL textures
	this.texturePool = null;
	
	this.longitudeSample = options.longitudeSample || 15; // *24 = 360
	this.latitudeSample = options.latitudeSample || 10; // *18 = 180

	// Canvas for generation of equatorial coordinate labels
	this.canvas2d = document.createElement("canvas");
	this.canvas2d.width = 100;
	this.canvas2d.height = 20;

	// Grid buffers
	this.vertexBuffer = null;
	this.indexBuffer = null;
}

/**************************************************************************************************************/

GlobWeb.inherits( GlobWeb.BaseLayer,GlobWeb.EquatorialGridLayer );

/**************************************************************************************************************/

/**
 *	Generate image data from text
 *
 *	@param {String} text Text generated in canvas
 */
GlobWeb.EquatorialGridLayer.prototype.generateImageData = function(text)
{
	var ctx = this.canvas2d.getContext("2d");
	ctx.clearRect(0,0, this.canvas2d.width, this.canvas2d.height);
	ctx.fillStyle = '#fff';
	ctx.font = '18px sans-serif';
	ctx.textBaseline = 'top';
	ctx.textAlign = 'center';
	var x = this.canvas2d.width / 2;

	ctx.fillText(text, x, 0);

	return ctx.getImageData(0,0, this.canvas2d.width,this.canvas2d.height);
}

/**************************************************************************************************************/

/** 
	Attach the layer to the globe
 */
GlobWeb.EquatorialGridLayer.prototype._attach = function( g )
{
	GlobWeb.BaseLayer.prototype._attach.call( this, g );
	
	if ( this._visible )
	{
		this.globe.tileManager.addPostRenderer(this);
	}

	if (!this.gridProgram)
	{
		var vertexShader = "\
		attribute vec3 vertex;\n\
		uniform mat4 viewProjectionMatrix;\n\
		void main(void) \n\
		{\n\
			gl_Position = viewProjectionMatrix * vec4(vertex, 1.0);\n\
		}\n\
		";

		var fragmentShader = "\
		precision highp float; \n\
		uniform float alpha; \n\
		void main(void)\n\
		{\n\
			gl_FragColor = vec4(1.0,1.0,1.0,alpha);\n\
		}\n\
		";
		
		var vertexTextShader = "\
		attribute vec3 vertex; // vertex have z = 0, spans in x,y from -0.5 to 0.5 \n\
		uniform mat4 viewProjectionMatrix; \n\
		uniform vec3 poiPosition; // world position \n\
		uniform vec2 poiScale; // x,y scale \n\
		\n\
		varying vec2 texCoord; \n\
		\n\
		void main(void)  \n\
		{ \n\
			// Generate texture coordinates, input vertex goes from -0.5 to 0.5 (on x,y) \n\
			texCoord = vertex.xy + vec2(0.5); \n\
			// Invert y \n\
			texCoord.y = 1.0 - texCoord.y; \n\
			\n\
			// Compute poi position in clip coordinate \n\
			gl_Position = viewProjectionMatrix * vec4(poiPosition, 1.0); \n\
			gl_Position.xy += vertex.xy * gl_Position.w * poiScale; \n\
		} \n\
		";
	
		var fragmentTextShader = "\
		#ifdef GL_ES \n\
		precision highp float; \n\
		#endif \n\
		\n\
		varying vec2 texCoord; \n\
		uniform sampler2D texture; \n\
		uniform float alpha; \n\
		\n\
		void main(void) \n\
		{ \n\
			vec4 textureColor = texture2D(texture, texCoord); \n\
			gl_FragColor = vec4(textureColor.rgb, textureColor.a * alpha); \n\
		} \n\
		";
		
		this.gridProgram = new GlobWeb.Program(this.globe.renderContext);
		this.textProgram = new GlobWeb.Program(this.globe.renderContext);
		this.gridProgram.createFromSource( vertexShader, fragmentShader );
		this.textProgram.createFromSource( vertexTextShader, fragmentTextShader );
	}
	
	// Texture used to show the equatorial coordinates
	this.textMesh = new GlobWeb.Mesh(this.globe.renderContext);
	var vertices = [-0.5, -0.5, 0.0,
			-0.5,  0.5, 0.0,
			0.5,  0.5, 0.0,
			0.5, -0.5, 0.0];
	var indices = [0, 3, 1, 1, 3, 2];
	this.textMesh.setVertices(vertices);
	this.textMesh.setIndices(indices);

	// Init grid buffers	
	var gl = this.globe.renderContext.gl;
	this.vertexBuffer = gl.createBuffer();
	this.indexBuffer = gl.createBuffer();

	// Init texture pool
	if ( !this.texturePool )
		this.texturePool = new GlobWeb.EquatorialGridLayer.TexturePool(gl);
}

/**************************************************************************************************************/

/** 
	Detach the layer from the globe
 */
GlobWeb.EquatorialGridLayer.prototype._detach = function()
{
	var gl = this.globe.renderContext.gl;
	gl.deleteBuffer( this.vertexBuffer );
	gl.deleteBuffer( this.indexBuffer );

	this.texturePool.disposeAll();
	for ( var i in this.labels )
	{
		delete this.labels[i];
	}

	this.globe.tileManager.removePostRenderer(this);
	GlobWeb.BaseLayer.prototype._detach.call(this);

}

/**************************************************************************************************************/

/**
	Render the grid
 */
GlobWeb.EquatorialGridLayer.prototype.render = function( tiles )
{
	var renderContext = this.globe.renderContext;
	var gl = renderContext.gl;
	
	gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendEquation(gl.FUNC_ADD);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	/*** Render grid ***/
	var geoBound = this.globe.getViewportGeoBound();
	this.computeSamples(geoBound)
	this.generateGridBuffers(geoBound);
	
	this.gridProgram.apply();
	mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, renderContext.modelViewMatrix)
	gl.uniformMatrix4fv(this.gridProgram.uniforms["viewProjectionMatrix"], false, renderContext.modelViewMatrix);
	gl.uniform1f(this.gridProgram.uniforms["alpha"], this._opacity );
	
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.vertexAttribPointer(this.gridProgram.attributes['vertex'], this.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
	
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	gl.drawElements( gl.LINES, this.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	
	/*** Render label ***/
	this.generateText(geoBound);
	this.textProgram.apply();
	
	mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, renderContext.modelViewMatrix)
	gl.uniformMatrix4fv(this.textProgram.uniforms["viewProjectionMatrix"], false, renderContext.modelViewMatrix);
	gl.uniform1i(this.textProgram.uniforms["texture"], 0);
	
	var pixelSizeVector = renderContext.computePixelSizeVector();
	// for ( var n = 0; n < this.labels.length; n++ )
	for ( var n in this.labels )
	{
		var label = this.labels[n];
		// Bind point texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, label.texture);

		// 2.0 * because normalized device coordinates goes from -1 to 1
		var scale = [2.0 * label.textureWidth / renderContext.canvas.width,
					 2.0 * label.textureHeight / renderContext.canvas.height];
					 
		gl.uniform2fv(this.textProgram.uniforms["poiScale"], scale);
		// gl.uniform2fv(this.textProgram.uniforms["tst"], [ 0.5 / (label.textureWidth), 0.5 / (label.textureHeight)  ]);
		
		// Poi culling
		var worldPoi = label.pos3d;
		var poiVec = label.vertical;
		scale = label.textureHeight * ( pixelSizeVector[0] * worldPoi[0] + pixelSizeVector[1] * worldPoi[1] + pixelSizeVector[2] * worldPoi[2] + pixelSizeVector[3] );

		var x = poiVec[0] * scale + worldPoi[0];
		var y = poiVec[1] * scale + worldPoi[1];
		var z = poiVec[2] * scale + worldPoi[2];
			
		gl.uniform3f(this.textProgram.uniforms["poiPosition"], x, y, z);
		gl.uniform1f(this.textProgram.uniforms["alpha"], 1.);
			
		this.textMesh.render(this.textProgram.attributes);
		label.needed = false;	
	}
	gl.enable(gl.DEPTH_TEST);
	gl.disable(gl.BLEND);
}

/**************************************************************************************************************/

/**
 * 	Set visibility of the layer
 */
GlobWeb.EquatorialGridLayer.prototype.visible = function( arg )
{
	if ( typeof arg == "boolean" && this._visible != arg )
	{
		this._visible = arg;
		
		if ( arg )
		{
			this.globe.tileManager.addPostRenderer(this);
		}
		else
		{
			this.globe.tileManager.removePostRenderer(this);
		}
	}
	
	return this._visible;
}

/**************************************************************************************************************/

/**
 * 	Set opacity of the layer
 */
GlobWeb.EquatorialGridLayer.prototype.opacity = function( arg )
{
	return GlobWeb.BaseLayer.prototype.opacity.call( this, arg );
}

/**************************************************************************************************************/

/**
 * 	Compute samples depending on geoBound
 */
GlobWeb.EquatorialGridLayer.prototype.computeSamples = function(geoBound)
{
	var dlong = geoBound.east - geoBound.west;
	var dlat = geoBound.north - geoBound.south;
	
	// if under-sampled and not divergent
	if ( dlong / this.longitudeSample < 3. && this.longitudeSample > 1. )
	{
		this.longitudeSample /= 2;
		this.latitudeSample /= 2;
	}
	
	// if over-sampled and not exceed the initial value
	if ( dlong / this.longitudeSample > 7. && this.longitudeSample < 15. )
	{
		this.longitudeSample *= 2;
		this.latitudeSample *= 2;
	}
}

/**************************************************************************************************************/

/**
 * 	Generate buffers object of the grid
 */
GlobWeb.EquatorialGridLayer.prototype.generateGridBuffers = function(geoBound)
{
	// Clamp min/max longitudes to sample
	var west = (Math.floor(geoBound.west / this.longitudeSample))*this.longitudeSample;
	var east = (Math.ceil(geoBound.east / this.longitudeSample))*this.longitudeSample;

	var phiStart = Math.min( west, east );
	var phiStop = Math.max( west, east );
	
	// Difference is larger than hemisphere
	if ( (east - west) > 180. )
	{
		// pole in the viewport
		phiStart = 0;
		phiStop = 360;
	}
	else
	{
		phiStart = west;
		phiStop = east;
	}


	// TODO adaptative generation of theta value
	// for (var theta = geoBound.south; theta <= geoBound.north; theta+=latStep) {

	var vertexPositionData = [];
	var latitudeBands = 180. / this.latitudeSample;

	for ( var latNumber = 0; latNumber <= latitudeBands; latNumber++ )
	{
		var theta = latNumber * Math.PI / latitudeBands;
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);
		
		for ( var phi = phiStart; phi <= phiStop ; phi+=this.longitudeSample )
		{
			var radPhi = phi * Math.PI / 180;
			
			var sinPhi = Math.sin(radPhi);
			var cosPhi = Math.cos(radPhi);
			
			// z is the up vector
			var x = cosPhi * sinTheta;
			var y = sinPhi * sinTheta;
			var z = cosTheta;

			vertexPositionData.push(x);
			vertexPositionData.push(y);
			vertexPositionData.push(z);
		}
	}

	var gl = this.globe.renderContext.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
	this.vertexBuffer.itemSize = 3;
	this.vertexBuffer.numItems = vertexPositionData.length/3;

	
	var indexData = [];
	var longitudeBands = (phiStop - phiStart)/this.longitudeSample + 1;

	for ( var latNumber = 0; latNumber < latitudeBands; latNumber++ )
	{
		for ( var phi = phiStart, longNumber = 0; phi < phiStop ; phi+=this.longitudeSample, longNumber++ )
		{
			var first = (latNumber * (longitudeBands)) + longNumber % (longitudeBands - 1);
			var second = first + longitudeBands;
			indexData.push(first);
			indexData.push(first + 1);
			
			indexData.push(first + 1);
			indexData.push(second + 1);
			
			indexData.push(second + 1);
			indexData.push(second);
			
			indexData.push(second);
			indexData.push(first);
		}
	}

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
	this.indexBuffer.itemSize = 1;
	this.indexBuffer.numItems = indexData.length;
}

/**************************************************************************************************************/

/**
 * 	Generate text of the grid
 */
GlobWeb.EquatorialGridLayer.prototype.generateText = function(geoBound)
{
	// Clamp min/max longitudes to sample
	var west = (Math.floor(geoBound.west / this.longitudeSample))*this.longitudeSample;
	var east = (Math.ceil(geoBound.east / this.longitudeSample))*this.longitudeSample;

	phiStart = Math.min( west, east );
	phiStop = Math.max( west, east );
	
	// Difference is larger than hemisphere
	if ( (east - west) > 180. )
	{
		// pole in the viewport => generate all longitude bands
// 		phiStart = east - 360;
// 		phiStop = west;
		phiStart = 0;
		phiStop = 360;
	}
	else
	{
		phiStart = west;
		phiStop = east;
	}

	// Compute geographic position of center of canvas
	var posX3d = this.globe.renderContext.get3DFromPixel( this.globe.renderContext.canvas.width / 2. , this.globe.renderContext.canvas.height / 2. );
	var posXgeo = [];
	GlobWeb.CoordinateSystem.from3DToGeo( posX3d, posXgeo );

	for ( var phi = phiStart; phi <= phiStop; phi+=this.longitudeSample )
	{
		// convert to RA [0..360]
		var RA = (phi < 0) ? phi+360 : phi;
		var stringRA = GlobWeb.CoordinateSystem.fromDegreesToHMS( RA );

		if ( !this.labels[stringRA] )
		{
			this.labels[stringRA] = {};
			var imageData = this.generateImageData( stringRA );
			this._buildTextureFromImage(this.labels[stringRA],imageData);
		}
		
		// Compute position of label
		var posGeo = [ phi, posXgeo[1] ];
		var pos3d = GlobWeb.CoordinateSystem.fromGeoTo3D( posGeo );
		var vertical = vec3.create();
		vec3.normalize(pos3d, vertical);
		
		this.labels[stringRA].pos3d = pos3d;
		this.labels[stringRA].vertical = vertical;
		this.labels[stringRA].needed = true;
	}
	
	// TODO <!> Adaptative rendering isn't totally implemented for theta due to difficulty to compute extrem latitude using geoBound <!>
	var north = (Math.ceil(geoBound.north / this.latitudeSample))*this.latitudeSample;
	var south = (Math.floor(geoBound.south / this.latitudeSample))*this.latitudeSample;
	
	thetaStart = Math.min( north, south );
	thetaStop = Math.max( north, south );
	
	for ( var theta = thetaStart; theta <= thetaStop; theta+=this.latitudeSample )
	{
// 	for (var theta = -90; theta < 90; theta+=this.latitudeSample) {

		var stringTheta = GlobWeb.CoordinateSystem.fromDegreesToDMS( theta );
		if ( !this.labels[stringTheta] )
		{
			this.labels[stringTheta] = {};
			var imageData = this.generateImageData( stringTheta );
			this._buildTextureFromImage(this.labels[stringTheta], imageData);
		}
		
		// Compute position of label
		var posGeo = [ posXgeo[0], theta ];
		var pos3d = GlobWeb.CoordinateSystem.fromGeoTo3D( posGeo );
		var vertical = vec3.create();
		vec3.normalize(pos3d, vertical);
		
		this.labels[stringTheta].pos3d = pos3d;
		this.labels[stringTheta].vertical = vertical;
		this.labels[stringTheta].needed = true;
	}

	// Dispose texture if not needed
	for ( var x in this.labels )
	{
		if( !this.labels[x].needed )
		{
			this.texturePool.disposeGLTexture(this.labels[x].texture);
			delete this.labels[x];
		}
	}
	
}

/**************************************************************************************************************/

/*
	Build a texture from an image and store in a renderable
 */
GlobWeb.EquatorialGridLayer.prototype._buildTextureFromImage = function(renderable,image)
{  	
	renderable.texture = this.texturePool.createGLTexture(image);
	renderable.textureWidth = image.width;
	renderable.textureHeight = image.height;
}

/**************************************************************************************************************/

/**
 *	@constructor
 *	GL Textures pool
 */
GlobWeb.EquatorialGridLayer.TexturePool = function(gl)
{
	var gl = gl;
	var glTextures = [];

	/**
		Create a GL texture
	 */
	this.createGLTexture = function(image)
	{
		if ( glTextures.length > 0 )
		{
			return reuseGLTexture(image);
		}
		else
		{
			return createNewGLTexture(image);
		}
	};


	/**
	 	Dispose a GL texture
	 */
	this.disposeGLTexture = function( texture )
	{
		glTextures.push(texture);
	}

	this.disposeAll = function()
	{
		for ( var i=0; i<glTextures.length; i++ )
		{
			gl.deleteTexture(glTextures[i]);
		}
		glTextures.length = 0;
	}

	/** 
		Create a non power of two texture from an image
	*/
	var createNewGLTexture = function(image)
	{	
		var tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return tex;
	}


	/**
		Reuse a GL texture
	 */
	var reuseGLTexture = function(image)
	{
		var glTexture = glTextures.pop();
		gl.bindTexture(gl.TEXTURE_2D, glTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);	
		return glTexture;
	}

}