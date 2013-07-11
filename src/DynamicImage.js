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

var colormapFragShader = "\
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

var colorMapCallback = function(gl, renderable, program)
{
	if ( !program )
		program = renderable.polygonProgram;
	gl.uniform1f(program.uniforms["max"], renderable.style.uniformValues.tmax );
	gl.uniform1f(program.uniforms["min"], renderable.style.uniformValues.tmin );

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, renderable.style.uniformValues.colormapTex);
	gl.uniform1i(program.uniforms["colormap"], 1);			
}

/**
 *	@constructor DynamicImage
 */
var DynamicImage = function(gl, pixels, format, dataType, width, height)
{
	this.texture = null;
	this.width = 0;
	this.height = 0;
	this.fragmentCode = colormapFragShader;
	this.updateUniforms = colorMapCallback;
	this.tmin = 0.;
	this.tmax = 1.;
	this.colormapTex = null;
	this.gl = gl;

	// Create texture
	var tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texImage2D(
		gl.TEXTURE_2D, 0, 
		format, width, height, 0, 
		format, dataType, pixels);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	this.texture = tex;
	this.width = width;
	this.height = height;
	
	this.computeMinMax(pixels);
}

/**
 *	Compute min/max of fits data
 *
 *	@param pixels Fits data
 *	@param texture glTexture
 */
DynamicImage.prototype.computeMinMax = function(pixels, image)
{
	var max = pixels[0];
	var min = pixels[0];
	for ( var i=1; i<pixels.length; i++ )
	{
		var val = pixels[i];

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

/**
 *	Update colormap of current image
 *
 *	@param transferFn Transfer function("linear", "log", "sqrt", "pow2", "asin")
 *	@param colormap Colormap("grey", "rainbow", "fire", "stern", "eosb")
 *	@param inverse Boolean indicating if colormap is inversed
 */
DynamicImage.prototype.updateColormap = function(transferFn, colormap, inverse)
{
	if ( transferFn != "raw" )
	{
		this.fragmentCode = colormapFragShader;
		this.updateUniforms = colorMapCallback;
		// Dispose current texture
		if ( this.colormapTex )
	    	this.gl.deleteTexture( this.colormapTex );

		this.colormapTex = ColorMap.generateColormap(this.gl, transferFn, colormap, inverse);
	}
	else
	{
		this.fragmentCode = null;
		this.updateUniforms = null;
	}
}

/**
 *	Dispose textures
 */
DynamicImage.prototype.dispose = function()
{
	if ( this.colormapTex )
		this.renderContext.gl.deleteTexture( this.colormapTex );
	if ( this.texture )
		this.renderContext.gl.deleteTexture( this.texture );
}

return DynamicImage;

});