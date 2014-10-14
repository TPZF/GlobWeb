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

define( ['./BaseLayer', './Utils', './Ray', './Program', './Mesh', './AstroCoordTransform', './FeatureStyle'],
		function(BaseLayer, Utils, Ray, Program, Mesh, AstroCoordTransform, FeatureStyle) {
 
/**************************************************************************************************************/

/** 
	@constructor
	Function constructor for CoordinateGridLayer

	@param options Options of coordinate grid layer :
		<ul>
			<li>longitudeSample : Longitude sampling</li>
			<li>latitudeSample : Latitude sampling</li>
			<li>color : Stroke color of grid</li>
			<li>coordSystem: The coordinate system which is represented by grid("EQ" or "GAL" for now)</li>
			<li>longFormat: Representation of longitude axe(HMS, DMS, Deg)</li>
			<li>latFormat: Representation of latitude axe(HMS, DMS, Deg)</li>
			<li>tesselation: Tesselation order (only for latitude bands currently)</li>
		</ul>
 */
var CoordinateGridLayer = function( options )
{
	BaseLayer.prototype.constructor.call( this, options );
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

	this.color = options.color || [1., 1., 1.];
	this.coordSystem = options.coordSystem ? options.coordSystem : "EQ";
	this.longFormat = options.longFormat ? options.longFormat : "Deg";
	this.latFormat = options.latFormat ? options.latFormat : "Deg";
	
	// Keep trace on geoBound
	this.geoBound = {};
	this.tesselation = options.tesselation || 2;
}

/**************************************************************************************************************/

Utils.inherits( BaseLayer, CoordinateGridLayer );

/**************************************************************************************************************/

/**
 *	Generate image data from text
 *
 *	@param {String} text Text generated in canvas
 */
CoordinateGridLayer.prototype.generateImageData = function(text)
{
	var ctx = this.canvas2d.getContext("2d");
	ctx.clearRect(0,0, this.canvas2d.width, this.canvas2d.height);
	ctx.fillStyle = FeatureStyle.fromColorToString(this.color);
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
CoordinateGridLayer.prototype._attach = function( g )
{
	BaseLayer.prototype._attach.call( this, g );
	
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
		uniform vec3 color; \n\
		void main(void)\n\
		{\n\
			gl_FragColor = vec4(color,alpha);\n\
		}\n\
		";
		
		var vertexLabelShader = "\
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
	
		var fragmentLabelShader = "\
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
		
		this.gridProgram = new Program(this.globe.renderContext);
		this.labelProgram = new Program(this.globe.renderContext);
		this.gridProgram.createFromSource( vertexShader, fragmentShader );
		this.labelProgram.createFromSource( vertexLabelShader, fragmentLabelShader );
	}
	
	// Texture used to show the equatorial coordinates
	this.labelMesh = new Mesh(this.globe.renderContext);
	var vertices = [-0.5, -0.5, 0.0,
			-0.5,  0.5, 0.0,
			0.5,  0.5, 0.0,
			0.5, -0.5, 0.0];
	var indices = [0, 3, 1, 1, 3, 2];
	this.labelMesh.setVertices(vertices);
	this.labelMesh.setIndices(indices);

	// Init grid buffers	
	var gl = this.globe.renderContext.gl;
	this.vertexBuffer = gl.createBuffer();
	this.indexBuffer = gl.createBuffer();

	// Init texture pool
	if ( !this.texturePool )
		this.texturePool = new TexturePool(gl);
}

/**************************************************************************************************************/

/** 
	Detach the layer from the globe
 */
CoordinateGridLayer.prototype._detach = function()
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
	BaseLayer.prototype._detach.call(this);

}

/**************************************************************************************************************/

/**
 *	Clamp geoBound to longitude/latitude samples
 */
CoordinateGridLayer.prototype.clampGeoBound = function( geoBound )
{
	geoBound.west = Math.floor(geoBound.west / this.longitudeSample)*this.longitudeSample;
	geoBound.east = Math.ceil(geoBound.east / this.longitudeSample)*this.longitudeSample;
	geoBound.north = Math.ceil(geoBound.north / this.latitudeSample)*this.latitudeSample;
	geoBound.south = Math.floor(geoBound.south / this.latitudeSample)*this.latitudeSample;
	return geoBound;
}

/**
	Render the grid
 */
CoordinateGridLayer.prototype.render = function( tiles )
{
	var renderContext = this.globe.renderContext;
	var gl = renderContext.gl;
	
	gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendEquation(gl.FUNC_ADD);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	// Compute current geoBound
	var geoBound;
	if ( this.coordSystem != 'EQ' )
	{
		// Transform geoBound computed in default coordinate system to coordinate system of current grid if different
		var self = this;
		geoBound = this.globe.getViewportGeoBound(function(coordinate) {
			return self.globe.coordinateSystem.convert(coordinate, 'EQ', self.coordSystem);
		});
	}
	else
	{
		geoBound = this.globe.getViewportGeoBound();
	}

	// Clamp geoBound angles to longitude/latitude samples
	geoBound = this.clampGeoBound(geoBound);

	// Regenerate grid & labels only if geoBound has changed
	if (this.geoBound.west != geoBound.west || this.geoBound.east != geoBound.east || this.geoBound.north != geoBound.north || this.geoBound.south != geoBound.south )
	{
		this.geoBound = geoBound;
		this.computeSamples()
		this.generateGridBuffers();
		this.generateLabels();
	}
	else
	{
		this.updateLabels();	
	}
	
	/*** Render grid ***/
	this.gridProgram.apply();
	mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, renderContext.modelViewMatrix)
	gl.uniformMatrix4fv(this.gridProgram.uniforms["viewProjectionMatrix"], false, renderContext.modelViewMatrix);
	gl.uniform1f(this.gridProgram.uniforms["alpha"], this._opacity );
	gl.uniform3f(this.gridProgram.uniforms["color"], this.color[0], this.color[1], this.color[2] );
	
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.vertexAttribPointer(this.gridProgram.attributes['vertex'], this.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
	
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	gl.drawElements( gl.LINES, this.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	
	/*** Render labels ***/
	this.labelProgram.apply();
	
	mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, renderContext.modelViewMatrix)
	gl.uniformMatrix4fv(this.labelProgram.uniforms["viewProjectionMatrix"], false, renderContext.modelViewMatrix);
	gl.uniform1i(this.labelProgram.uniforms["texture"], 0);
	
	var pixelSizeVector = renderContext.computePixelSizeVector();
	for ( var n in this.labels )
	{
		var label = this.labels[n];
		// Bind point texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, label.texture);

		// 2.0 * because normalized device coordinates goes from -1 to 1
		var scale = [2.0 * label.textureWidth / renderContext.canvas.width,
					 2.0 * label.textureHeight / renderContext.canvas.height];
					 
		gl.uniform2fv(this.labelProgram.uniforms["poiScale"], scale);
		// gl.uniform2fv(this.labelProgram.uniforms["tst"], [ 0.5 / (label.textureWidth), 0.5 / (label.textureHeight)  ]);
		
		// Poi culling
		var worldPoi = label.pos3d;
		var poiVec = label.vertical;
		scale = label.textureHeight * ( pixelSizeVector[0] * worldPoi[0] + pixelSizeVector[1] * worldPoi[1] + pixelSizeVector[2] * worldPoi[2] + pixelSizeVector[3] );

		var x = poiVec[0] * scale + worldPoi[0];
		var y = poiVec[1] * scale + worldPoi[1];
		var z = poiVec[2] * scale + worldPoi[2];
			
		gl.uniform3f(this.labelProgram.uniforms["poiPosition"], x, y, z);
		gl.uniform1f(this.labelProgram.uniforms["alpha"], 1.);
			
		this.labelMesh.render(this.labelProgram.attributes);
		label.needed = false;	
	}
	gl.enable(gl.DEPTH_TEST);
	gl.disable(gl.BLEND);
}

/**************************************************************************************************************/

/**
 * 	Get/Set visibility of the layer
 */
CoordinateGridLayer.prototype.visible = function( arg )
{
	BaseLayer.prototype.visible.call( this, arg );
	if ( typeof arg == "boolean" )
	{
		if ( this._visible ){
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
 * 	Compute samples depending on geoBound
 */
CoordinateGridLayer.prototype.computeSamples = function()
{
	var dlong = this.geoBound.east - this.geoBound.west;
	var dlat = this.geoBound.north - this.geoBound.south;
	
	// if under-sampled and not divergent
	while ( dlong / this.longitudeSample < 3. && this.longitudeSample > 1. )
	{
		this.longitudeSample /= 2;
		this.latitudeSample /= 2;
	}
	
	// if over-sampled and not exceed the initial value
	while ( dlong / this.longitudeSample > 7. && this.longitudeSample < 15. )
	{
		this.longitudeSample *= 2;
		this.latitudeSample *= 2;
	}
}

/**************************************************************************************************************/

/**
 * 	Generate buffers object of the grid
 */
CoordinateGridLayer.prototype.generateGridBuffers = function()
{
	var phiStart, phiStop;
	// Difference is larger than hemisphere
	if ( (this.geoBound.east - this.geoBound.west) > 180. )
	{
		// pole in the viewport
		phiStart = 0;
		phiStop = 360;
	}
	else
	{
		phiStart = this.geoBound.west;
		phiStop = this.geoBound.east;
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
			// Tesselation
			var step = this.longitudeSample/this.tesselation;
			for ( var i=0; i<this.tesselation; i++ ) {
				var radPhi = (phi + i*step) * Math.PI / 180;
			
				var sinPhi = Math.sin(radPhi);
				var cosPhi = Math.cos(radPhi);
				
				// z is the up vector
				var x = cosPhi * sinTheta * this.globe.coordinateSystem.radius;
				var y = sinPhi * sinTheta * this.globe.coordinateSystem.radius;
				var z = cosTheta * this.globe.coordinateSystem.radius;

				if ( this.coordSystem != "EQ" ) {
					var geo = this.globe.coordinateSystem.from3DToGeo( [x, y, z] );
					geo = this.globe.coordinateSystem.convert(geo, this.coordSystem, "EQ");
					var eq = this.globe.coordinateSystem.fromGeoTo3D( geo );
					vertexPositionData.push(eq[0], eq[1], eq[2]);				
				} else {
					vertexPositionData.push(x, y, z);
				}
			}
			
		}
	}

	var gl = this.globe.renderContext.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
	this.vertexBuffer.itemSize = 3;
	this.vertexBuffer.numItems = vertexPositionData.length/3;

	
	var indexData = [];
	var longitudeBands = (phiStop - phiStart)/this.longitudeSample + 1;

	// Tesselation
	longitudeBands *= this.tesselation;

	for ( var latNumber = 0; latNumber < latitudeBands; latNumber++ )
	{
		for ( var phi = phiStart, longNumber = 0; phi < phiStop ; phi+=this.longitudeSample, longNumber+=this.tesselation )
		{
			var first = (latNumber * (longitudeBands)) + longNumber % (longitudeBands - 1);
			var second = first + longitudeBands;

			// Horizontal lines
			for ( var i=0; i<this.tesselation; i++ ) 
			{
				indexData.push(first + i);
				indexData.push(first + i + 1);
			}
			
			// Vertical lines
			indexData.push(first + this.tesselation);
			indexData.push(second + this.tesselation);
			
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
 *	Build angle representation
 *
 *	@param {String} format The building format("HMS", "DMS" or "Deg")
 *	@param angle The angle to build
 */
 CoordinateGridLayer.prototype.buildAngle = function( format, angle ) {
 	var label;
	switch ( format ) {
		case "Deg":
			label = angle+"°";
			break;
		case "HMS":
			label = this.globe.coordinateSystem.fromDegreesToHMS( angle );
			break;
		case "DMS":
			label = this.globe.coordinateSystem.fromDegreesToDMS( angle );
			break;
		default:
			console.error(format + " : format not supported");
			return null;
	}
	return label;
 }

/**************************************************************************************************************/

/**
 *	Compute geographic center of canvas in grid's coordinate system
 */
CoordinateGridLayer.prototype.computeGeoCenter = function() {
	var ray = Ray.createFromPixel(this.globe.renderContext, this.globe.renderContext.canvas.width / 2. , this.globe.renderContext.canvas.height / 2.);
	var center3d = ray.computePoint( ray.sphereIntersect( [0,0,0], this.globe.coordinateSystem.radius ) );
	var geoCenter = [];
	this.globe.coordinateSystem.from3DToGeo( center3d, geoCenter );

	// Convert geoCenter into grid's coordinate system
	if ( this.coordSystem != "EQ" ) {
		geoCenter = this.globe.coordinateSystem.convert( geoCenter, "EQ", this.coordSystem );
	}
	return geoCenter;
}

/**************************************************************************************************************/

/**
 *	Update 3D position of given label
 *
 *	@param {String} label The label id in labels object
 *	@param {Float[]} posGeo Updated geographic position of label
 */
CoordinateGridLayer.prototype.updateLabel = function(label, posGeo) {
	if ( this.coordSystem != "EQ" ) {
		posGeo = this.globe.coordinateSystem.convert( posGeo, this.coordSystem, "EQ" );
	}

	var pos3d = this.globe.coordinateSystem.fromGeoTo3D( posGeo );
	var vertical = vec3.create();
	vec3.normalize(pos3d, vertical);
	
	this.labels[label].pos3d = pos3d;
	this.labels[label].vertical = vertical;
	this.labels[label].needed = true;
}

/**************************************************************************************************************/

/**
 *	Update position of all labels
 */
CoordinateGridLayer.prototype.updateLabels = function() {

	var geoCenter = this.computeGeoCenter();
	for ( var x in this.labels ) {
		// Compute position of label
		var posGeo;
		if ( this.labels[x].type == "lat" ) 
		{
			posGeo = [ this.labels[x].angle, geoCenter[1] ];
		}
		else if ( this.labels[x].type == "long" )
		{
			posGeo = [ geoCenter[0], this.labels[x].angle ];
		}
		this.updateLabel(x, posGeo);
	}
}

/**************************************************************************************************************/

/**
 * 	Generate labels of the grid
 */
CoordinateGridLayer.prototype.generateLabels = function()
{
	var phiStop, phiStart;
	// Difference is larger than hemisphere
	if ( (this.geoBound.east - this.geoBound.west) > 180. )
	{
		// pole in the viewport => generate all longitude bands
		phiStart = 0;
		phiStop = 360;
	}
	else
	{
		phiStart = this.geoBound.west;
		phiStop = this.geoBound.east;
	}

	var geoCenter = this.computeGeoCenter();
	var label;
	for ( var phi = phiStart; phi < phiStop; phi+=this.longitudeSample )
	{
		// convert to positive [0..360[
		var angle = (phi < 0) ? phi+360 : phi;

		label = this.buildAngle(this.longFormat, angle);

		if ( !this.labels["lat_"+label] )
		{
			this.labels["lat_"+label] = {
				angle: phi,
				type: "lat"
			};
			var imageData = this.generateImageData( label );
			this._buildTextureFromImage(this.labels["lat_"+label],imageData);
		}
		
		// Compute position of label
		var posGeo = [ phi, geoCenter[1] ];
		this.updateLabel("lat_"+label, posGeo);
	}
	
	// TODO <!> Adaptative rendering isn't totally implemented for theta due to difficulty to compute extrem latitude using geoBound <!>
	thetaStart = Math.min( this.geoBound.north, this.geoBound.south );
	thetaStop = Math.max( this.geoBound.north, this.geoBound.south );
	
	for ( var theta = thetaStart; theta <= thetaStop; theta+=this.latitudeSample )
	{
// 	for (var theta = -90; theta < 90; theta+=this.latitudeSample) {

		label = this.buildAngle(this.latFormat, theta);

		if ( !this.labels["long_"+label] )
		{
			this.labels["long_"+label] = {
				angle: theta,
				type: "long"
			};
			var imageData = this.generateImageData( label );
			this._buildTextureFromImage(this.labels["long_"+label], imageData);
		}
		
		// Compute position of label
		var posGeo = [ geoCenter[0], theta ];
		this.updateLabel("long_"+label, posGeo);
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
CoordinateGridLayer.prototype._buildTextureFromImage = function(renderable,image)
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
var TexturePool = function(gl)
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

/**************************************************************************************************************/

return CoordinateGridLayer;

});