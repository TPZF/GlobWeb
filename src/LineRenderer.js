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
 
define( ['./Utils', './Numeric', './VectorRenderer','./VectorRendererManager','./Program','./BatchRenderable'], 
	function(Utils,Numeric,VectorRenderer,VectorRendererManager,Program,BatchRenderable) {

/**************************************************************************************************************/

/** @constructor
 *	Basic renderer to animate lines with gradient color texture
 */
var LineRenderer = function(globe)
{
	VectorRenderer.prototype.constructor.call( this, globe );
	this.maxTilePerGeometry = 2;
	this.renderContext = globe.renderContext;
	this.defaultVertexShader = "\
		attribute vec4 vertex;\n\
		uniform mat4 mvp;\n\
		varying float s;\n\
		void main(void) \n\
		{\n\
			s = vertex.w;\n\
			gl_Position = mvp * vec4(vertex.xyz, 1.0);\n\
		}\n\
	";

	this.fragmentShader = "\
	precision lowp float; \n\
	uniform vec4 u_color;\n\
	uniform float speed;\n\
	uniform float time;\n\
	uniform float gradientLength;\n\
	varying float s;\n\
	uniform sampler2D colorTexture;\n\
	void main(void)\n\
	{\n\
		// 0.5 is a time scale parameter, parametrize it ?\n\
		float m = speed * time * 0.5;\n\
		float u = (-s+m)/gradientLength;\n\
		gl_FragColor.rgb = texture2D(colorTexture, vec2(u,0.)).rgb;\n\
		// TODO: handle appereance of rivers\n\
		if ( s < m )\n\
		{\n\
			gl_FragColor.a = 1.0;\n\
		}\n\
		else\n\
		{\n\
			gl_FragColor.a = 0.0;\n\
		}\n\
	}\n\
	";

	this.program = new Program(globe.renderContext);
	this.program.createFromSource(this.defaultVertexShader, this.fragmentShader);

	this.time = Date.now() / 1000; // Store it in seconds
	this.palette = null; // Palette is an array containing two colors(start/end and the middle one)
	this.colorTexture = this.generateTexture([[0.,0.,255.],[0.,200.,255.]]);	
}

/**************************************************************************************************************/

Utils.inherits(VectorRenderer,LineRenderer);

/**************************************************************************************************************/

/**
 *	Generate color texture from palette
 *	The generated gradient is of type : start color -> middle color -> start color
 */
LineRenderer.prototype.generateTexture = function(palette)
{
	var startColor = palette[0];
	var middleColor = palette[1];

	var pixels = [];
	var gl = this.globe.renderContext.gl;
	this.colorTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);

	for ( var i=0; i<128; i++ )
	{
		var r = Numeric.coserp( i/128, startColor[0], middleColor[0] );
		var g = Numeric.coserp( i/128, startColor[1], middleColor[1] );
		var b = Numeric.coserp( i/128, startColor[2], middleColor[2] );
		pixels.push(r);
		pixels.push(g);
		pixels.push(b);
		pixels.push(255);
	}
	for ( var i=0; i<128; i++ )
	{
		var r = Numeric.coserp( i/128, middleColor[0], startColor[0] );
		var g = Numeric.coserp( i/128, middleColor[1], startColor[1] );
		var b = Numeric.coserp( i/128, middleColor[2], startColor[2] );
		pixels.push(r);
		pixels.push(g);
		pixels.push(b);
		pixels.push(255);
	}
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, pixels.length / 4, 1, 0, 
	              gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(pixels));
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

	this.palette = palette;
}

/**************************************************************************************************************/

/**
 * Renderable constructor for Line
 */
var LineRenderable = function(bucket) 
{
	BatchRenderable.prototype.constructor.call( this, bucket );
		
	this.vertexSize = 4;

	// TODO : remove matrix ??
	this.matrix = mat4.create();
	mat4.identity(this.matrix);
}

/**************************************************************************************************************/

Utils.inherits(BatchRenderable,LineRenderable);

/**************************************************************************************************************/

/**
 * Build vertices and indices for the given geometry
 */
