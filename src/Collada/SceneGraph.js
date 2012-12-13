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

/**
 *	@constructor SceneGraph
 *	
 */
GlobWeb.SceneGraph = function(root)
{
	this.root = root;
}

/**
 *	@constructor SceneGraph Node
 *	
 */
GlobWeb.SceneGraph.Node = function()
{
	this.geometries = [];
	this.children = [];
	this.matrix = null;
}

/**
 *	@constructor SceneGraph Material
 *	
 */
GlobWeb.SceneGraph.Material = function()
{
	this.diffuse = [ 1.0, 1.0, 1.0, 1.0 ];
	this.texture = null;
}
 
/**
 *	@constructor SceneGraph Texture
 *	
 */
GlobWeb.SceneGraph.Texture = function(url)
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


/**
 *	@constructor SceneGraph Geometry
 *	
 */
GlobWeb.SceneGraph.Geometry = function()
{
	this.material = null;
	this.mesh = null;
}

/**
 *	@constructor SceneGraph Mesh
 *	
 */
GlobWeb.SceneGraph.Mesh = function()
{
	this.vertices = null;
	this.tcoords = null;
	this.glMesh = null;
}


/**
 *	@constructor SceneGraphRenderer
 *	
 */
GlobWeb.SceneGraphRenderer = function(renderContext,scenegraph)
{

	var vertexShader = "\
	attribute vec3 vertex; \n\
	attribute vec2 tcoord; \n\
	uniform mat4 modelViewMatrix;\n\
	uniform mat4 projectionMatrix;\n\
	varying vec2 texCoord; \n\
	\n\
	void main(void)  \n\
	{ \n\
		gl_Position = projectionMatrix * modelViewMatrix * vec4(vertex.x, vertex.y, vertex.z, 1.0); \n\
		texCoord = tcoord; \n\
	} \n\
	";
	
	var fragmentShader = "\
	#ifdef GL_ES \n\
	precision highp float; \n\
	#endif \n\
	varying vec2 texCoord; \n\
	uniform vec4 diffuse; \n\
	uniform sampler2D texture;\n\
	\n\
	void main(void) \n\
	{ \n\
		gl_FragColor = diffuse * texture2D(texture, texCoord); \n\
	} \n\
	";
	
	this.renderContext = renderContext;
	
	this.program = new GlobWeb.Program(renderContext);
	this.program.createFromSource(vertexShader,fragmentShader);
	this.scenegraph = scenegraph;
	
	this.matrixStack = [];
}

GlobWeb.SceneGraphRenderer.isPowerOfTwo = function(x) 
{
	return (x & (x - 1)) == 0;
}
 
GlobWeb.SceneGraphRenderer.nextHighestPowerOfTwo = function(x) 
{
	--x;
	for (var i = 1; i < 32; i <<= 1) {
		x = x | x >> i;
	}
	return x + 1;
}

GlobWeb.SceneGraphRenderer.prototype.bindTexture = function(texture)
{
	var gl = this.renderContext.gl;
	if ( texture.glTexture )
	{
		gl.bindTexture(gl.TEXTURE_2D, texture.glTexture);
	}
	else if ( texture.image.complete 
		&& texture.image.width > 0 && texture.image.height > 0 )
	{
		texture.glTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture.glTexture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		
		if (!GlobWeb.SceneGraphRenderer.isPowerOfTwo(texture.image.width) || !GlobWeb.SceneGraphRenderer.isPowerOfTwo(texture.image.height)) 
		{
			// Scale up the texture to the next highest power of two dimensions.
			var canvas = document.createElement("canvas");
			canvas.width = GlobWeb.SceneGraphRenderer.nextHighestPowerOfTwo(texture.image.width);
			canvas.height = GlobWeb.SceneGraphRenderer.nextHighestPowerOfTwo(texture.image.height);
			var ctx = canvas.getContext("2d");
			ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
		}
		else
		{
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
		}
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, texture.wrap[0]);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, texture.wrap[1]);
		gl.generateMipmap(gl.TEXTURE_2D);
	}
}

GlobWeb.SceneGraphRenderer.prototype.renderNode = function(node)
{
	var rc = this.renderContext;
	var gl = rc.gl;
	
	if (node.matrix)
	{
		var mat = mat4.create();
		mat4.set( this.matrixStack[ this.matrixStack.length-1 ], mat );
		mat4.multiply(mat, node.matrix);
		this.matrixStack.push( mat );
	}
		
	for (var i=0; i < node.children.length; i++)
	{
		this.renderNode( node.children[i] );
	}
	
	gl.uniformMatrix4fv( this.program.uniforms["modelViewMatrix"], false, this.matrixStack[ this.matrixStack.length-1 ] );
	
	for (var i=0; i < node.geometries.length; i++)
	{
		var geom = node.geometries[i];
		gl.uniform4fv( this.program.uniforms["diffuse"], geom.material.diffuse );
		if ( geom.material.texture )
			this.bindTexture( geom.material.texture );
		if (!geom.mesh.glMesh)
		{
			geom.mesh.glMesh = new GlobWeb.Mesh(this.renderContext);
			geom.mesh.glMesh.setVertices(geom.mesh.vertices);
			if ( geom.mesh.tcoords) geom.mesh.glMesh.setTexCoords(geom.mesh.tcoords);
		}
		geom.mesh.glMesh.render(this.program.attributes);
	}
	
	if (node.matrix)
	{
		this.matrixStack.length = this.matrixStack.length-1;
	}
}

GlobWeb.SceneGraphRenderer.prototype.render = function()
{
	var rc = this.renderContext;
	var gl = rc.gl;
	
	gl.clearColor(1.,1.,1.,1.);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.disable(gl.CULL_FACE);
	gl.enable(gl.DEPTH_TEST);
	gl.activeTexture(gl.TEXTURE0);

	// Setup program
	this.program.apply();
	
	mat4.perspective(60, rc.canvas.width / rc.canvas.height, rc.near, rc.far, rc.projectionMatrix);
	gl.uniformMatrix4fv( this.program.uniforms["projectionMatrix"], false, rc.projectionMatrix);
	gl.uniform1i(this.program.uniforms["texture"], 0);
	
	this.matrixStack.length = 0;
	this.matrixStack.push( rc.viewMatrix );
	
	this.renderNode(this.scenegraph.root);
}
