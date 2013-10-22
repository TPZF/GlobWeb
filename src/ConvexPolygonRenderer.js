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

define(['./Utils','./VectorRenderer','./Program','./CoordinateSystem','./FeatureStyle', './VectorRendererManager'],
	function(Utils,VectorRenderer,Program,CoordinateSystem,FeatureStyle,VectorRendererManager) {

/**************************************************************************************************************/

/** @constructor
	ConvexPolygonRenderer constructor
 */
var ConvexPolygonRenderer = function(globe)
{
	VectorRenderer.prototype.constructor.call( this, globe );
	this.maxTilePerGeometry = 2;
	
	// Store object for rendering
	this.renderContext = globe.tileManager.renderContext;
	this.tileConfig = globe.tileManager.tileConfig;
	
	this.programs = [];

	this.basicVertexShader = "\
	attribute vec3 vertex;\n\
	uniform mat4 viewProjectionMatrix;\n\
	\n\
	void main(void)\n\
	{\n\
		gl_Position = viewProjectionMatrix * vec4(vertex, 1.0);\n\
	}\n\
	";
	
	this.basicFragmentShader = "\
	precision lowp float; \n\
	uniform vec4 color; \n\
	\n\
	void main(void) \n\
	{ \n\
		gl_FragColor = color; \n\
	} \n\
	";
	
	this.texVertexShader = "\
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


	this.texFragmentShader = "\
		precision lowp float; \n\
		uniform vec4 color;\n\
		varying vec2 vTextureCoord;\n\
		uniform sampler2D texture; \n\
		void main(void)\n\
		{\n\
			gl_FragColor = texture2D(texture, vTextureCoord) * color;\n\
		}\n\
		";

	this.basicFillShader = {
		vertexCode: this.basicVertexShader,
		fragmentCode: this.basicFragmentShader,
		updateUniforms: null
	};

	this.texFillShader = {
		vertexCode: this.texVertexShader,
		fragmentCode: this.texFragmentShader,
		updateUniforms: null
	};


	this.basicProgram = this.createProgram(this.basicFillShader);
	this.texProgram = this.createProgram(this.texFillShader);

	var gl = this.renderContext.gl;
	// Parameters used to implement ONE shader for color xor texture rendering
	this.whiteTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, this.whiteTexture);
	var whitePixel = new Uint8Array([255, 255, 255, 255]);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, whitePixel);

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

Utils.inherits(VectorRenderer,ConvexPolygonRenderer);

/**************************************************************************************************************/

/**
	Renderable constructor
	Attach to a bucket
 */
var Renderable = function(bucket) 
{
	this.bucket = bucket;
	this.geometry2vb = {};
	this.vertices = [];
	this.lineIndices = [];
	this.triangleIndices = [];
	this.vertexBuffer = null;
	this.lineIndexBuffer = null;
	this.triangleIndexBuffer = null;
	this.bufferDirty = false;
	this.triBufferDirty = false;
}

/**************************************************************************************************************/

/**
	Add the geometry to the renderable
 */
Renderable.prototype.add = function(geometry)
{
	var rings = [];
	if ( geometry['type'] == 'MultiPolygon' )
	{
		for ( var i=0; i<geometry['coordinates'].length; i++ )
		{
			rings.push( geometry['coordinates'][i][0] );
		}
	}
	else
	{
		rings.push( geometry['coordinates'][0] );
	}

	for ( var r=0; r<rings.length; r++ )
	{
		var coords = rings[r];
		// var coords = geometry['coordinates'][0];
		var numPoints = coords.length-1;
		
		// Store information for the geometry in the buffers used for rendering
		var data = {
			vertexStart: this.vertices.length,
			vertexCount: 3 * numPoints,
			lineIndexStart: this.lineIndices.length,
			lineIndexCount: 2 * numPoints,
			triIndexStart: 0,
			triIndexCount: 0
		};

		
		// Compute vertices and indices and store them in the buffers
		var startIndex = this.vertices.length / 3;
		for ( var i = 0; i < numPoints; i++ ) 
		{
			var pt = CoordinateSystem.fromGeoTo3D( coords[i] );
			this.vertices.push( pt[0], pt[1], pt[2] );
			this.lineIndices.push( startIndex + i, startIndex + ((i+1) % numPoints) );
		}
		
		// If fill, build the triangle indices
		if ( this.bucket.style.fill ) 
		{
			data.triIndexStart = this.triangleIndices.length;
			data.triIndexCount = 3 * (numPoints-2);
			
			for ( var i = 0; i < numPoints-2; i++ ) 
			{
				this.triangleIndices.push( startIndex, startIndex + i+1, startIndex + i+2 );
			}
		}

		if ( this.geometry2vb[ geometry.gid ] )
		{
			this.geometry2vb[ geometry.gid ].vertexCount += data.vertexCount;
			this.geometry2vb[ geometry.gid ].lineIndexCount += data.lineIndexCount;
			this.geometry2vb[ geometry.gid ].triIndexCount += data.triIndexCount;
		}
		else
		{
			this.geometry2vb[ geometry.gid ] = data;
		}
		
		this.bufferDirty = true;
		this.triBufferDirty = true;
	}
}

/**************************************************************************************************************/

/**
	Remove the geometry from the renderable
 */
Renderable.prototype.remove = function(geometry)
{
	if ( this.geometry2vb.hasOwnProperty(geometry.gid) )
	{
		// retreive the render data for the geometry
		var data = this.geometry2vb[ geometry.gid ];
		delete this.geometry2vb[ geometry.gid ];

		// Remove geometry vertex
		this.vertices.splice( data.vertexStart, data.vertexCount );
		
		// Update indices after vertex removal
		for ( var i = data.lineIndexStart+data.lineIndexCount; i < this.lineIndices.length; i++ ) 
		{
			this.lineIndices[i] -= (data.vertexCount/3);
		}
		for ( var i = data.triIndexStart+data.triIndexCount; i < this.triangleIndices.length; i++ ) 
		{
			this.triangleIndices[i] -= (data.vertexCount/3);
		}

		this.lineIndices.splice( data.lineIndexStart, data.lineIndexCount );
		this.triangleIndices.splice( data.triIndexStart, data.triIndexCount );
		
		// Update render data for all other geometries
		for ( var g in this.geometry2vb ) 
		{
			if ( g ) 
			{
				var d = this.geometry2vb[g];
				if ( d.vertexStart > data.vertexStart ) 
				{
					d.vertexStart -= data.vertexCount;
					d.lineIndexStart -= data.lineIndexCount;
					d.triIndexStart -= data.triIndexCount;
				}
			}
		}
		
		this.bufferDirty = true;
		this.triBufferDirty = true;
	}
}

/**************************************************************************************************************/

/**
	Dispose the renderable : remove all buffers
 */
Renderable.prototype.dispose = function(renderContext)
{
	if ( this.vertexBuffer ) 
	{
		renderContext.gl.deleteBuffer( this.vertexBuffer );
	}
	if ( this.lineIndexBuffer ) 
	{
		renderContext.gl.deleteBuffer( this.lineIndexBuffer );
	}
	if ( this.triangleIndexBuffer ) 
	{
		renderContext.gl.deleteBuffer( this.triangleIndexBuffer );
	}
}

/**************************************************************************************************************/

/**
	Check if renderer is applicable
 */
ConvexPolygonRenderer.prototype.canApply = function(type,style)
{
	return type == "Polygon" || type == "MultiPolygon" || type == "LineString" || type == "MultiLineString"; 
}

/**************************************************************************************************************/

/**
 	Create program from fillShader object	
 */
ConvexPolygonRenderer.prototype.createProgram = function(fillShader)
{
	var program = new Program(this.renderContext);
	program.createFromSource(fillShader.vertexCode, fillShader.fragmentCode);
	
    // Add program
    program.id = this.programs.length;
    this.programs.push({ 
    	fillShader: fillShader,
    	program: program,
    	renderables: []
	});
	return program;
}

/**************************************************************************************************************/

/**
 	Get program if known by renderer, create otherwise
 */
ConvexPolygonRenderer.prototype.getProgram = function(fillShader) {

	var program;

    for(var id=0; id<this.programs.length; id++)
    {
        if( this.programs[id].fillShader == fillShader )
        {
        	program = this.programs[id].program;
        }
    }

    if ( !program )
    {
    	program = this.createProgram(fillShader);
    }
    return program;
}

/**************************************************************************************************************/

/**
	Bucket constructor for ConvexPolygonRenderer
 */
var Bucket = function(layer,style)
{
	this.layer = layer;
	this.style = new FeatureStyle(style);
	this.texture = null;
	this.polygonProgram = null;
	this.renderer = null;
	this.mainRenderable = null;
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
	if ( this.style.strokeColor[0] == style.strokeColor[0]
		&& this.style.strokeColor[1] == style.strokeColor[1]
		&& this.style.strokeColor[2] == style.strokeColor[2]
		&& this.style.fill == style.fill
		&& this.style.fillTexture == style.fillTexture
		&& this.style.fillTextureUrl == style.fillTextureUrl
		&& this.style.fillShader == style.fillShader )
	{
		return true;
	}
	
	return false;
}

/**************************************************************************************************************/

/**
	Create bucket to render a polygon
 */
ConvexPolygonRenderer.prototype.createBucket = function(layer,style)
{
	var gl = this.renderContext.gl;
	var vb = gl.createBuffer();

	// Create a bucket
	var bucket = new Bucket(layer,style);
	bucket.renderer = this;

	// Create texture
	var self = this;
	if ( style.fill )
	{
		var hasTexture = false;
		if ( style.fillTextureUrl )
		{
			var image = new Image();
			image.crossOrigin = '';
			image.onload = function () 
			{
				bucket.texture = self.renderContext.createNonPowerOfTwoTextureFromImage(image, layer.invertY);
			}
			
			image.onerror = function(event)
			{
				console.log("Cannot load " + image.src );
			}
			
			image.src = style.fillTextureUrl;
			hasTexture = true;
		}
		else if ( style.fillTexture )
		{
			bucket.texture = style.fillTexture;
			hasTexture = true;
		}
			
		if ( style.fillShader&& style.fillShader.fragmentCode )
		{
			// User defined texture program
			if ( !style.fillShader.vertexCode )
				style.fillShader.vertexCode = this.texVertexShader;
			if ( !style.fillShader.vertexCode )
				style.fillShader.fragmentCode = this.texFragmentShader;

			bucket.polygonProgram = this.getProgram(style.fillShader);
		}
		else
		{
			// Default program
			bucket.polygonProgram = hasTexture ? this.texProgram : this.basicProgram;
		}
	}
		
	return bucket;
}

/**************************************************************************************************************/

/**
	Render all the POIs
 */
ConvexPolygonRenderer.prototype.render = function(renderables,start,end)
{	
	var renderContext = this.renderContext;
	var gl = this.renderContext.gl;
	
	// Setup states
	gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendEquation(gl.FUNC_ADD);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	
	// Setup the basic program
	this.basicProgram.apply();
	mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, renderContext.modelViewMatrix)
	gl.uniformMatrix4fv(this.basicProgram.uniforms["viewProjectionMatrix"], false, renderContext.modelViewMatrix);
	
	// Render each renderables
	var currentBucket = null;
	for ( var n = start; n < end; n++ )
	{
		var renderable = renderables[n];
		var bucket = renderable.bucket;
		
		// Set the color
		var color = bucket.style.strokeColor;
		gl.uniform4f(this.basicProgram.uniforms["color"], color[0], color[1], color[2], color[3] * bucket.layer.opacity() );
					
		// Update vertex buffer
		if ( !renderable.vertexBuffer )
		{
			renderable.vertexBuffer = gl.createBuffer();
			renderable.lineIndexBuffer = gl.createBuffer();
		}
		
		gl.bindBuffer(gl.ARRAY_BUFFER, renderable.vertexBuffer);
		gl.vertexAttribPointer(this.basicProgram.attributes['vertex'], 3, gl.FLOAT, false, 0, 0);
	
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderable.lineIndexBuffer);
		
		if ( renderable.bufferDirty )
		{
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(renderable.vertices), gl.STATIC_DRAW);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(renderable.lineIndices), gl.STATIC_DRAW);
			renderable.bufferDirty = false;
		}

		gl.drawElements( gl.LINES, renderable.lineIndices.length, gl.UNSIGNED_SHORT, 0);
		
		// Construct renderables for second pass with filled polygons
		if ( bucket.polygonProgram )
			this.programs[ bucket.polygonProgram.id ].renderables.push(renderable);
		
		// Remove current renderables from bucket
		//bucket.currentRenderables.length = 0;
	}
	
	// Second pass for filled polygons
	for ( var i=0; i<this.programs.length; i++ )
	{
		if ( this.programs[i].renderables.length == 0 )
			continue;

		var currentPolygonProgram = this.programs[i].program;
		currentPolygonProgram.apply();
		gl.uniformMatrix4fv(currentPolygonProgram.uniforms["viewProjectionMatrix"], false, renderContext.modelViewMatrix);


		gl.uniform1i(currentPolygonProgram.uniforms["texture"], 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.tcoordBuffer);
		gl.vertexAttribPointer(currentPolygonProgram.attributes['tcoord'], 2, gl.FLOAT, false, 0, 0);

		for ( var j=0; j<this.programs[i].renderables.length; j++ )
		{
			renderable = this.programs[i].renderables[j];

			if ( this.programs[i].fillShader.updateUniforms )
				this.programs[i].fillShader.updateUniforms(gl, renderable.bucket, currentPolygonProgram);

			gl.bindBuffer(gl.ARRAY_BUFFER, renderable.vertexBuffer);
			gl.vertexAttribPointer(currentPolygonProgram.attributes['vertex'], 3, gl.FLOAT, false, 0, 0);

			if ( !renderable.triangleIndexBuffer )
			{
				renderable.triangleIndexBuffer = gl.createBuffer();
			}
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderable.triangleIndexBuffer);
			if ( renderable.triBufferDirty )
			{
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(renderable.triangleIndices), gl.STATIC_DRAW);
				renderable.triBufferDirty = false;
			}
			// Add texture
			gl.activeTexture(gl.TEXTURE0);
			if ( renderable.bucket.texture ) 
			{
				gl.bindTexture(gl.TEXTURE_2D, renderable.bucket.texture); // use texture of renderable
				gl.uniform4f(currentPolygonProgram.uniforms["color"], 1.0, 1.0, 1.0, color[3] * renderable.bucket.layer.opacity());  // use whiteColor
			}
			else
			{
				gl.bindTexture(gl.TEXTURE_2D, this.whiteTexture);  // use white texture
				color = renderable.bucket.style.fillColor;
				gl.uniform4f(currentPolygonProgram.uniforms["color"], color[0], color[1], color[2], color[3] * renderable.bucket.layer.opacity() );
			}
			
			gl.drawElements( gl.TRIANGLES, renderable.triangleIndices.length, gl.UNSIGNED_SHORT, 0);

		}
		
		// Remove all renderables for current program
		this.programs[i].renderables.length = 0;
	}	

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
}


/**************************************************************************************************************/

// Register the renderer
VectorRendererManager.factory.push( function(globe) { return new ConvexPolygonRenderer(globe); } );

/**************************************************************************************************************/

return ConvexPolygonRenderer;

});