LineRenderable.prototype.build = function(geometry)
{
	var renderer = this.bucket.renderer;
	var style = this.bucket.style;
		
	var lines =  (geometry.type == "MultiLineString") ? geometry.coordinates : [geometry.coordinates];

	var currentPoint = vec3.create();
	var previousPoint = vec3.create();
	
	for ( var n=0; n < lines.length; n++ ) {

		var coords = lines[n];
		
		var lastIndex = this.vertices.length / 4;
		var coordinateSystem = renderer.globe.coordinateSystem;

		// Build line vertices
		var offset = lastIndex * 4;
		var s = 0;
		for ( var i=0; i < coords.length; i++)
		{
			coordinateSystem.fromGeoTo3D(coords[i], currentPoint);
			this.vertices[offset] = currentPoint[0];
			this.vertices[offset+1] = currentPoint[1];
			this.vertices[offset+2] = currentPoint[2];
			// Compute s(length) between two points
			if ( i > 0 )
			{
				s += vec3.dist(currentPoint, previousPoint);
			}
			
			// Update previous point(do it by swapping with current cuz it's the same object)
			var tmp = previousPoint;
			previousPoint = currentPoint;
			currentPoint = tmp;

			this.vertices[offset+3] = s;
			offset += 4;
		}

		// Build line indices
		for ( var i = 0; i < coords.length-1; i++ )
		{
			this.lineIndices.push( lastIndex + i, lastIndex + i + 1 );
		}
	}
	// Geometry is always added contrary to tiled renderables
	return true;
}

/**************************************************************************************************************/

/**
	Bucket constructor for LineRenderer
 */
var LineBucket = function(layer,style)
{
	this.layer = layer;
	this.style = style;
	this.renderer = null;
}

/**************************************************************************************************************/

/**
	Create a renderable for this bucket
 */
LineBucket.prototype.createRenderable = function()
{
	return new LineRenderable(this);
}

/**************************************************************************************************************/

/**
	Check if a bucket is compatible
 */
LineBucket.prototype.isCompatible = function(style)
{
	return this.style == style;
}

/**************************************************************************************************************/

/**
 * 	Render all the polygons
 */
LineRenderer.prototype.render = function(renderables, start, end)
{
	var renderContext = this.globe.renderContext;
	var gl = renderContext.gl;
	
	gl.enable(gl.BLEND);
	gl.blendEquation(gl.FUNC_ADD);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.depthFunc(gl.LEQUAL);
	//gl.enable(gl.POLYGON_OFFSET_FILL);
	//gl.polygonOffset(-2.0,-2.0);
	//gl.disable(gl.DEPTH_TEST);

	// Compute the viewProj matrix
	var viewProjMatrix = mat4.create();
	mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, viewProjMatrix);
	var modelViewProjMatrix = mat4.create();

	this.program.apply();

	gl.activeTexture(gl.TEXTURE0);
	gl.uniform1i(this.program.uniforms["colorTexture"], 0);
	gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);

	for ( var n = start; n < end; n++ )
	{
		var renderable = renderables[n];
		var style = renderable.bucket.style;
					
		mat4.multiply(viewProjMatrix,renderable.matrix,modelViewProjMatrix);
		gl.uniformMatrix4fv(this.program.uniforms["mvp"], false, modelViewProjMatrix);
		
		if ( style.palette && style.palette != this.palette )
		{
			// Generate new color texture(create an array of color textures per bucket ?)
			gl.deleteTexture( this.colorTexture );
			this.generateTexture(style.palette);
		}
		
		gl.lineWidth( style.strokeWidth );

		// Update uniforms
		gl.uniform4f(this.program.uniforms["u_color"], style.strokeColor[0], style.strokeColor[1], style.strokeColor[2], style.strokeColor[3] * renderable.bucket.layer._opacity);
		gl.uniform1f(this.program.uniforms["speed"], style.hasOwnProperty('speed') ? style.speed : 1.0);
		gl.uniform1f(this.program.uniforms["time"], Date.now()/1000 - this.time);
		gl.uniform1f(this.program.uniforms["gradientLength"], style.hasOwnProperty('gradientLength') ? style.gradientLength : 10.0);

		renderable.bindBuffers( renderContext );
		
		gl.vertexAttribPointer(this.program.attributes['vertex'], 4, gl.FLOAT, false, 0, 0);
	
		// Draw
		gl.drawElements( gl.LINES, renderable.lineIndices.length, renderable.indexType, 0);
	}
	
	// Revert to default
	gl.lineWidth(1);

	//gl.enable(gl.DEPTH_TEST);
	//gl.disable(gl.POLYGON_OFFSET_FILL);
	gl.depthFunc(gl.LESS);
	gl.disable(gl.BLEND);
}

/**************************************************************************************************************/

/**
	Check if renderer is applicable
 */
LineRenderer.prototype.canApply = function(type,style)
{
	return (type == "LineString" || type == "MultiLineString") && style.gradientLength;
}

/**************************************************************************************************************/

/**
	Create a bucket
 */
LineRenderer.prototype.createBucket = function(layer,style)
{
	return new LineBucket(layer,style);
}

/**************************************************************************************************************/

// Register the renderer
VectorRendererManager.factory.push( function(globe) { return new LineRenderer(globe); } );

});