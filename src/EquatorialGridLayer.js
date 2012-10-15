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
GlobWeb.EquatorialGridLayer = function( options )
{
	GlobWeb.BaseLayer.prototype.constructor.call( this, options );
	this.globe = null;
	this.mesh = null;
	this.texts = [];
	
	this.longitudeSample = 15; // *24 = 360
	this.latitudeSample = 10; // *18 = 180
}

/**************************************************************************************************************/

GlobWeb.inherits( GlobWeb.BaseLayer,GlobWeb.EquatorialGridLayer );

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

	if (!this.program)
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
		
		this.program = new GlobWeb.Program(this.globe.renderContext);
		this.textProgram = new GlobWeb.Program(this.globe.renderContext);
		this.program.createFromSource( vertexShader, fragmentShader );
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
	
	this.generateMesh();
}

/**************************************************************************************************************/

/** 
	Detach the layer from the globe
 */
GlobWeb.EquatorialGridLayer.prototype._detach = function( g )
{
	this.globe.tileManager.removePostRenderer(this);
	GlobWeb.BaseLayer.prototype._detach.call( this, g );
}

/**************************************************************************************************************/

/**
	Render the grid
 */
GlobWeb.EquatorialGridLayer.prototype.render = function( tiles )
{
	var renderContext = this.globe.renderContext;
	var gl = renderContext.gl;
	
	/*** Render grid ***/
	gl.disable(gl.DEPTH_TEST);
	
	gl.enable(gl.BLEND);
	gl.blendEquation(gl.FUNC_ADD);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	
	var geoBound = this.globe.getViewportGeoBound();
	this.needToBeComputed(geoBound)
	this.generateMesh();
	
	this.program.apply();
	
	// The shader only needs the viewProjection matrix, use GlobWeb.modelViewMatrix as a temporary storage
	mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, renderContext.modelViewMatrix)
	gl.uniformMatrix4fv(this.program.uniforms["viewProjectionMatrix"], false, renderContext.modelViewMatrix);
	gl.uniform1f(this.program.uniforms["alpha"], this._opacity );
	
	this.mesh.render(this.program.attributes);
	
	
	/*** Render text ***/
	
	this.generateText(geoBound);
	
	this.textProgram.apply();
	
	// The shader only needs the viewProjection matrix, use GlobWeb.modelViewMatrix as a temporary storage
	mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, renderContext.modelViewMatrix)
	gl.uniformMatrix4fv(this.textProgram.uniforms["viewProjectionMatrix"], false, renderContext.modelViewMatrix);
	gl.uniform1i(this.textProgram.uniforms["texture"], 0);
	
	var pixelSizeVector = renderContext.computePixelSizeVector();
	for ( var n = 0; n < this.texts.length; n++ )
	{
		var text = this.texts[n];
		// Bind point texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, text.texture.texture);

		// 2.0 * because normalized device coordinates goes from -1 to 1
		var scale = [2.0 * text.texture.textureWidth / renderContext.canvas.width,
					 2.0 * text.texture.textureHeight / renderContext.canvas.height];
					 
		gl.uniform2fv(this.textProgram.uniforms["poiScale"], scale);
		gl.uniform2fv(this.textProgram.uniforms["tst"], [ 0.5 / (text.texture.textureWidth), 0.5 / (text.texture.textureHeight)  ]);
		
		// Poi culling
		var worldPoi = text.pos3d;
		var poiVec = text.vertical;
		scale = text.texture.textureHeight * ( pixelSizeVector[0] * worldPoi[0] + pixelSizeVector[1] * worldPoi[1] + pixelSizeVector[2] * worldPoi[2] + pixelSizeVector[3] );

		var x = poiVec[0] * scale + worldPoi[0];
		var y = poiVec[1] * scale + worldPoi[1];
		var z = poiVec[2] * scale + worldPoi[2];
			
		gl.uniform3f(this.textProgram.uniforms["poiPosition"], x, y, z);
		gl.uniform1f(this.textProgram.uniforms["alpha"], 1.);
			
		this.textMesh.render(this.textProgram.attributes);
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
		
		if ( arg ){
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
 * 	Test if the grid needs to be computed
 */
GlobWeb.EquatorialGridLayer.prototype.needToBeComputed = function(geoBound)
{
	var dlong = geoBound.east - geoBound.west;
	var dlat = geoBound.north - geoBound.south;
	var rep = false;
	
	// if under-sampled and not divergent
	if ( dlong / this.longitudeSample < 3. && this.longitudeSample > 1. )
	{
		this.longitudeSample /= 2;
		this.latitudeSample /= 2;
		rep = true;
	}
	
	// if over-sampled and not exceed the initial value
	if ( dlong / this.longitudeSample > 7. && this.longitudeSample < 15. )
	{
		this.longitudeSample *= 2;
		this.latitudeSample *= 2;
		rep = true;
	}
	
	return rep;
}

/**************************************************************************************************************/

/**
 * 	Generate mesh object of the grid
 */
GlobWeb.EquatorialGridLayer.prototype.generateMesh = function()
{
	var rc = this.globe.tileManager.renderContext;
	var geoBound = this.globe.getViewportGeoBound();
	
	// Adaptative rendering... not implemented yet
	//  TODO calculate bands mathematically
// 	var latitudeBands = Math.floor((geoBound.north - geoBound.south)/this.latitudeSample);
// 	var longitudeBandsBis = Math.floor((geoBound.east - geoBound.west)/this.longitudeSample);
	
	var latitudeBands = 180. / this.latitudeSample;
// 	var longitudeBands = 360. / this.longitudeSample;
	longitudeBands = 0;

	var latStep = this.latitudeSample * Math.PI / 180;
	var longStep = this.longitudeSample * Math.PI / 180;
	
	var west = (Math.floor(geoBound.west / this.longitudeSample))*this.longitudeSample;
	var east = (Math.ceil(geoBound.east / this.longitudeSample))*this.longitudeSample;

	// Adaptative rendering... not implemented yet
	phiStart = Math.min( west, east );
	phiStop = Math.max( west, east );
	
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
	
	var vertexPositionData = [];
	// TODO adaptative generation
	for (var latNumber = 0; latNumber <= latitudeBands; latNumber++) {
		
// 	for (var theta = geoBound.south; theta <= geoBound.north; theta+=latStep) {
		var theta = latNumber * Math.PI / latitudeBands;
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);
		
		longitudeBands = 0;
		for (var phi = phiStart; phi <= phiStop ; phi+=this.longitudeSample) {
// 		for (var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
// 		for (var phi = geoBound.west; phi <= geoBound.east; phi+=longStep) {
// 			var phi = longNumber * 2 * Math.PI / longitudeBands;
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
			
			longitudeBands++;
		}
	}
	
	var indexData = [];
	var longNumber = 0;
	for (var latNumber = 0; latNumber < latitudeBands; latNumber++) {
// 		for (var longNumber = 0; longNumber < longitudeBands; longNumber++) {
		for (var phi = phiStart; phi < phiStop ; phi+=this.longitudeSample, longNumber++) {
// 			var first = (latNumber * (longitudeBands + 1)) + longNumber;
			var first = (latNumber * (longitudeBands)) + longNumber % (longitudeBands - 1);
// 			var second = first + longitudeBands + 1;
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
	
	this.mesh = new GlobWeb.Mesh(rc);
	
	this.mesh.setVertices(vertexPositionData);
	this.mesh.setIndices(indexData);
	this.mesh.mode = rc.gl.LINES;
}

/**************************************************************************************************************/

/**
 * 	Generate text of the grid
 */
GlobWeb.EquatorialGridLayer.prototype.generateText = function(geoBound)
{
	this.texts = [];
	var west = (Math.floor(geoBound.west / this.longitudeSample))*this.longitudeSample;
	var east = (Math.ceil(geoBound.east / this.longitudeSample))*this.longitudeSample;

	// Adaptative rendering... not implemented yet
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

	
	var posX3d = this.globe.renderContext.get3DFromPixel( this.globe.renderContext.canvas.width / 2. , this.globe.renderContext.canvas.height / 2. );
	var posXgeo = [];
	GlobWeb.CoordinateSystem.from3DToGeo( posX3d, posXgeo );
	
	for (var phi = phiStart; phi <= phiStop; phi+=this.longitudeSample) {
// 	for (var phi = 0; phi < 360; phi+=this.longitudeSample) {
		
		// convert to RA [0..360]
		var RA = (phi < 0) ? phi+360 : phi;
		var stringRA = GlobWeb.CoordinateSystem.fromDegreesToHMS( RA );
		var imageData = GlobWeb.Text.generateImageData( stringRA );
		var text = {};
		this._buildTextureFromImage(text,imageData);
		
		var posGeo = [ phi, posXgeo[1] ];
		var pos3d = GlobWeb.CoordinateSystem.fromGeoTo3D( posGeo );
		var vertical = vec3.create();
		vec3.normalize(pos3d, vertical);
		
		var pointRenderData = { pos3d: pos3d,
				vertical: vertical,
				texture: text
		};

		this.texts.push( pointRenderData );
	}
	
	var north = (Math.ceil(geoBound.north / this.latitudeSample))*this.latitudeSample;
	var south = (Math.floor(geoBound.south / this.latitudeSample))*this.latitudeSample;
	
	// Adaptative rendering... not implemented yet
	thetaStart = Math.min( north, south );
	thetaStop = Math.max( north, south );
	
	for (var theta = thetaStart; theta <= thetaStop; theta+=this.latitudeSample) {
// 	for (var theta = -90; theta < 90; theta+=this.latitudeSample) {
		var posGeo = [ posXgeo[0], theta ];
		
		var posEquat = [];
		var stringTheta = GlobWeb.CoordinateSystem.fromDegreesToDMS( theta );
		var imageData = GlobWeb.Text.generateImageData( stringTheta );
		
		var text = {};
		this._buildTextureFromImage(text,imageData);
		
		var pos3d = GlobWeb.CoordinateSystem.fromGeoTo3D( posGeo );
		var vertical = vec3.create();
		vec3.normalize(pos3d, vertical);
		
		var pointRenderData = { pos3d: pos3d,
				vertical: vertical,
				texture: text
		};

		this.texts.push( pointRenderData );
	}
	
	
	
}

/**************************************************************************************************************/

/*
	Build a texture from an image and store in a bucket
 */
GlobWeb.EquatorialGridLayer.prototype._buildTextureFromImage = function(bucket,image)
{  	
	bucket.texture = this.globe.renderContext.createNonPowerOfTwoTextureFromImage(image);
	bucket.textureWidth = image.width;
	bucket.textureHeight = image.height;
}