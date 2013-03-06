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

define( ['./RenderContext', './LineStringRenderable'], function(RenderContext) {
 
/**************************************************************************************************************/


/** @constructor
	FeatureOverlayManager constructor
 */
var FeatureOverlayManager = function()
{
	var gl = RenderContext.gl;
	
	var rttFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);
	rttFramebuffer.width = 512;
    rttFramebuffer.height = 512;
	
    var renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGB5_A1, rttFramebuffer.width, rttFramebuffer.height);
		
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderbuffer);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	
	this.frameBuffer = rttFramebuffer;
	
	this.lineStringRenderer = new LineStringRenderer();
}

/**************************************************************************************************************/

/*
	Create an overlay texture
 */
 FeatureOverlayManager.prototype.createOverlayTexture = function( extent )
{
	var gl = RenderContext.gl;

	gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
	gl.clear(gl.COLOR_BUFFER_BIT);
	
	var projectionMatrix = mat4.create();
	mat4.ortho( extent[0], extent[1], extent[2], extent[3], -10, 10, projectionMatrix );
	var viewMatrix = mat4.create();
	mat4.identity( viewMatrix );
	
	this.lineStringRenderer.render( viewMatrix, projectionMatrix );

	// Create the texture, and upload the image
	//this.texture = TilePool.createGLTexture(this.image);
	var texture = gl.createTexture();
/*	var image = new Uint8Array(4);
	image[0] = 0;
	image[1] = 255;
	image[2] = 0;
	image[3] = 45;*/
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA,0,0,512,512,0);
	//gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.generateMipmap(gl.TEXTURE_2D);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	
	return texture;
}

/**************************************************************************************************************/

return FeatureOverlayManager;

});
