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

define(['./ColorMap'], function(ColorMap) {
 
/**************************************************************************************************************/

// TODO : Unify shader programs between TileManager, ConvexPolygonRenderer and ImageRenderer
//		* inverse Y coordinates(if needed)
//		* vTextureCoord name refactor
var defaultFragmentCode = "\
		precision highp float; \n\
		varying vec2 vTextureCoord;\n\
		uniform sampler2D texture; \n\
		uniform sampler2D colormap; \n\
		uniform float min; \n\
		uniform float max; \n\
		uniform vec4 color; \n\
		void main(void)\n\
		{\n\
			float i = texture2D(texture,vTextureCoord).r;\n\
			float d = clamp( ( i - min ) / (max - min), 0.0, 1.0 );\n\
			vec4 cmValue = texture2D(colormap, vec2(d,0.));\n\
			gl_FragColor = vec4(cmValue.r,cmValue.g,cmValue.b,color.a);\n\
		}\n\
		";

var defaultCallback = function(gl, renderable, program)
{
	if ( !program )
		program = renderable.polygonProgram;
	gl.uniform1f(program.uniforms["max"], renderable.style.uniformValues.tmax );
	gl.uniform1f(program.uniforms["min"], renderable.style.uniformValues.tmin );

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, renderable.style.uniformValues.colormapTex);
	gl.uniform1i(program.uniforms["colormap"], 1);
}

/**************************************************************************************************************/

/**
 *	@constructor DynamicImage
 */
var DynamicImage = function(renderContext, pixels, format, dataType, width, height, options)
{
	// Initialize fragment shader and uniformsCallback if needed
	defaultFragmentCode = (options && options.fragmentCode) ? options.fragmentCode : defaultFragmentCode;
	defaultCallback = (options && options.updateUniforms) ? options.updateUniforms : defaultCallback;
	
	this.fragmentCode = defaultFragmentCode;
	this.updateUniforms = defaultCallback;
	this.tmin = 0.;
	this.tmax = 1.;
	this.colormapTex = null;
	this.renderContext = renderContext;

	// Parameters for histogram generation
	this.pixels = pixels;
	this.transferFn = "raw";
	this.inverse = false;

	// Create texture
	var gl = renderContext.gl;
	var tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
    // TODO : Flip around X axis
    //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(
		gl.TEXTURE_2D, 0, 
		format, width, height, 0, 
		format, dataType, pixels);


	if ( dataType == gl.FLOAT )
	{	
		// Choose floating point texture filtering depending on extension support
		var float_linear_ext = gl.getExtension("OES_texture_float_linear");
		var float_filtering = float_linear_ext ? gl.LINEAR : gl.NEAREST;
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, float_filtering);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, float_filtering);
	}
	else
	{
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	}

    // NPOT properties
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	this.texture = tex;
	this.width = width;
	this.height = height;
	
	this.computeMinMax(pixels);
	renderContext.requestFrame();
}

/**************************************************************************************************************/

/**
 *	Compute min/max of fits data
 *
 *	@param pixels Fits data
 *	@param texture glTexture
 */
DynamicImage.prototype.computeMinMax = function(pixels)
{
	var max = Number.MIN_VALUE;
	var min = Number.MAX_VALUE;
	for ( var i=1; i<pixels.length; i++ )
	{
		var val = pixels[i];
		if ( isNaN(val) )
			continue;
		if ( max < val )
			max = val;
		if ( min > val )
			min = val;
	}
	this.min = min;
	this.max = max;
	this.tmax = max;
	this.tmin = min;
}

/**************************************************************************************************************/

/**
 *	Update colormap of current image
 *
 *	@param transferFn Transfer function("linear", "log", "sqrt", "pow2", "asin")
 *	@param colormap Colormap("grey", "rainbow", "fire", "stern", "eosb")
 *	@param inverse Boolean indicating if colormap is inversed
 */
DynamicImage.prototype.updateColormap = function(transferFn, colormap, inverse)
{
	var gl = this.renderContext.gl;
	if ( transferFn != "raw" )
	{
		this.fragmentCode = defaultFragmentCode;
		this.updateUniforms = defaultCallback;
		// Dispose current texture
		if ( this.colormapTex )
	    	gl.deleteTexture( this.colormapTex );

		this.colormapTex = ColorMap.generateColormap(gl, transferFn, colormap, inverse);
	}
	else
	{
		this.fragmentCode = null;
		this.updateUniforms = null;
	}
	this.transferFn = transferFn;
	this.inverse = inverse;
}

/**************************************************************************************************************/

/**
 *	Dispose textures
 */
DynamicImage.prototype.dispose = function()
{
	var gl = this.renderContext.gl;
	if ( this.colormapTex )
		gl.deleteTexture( this.colormapTex );
	if ( this.texture )
		gl.deleteTexture( this.texture );

	this.colormapTex = null;
	this.texture = null;
}

/**************************************************************************************************************/

return DynamicImage;

});