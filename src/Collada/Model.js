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

 define(function() {
  
/**************************************************************************************************************/

/**
 *	@constructor Model
 *	
 */
var Model = function(root)
{
	this.root = root;
}
 
/**************************************************************************************************************/

/**
 *	@constructor Model Node
 *	
 */
Model.Node = function()
{
	this.geometries = [];
	this.children = [];
	this.matrix = null;
}
 
/**************************************************************************************************************/

/**
 *	@constructor Model Material
 *	
 */
Model.Material = function()
{
	this.diffuse = [ 1.0, 1.0, 1.0, 1.0 ];
	this.texture = null;
}
 
/**************************************************************************************************************/

/**
 * Bind the material in the gl context
 */
Model.Material.prototype.bind = function(gl,program)
{
	gl.uniform4fv( program.uniforms["diffuse"], this.diffuse );
	if ( this.texture )
		this.texture.bind( gl );
}
  
/**************************************************************************************************************/

/**
 *	@constructor Model Texture
 *	
 */
Model.Texture = function(url)
{
	var self = this;
	this.glTexture = null;
	this.wrap = [ WebGLRenderingContext.REPEAT, WebGLRenderingContext.REPEAT ];
	this.image = new Image();
	this.image.onerror = function()
	{
		console.log("Cannot load texture " + url);
	}
	this.image.src = url;
}

var _isPowerOfTwo = function(x) 
{
	return (x & (x - 1)) == 0;
}
 
var _nextHighestPowerOfTwo = function(x) 
{
	--x;
	for (var i = 1; i < 32; i <<= 1) {
		x = x | x >> i;
	}
	return x + 1;
}
 
/**************************************************************************************************************/

/**
 * Bind the texture in the gl context
 */
Model.Texture.prototype.bind = function(gl)
{
	if ( this.glTexture )
	{
		gl.bindTexture(gl.TEXTURE_2D, this.glTexture);
	}
	else if ( this.image.complete 
		&& this.image.width > 0 && this.image.height > 0 )
	{
		this.glTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.glTexture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		
		if (!_isPowerOfTwo(this.image.width) || !_isPowerOfTwo(this.image.height)) 
		{
			// Scale up the texture to the next highest power of two dimensions.
			var canvas = document.createElement("canvas");
			canvas.width = _nextHighestPowerOfTwo(this.image.width);
			canvas.height = _nextHighestPowerOfTwo(this.image.height);
			var ctx = canvas.getContext("2d");
			ctx.drawImage(this.image, 0, 0, canvas.width, canvas.height);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
		}
		else
		{
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
		}
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.wrap[0]);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.wrap[1]);
		gl.generateMipmap(gl.TEXTURE_2D);
	}
}
 
/**************************************************************************************************************/

/**
 *	@constructor Model Geometry
 *	
 */
Model.Geometry = function()
{
	this.material = null;
	this.mesh = null;
}
 
/**************************************************************************************************************/

/**
 *	@constructor Model Mesh
 */
Model.Mesh = function()
{
	this.vertices = null;
	this.tcoords = null;
	this.glVertexBuffer = null;
	this.vbStride = 0;
}
 
/**************************************************************************************************************/

/**
 *	Render the mesh
 */
Model.Mesh.prototype.render = function(gl,program)
{
	var numVertices = this.vertices.length / 3;
	if (!this.glVertexBuffer)
	{
		var vb = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vb);
		
		var numElements = this.tcoords ? 5 : 3;
		this.vbStride = numElements * 4;
		var verts = new Float32Array( numVertices * numElements  );
		for ( var n = 0; n < numVertices; n++ )
		{
			var vn = 3 * n;
			var on = numElements * n
			verts[on] = this.vertices[vn];
			verts[on+1] = this.vertices[vn+1];
			verts[on+2] = this.vertices[vn+2];
			if ( this.tcoords )
			{
				var tn = 2 * n;
				verts[on+3] = this.tcoords[tn];
				verts[on+4] = this.tcoords[tn+1];
			}
		}
		gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
		
		this.glVertexBuffer = vb;
	}
	
	// Bind the vertex buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, this.glVertexBuffer);
	gl.vertexAttribPointer(program.attributes['vertex'], 3, gl.FLOAT, false, this.vbStride, 0);
	if ( this.tcoords )
		gl.vertexAttribPointer(program.attributes['tcoord'], 2, gl.FLOAT, false, this.vbStride, 12);
	
	// Draw arrays
	gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}
 
/**************************************************************************************************************/

return Model;

});
