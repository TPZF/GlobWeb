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

 define( ["../BoundingBox"], function(BoundingBox) {
  
  
// Namespace for SceneGraph
var SceneGraph = {};
 
/**************************************************************************************************************/

/**
 *	@constructor Model Node
 *	
 */
SceneGraph.Node = function()
{
	this.geometries = [];
	this.children = [];
	this.matrix = null;
}

BoundingBox.prototype.merge = function(bbox)
{
	if ( !bbox.min || !bbox.max )
		return;
	
	if (this.min)
	{
		if (bbox.min[0] < this.min[0])
			this.min[0] = bbox.min[0];
		if (bbox.min[1] < this.min[1])
			this.min[1] = bbox.min[1];
		if (bbox.min[2] < this.min[2])
			this.min[2] = bbox.min[2];
	}
	else
	{
		this.min = vec3.create(bbox.min);
	}
		
	if (this.max)
	{
		if (bbox.max[0] > this.max[0])
			this.max[0] = bbox.max[0];
		if (bbox.max[1] > this.max[1])
			this.max[1] = bbox.max[1];
		if (bbox.max[2] > this.max[2])
			this.max[2] = bbox.max[2];
	}
	else
	{
		this.max = vec3.create(bbox.max);
	}
}

BoundingBox.prototype.transform = function(matrix)
{
	var vertices = [];
	
	for ( var i = 0; i < 8; i++ )
	{
		var vec = mat4.multiplyVec3( matrix, this.getCorner(i) );
		vertices.push( vec[0], vec[1], vec[2] );
	}
	
	this.compute( vertices );
}
 

/**************************************************************************************************************/

/**
 * Compute the BBox of a node
 */
SceneGraph.Node.prototype.computeBBox = function()
{
	this.bbox = new BoundingBox();
	
	for ( var i = 0; i < this.geometries.length; i++ )
	{
		var bbox = new BoundingBox();
		bbox.compute( this.geometries[i].mesh.vertices );
		this.bbox.merge(bbox);
	}
	
	for ( var i = 0; i < this.children.length; i++ )
	{
		this.bbox.merge( this.children[i].computeBBox() );
	}
	
	if (this.matrix)
		this.bbox.transform(this.matrix);
	
	return this.bbox;
}

/**************************************************************************************************************/

/**
 *	Intersect a node with a ray
 */
SceneGraph.Node.prototype.intersectWith = function(ray,intersects)
{
	return ray.nodeIntersect(this,intersects);
}

/**************************************************************************************************************/

/**
 *	Render a node
 */
SceneGraph.Node.prototype.render = function(renderer)
{
	// render the sub nodes (maybe culling?)
	for (var i=0; i < this.children.length; i++)
	{
		renderer.renderNode( this.children[i] );
	}
	
	// Render geometries if any
	if ( this.geometries.length > 0 )
	{	
		var rc = renderer.renderContext;
		var gl = rc.gl;
		
		gl.uniformMatrix4fv( renderer.program.uniforms["modelViewMatrix"], false, renderer.matrixStack[ renderer.matrixStack.length-1 ] );
		
		for (var i=0; i < this.geometries.length; i++)
		{
			var geom = this.geometries[i];
			geom.material.bind(gl,renderer.program,renderer);			
			geom.mesh.render(gl,renderer.program);
		}
	}
}

 
/**************************************************************************************************************/

/**
 *	@constructor Model Material
 *	
 */
SceneGraph.Material = function()
{
	this.diffuse = [ 1.0, 1.0, 1.0, 1.0 ];
	this.texture = null;
}
 
/**************************************************************************************************************/

/**
 * Bind the material in the gl context
 */
SceneGraph.Material.prototype.bind = function(gl,program,renderer)
{
	gl.uniform4fv( program.uniforms["diffuse"], this.diffuse );
	if ( this.texture )
		this.texture.bind( gl,renderer );
	else
		gl.bindTexture(gl.TEXTURE_2D, renderer.defaultTexture);
}
  
/**************************************************************************************************************/

/**
 *	@constructor Model Texture
 *	
 */
SceneGraph.Texture = function(url)
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
SceneGraph.Texture.prototype.bind = function(gl)
{
	if ( this.glTexture )
	{
		gl.bindTexture(gl.TEXTURE_2D, this.glTexture);
	}
	else
	{
		if ( this.image.complete 
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
}

  
/**************************************************************************************************************/

/**
 *	Dispose the texture
 */
SceneGraph.Texture.prototype.dispose = function(renderContext)
{
	if ( this.glTexture )
	{
		renderContext.gl.deleteTexture(this.glTexture);
	}
}
 
/**************************************************************************************************************/

/**
 *	@constructor Model Geometry
 */
SceneGraph.Geometry = function()
{
	this.material = null;
	this.mesh = null;
}
 
/**************************************************************************************************************/

/**
 *	Dispose the geometry
 */
SceneGraph.Geometry.prototype.dispose = function(renderContext)
{
	if ( this.material.texture )
	{
		this.material.texture.dispose(renderContext);
	}
	this.mesh.dispose(renderContext);
}
 
/**************************************************************************************************************/

/**
 *	@constructor Model Mesh
 */
SceneGraph.Mesh = function()
{
	this.vertices = null;
	this.indices = null;
	this.glVertexBuffer = null;
	this.glIndexBuffer = null;
	this.numElements = 0;
}
  
/**************************************************************************************************************/

/**
 *	Dispose the mesh
 */
SceneGraph.Mesh.prototype.dispose = function(renderContext)
{
	if ( this.glVertexBuffer )
	{
		renderContext.gl.deleteBuffer(this.glVertexBuffer);
	}
	if ( this.glIndexBuffer )
	{
		renderContext.gl.deleteBuffer(this.glIndexBuffer);
	}
}

/**************************************************************************************************************/

/**
 *	Render the mesh
 */
SceneGraph.Mesh.prototype.render = function(gl,program)
{
	if (!this.glVertexBuffer)
	{
		var vb = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vb);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
		this.glVertexBuffer = vb;
		
		var ib = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
		this.glIndexBuffer = ib;
	}
	
	// Bind the vertex buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, this.glVertexBuffer);
	gl.vertexAttribPointer(program.attributes['vertex'], 3, gl.FLOAT, false, this.numElements * 4, 0);
	if ( this.numElements == 5 )
	{
		gl.vertexAttribPointer(program.attributes['tcoord'], 2, gl.FLOAT, false, this.numElements * 4, 12);
	}

	// Bind the index buffer
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.glIndexBuffer);
	
	// Draw element
	gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
}

/**************************************************************************************************************/

/**
 * Merge two indexed mesh
 */
SceneGraph.Mesh.prototype.merge = function(input)
{
	var indexOffset = this.vertices.length / this.numElements;
	
	for ( var n = 0; n < input.vertices.length; n++ )
	{
		this.vertices.push( input.vertices[n] );
	}
	for ( var n = 0; n < input.indices.length; n++ )
	{
		this.indices.push( input.indices[n] + indexOffset );
	}
};

/**************************************************************************************************************/

return SceneGraph;

});
