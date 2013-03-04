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

define(['../Program','../glMatrix'], function(Program) {
 
/**************************************************************************************************************/

/**
 *	@constructor ModelRenderer
 */
var ModelRenderer = function(renderContext,model)
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
	precision lowp float; \n\
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
	
	this.program = new Program(renderContext);
	this.program.createFromSource(vertexShader,fragmentShader);
	this.models = [ model ];
	
	this.matrixStack = [];
}

/**************************************************************************************************************/

/**
 *	Recursive method to render node
 */
ModelRenderer.prototype.renderNode = function(node)
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
		geom.material.bind(gl,this.program);			
		geom.mesh.render(gl,this.program);
	}
	
	if (node.matrix)
	{
		this.matrixStack.length = this.matrixStack.length-1;
	}
}

/**************************************************************************************************************/

/**
 *	Main render
 */
ModelRenderer.prototype.render = function()
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
	
	for ( var i = 0; i < this.models.length; i++ )
	{
		this.renderNode(this.models[i].root);
	}
}

/**************************************************************************************************************/

return ModelRenderer;

});
