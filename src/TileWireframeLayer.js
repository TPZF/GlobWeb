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
 
define(['./Utils', './BaseLayer','./Program','./Tile'], 
	function(Utils, BaseLayer, Program, Tile) {

/**************************************************************************************************************/

/** 
	@constructor
	Function constructor for TileWireframeLayer
 */
var TileWireframeLayer = function( options )
{
	BaseLayer.prototype.constructor.call( this, options );
	this.outline = (options && options['outline']) ? options['outline'] : false;
	this.color = (options && options['color']) ? options['color'] : [1.,1.,1.];
	this.globe = null;
	this.program = null;
	this.indexBuffer = null;
	this.subIndexBuffer = [ null, null, null, null ];
	this.zIndex = -1;
}

/**************************************************************************************************************/

Utils.inherits( BaseLayer,TileWireframeLayer );

/**************************************************************************************************************/

/** 
  Build the index buffer
 */
TileWireframeLayer.prototype.buildIndexBuffer = function()
{
	var gl = this.globe.renderContext.gl;
	var size = this.globe.tileManager.tileConfig.tesselation;
	var indices = [];
	
	var step = this.outline ? size-1 : 1;
	
	// Build horizontal lines
	for ( var j=0; j < size; j += step)
	{
		for ( var i=0; i < size-1; i++)
		{
			indices.push( j * size + i );
			indices.push( j * size + i + 1 );
		}
	}

	// Build vertical lines
	for ( var j=0; j < size; j += step)
	{
		for ( var i=0; i < size-1; i++)
		{
			indices.push( i * size + j );
			indices.push( (i+1) * size + j );
		}
	}

	
	var ib = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
	
	ib.numIndices = indices.length;
	this.indexBuffer = ib;
	
	var halfTesselation = (size-1) / 2;
	step = this.outline ? halfTesselation : 1;
	for ( var ii = 0; ii < 4; ii++ )
	{
		var i = ii % 2;
		var j = Math.floor( ii / 2 );
		
		// Build the sub grid for 'inside' tile
		var indices = [];
		for ( var n=halfTesselation*j; n < halfTesselation*(j+1)+1; n+= step)
		{
			for ( var k=halfTesselation*i; k < halfTesselation*(i+1); k++)
			{
				indices.push( n * size + k );
				indices.push( n * size + k + 1 );
			}
		}
		for ( var n=halfTesselation*i; n < halfTesselation*(i+1)+1; n+= step)
		{
			for ( var k=halfTesselation*j; k < halfTesselation*(j+1); k++)
			{
				indices.push( k * size + n );
				indices.push( (k+1) * size + n );
			}
		}
	
		var ib = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
		ib.numIndices = indices.length;
		this.subIndexBuffer[ii] = ib;
	}
}

/**************************************************************************************************************/

/** 
  Attach the layer to the globe
 */
TileWireframeLayer.prototype._attach = function( g )
{
	BaseLayer.prototype._attach.call( this, g );
	
	if ( this._visible )
	{
		this.globe.tileManager.addPostRenderer(this);
	}
	
	if (!this.program)
	{
		var vertexShader = "\
		attribute vec3 vertex;\n\
		uniform mat4 modelViewMatrix;\n\
		uniform mat4 projectionMatrix;\n\
		void main(void) \n\
		{\n\
			gl_Position = projectionMatrix * modelViewMatrix * vec4(vertex, 1.0);\n\
		}\n\
		";

		var fragmentShader = "\
		precision highp float; \n\
		uniform vec3 color; \n\
		uniform float alpha; \n\
		void main(void)\n\
		{\n\
			gl_FragColor = vec4(color,alpha);\n\
		}\n\
		";
		
		this.program = new Program(this.globe.renderContext);
		this.program.createFromSource( vertexShader, fragmentShader );
		
		this.buildIndexBuffer();
	}
}

/**************************************************************************************************************/

/** 
  Detach the layer from the globe
 */
TileWireframeLayer.prototype._detach = function()
{
	this.globe.tileManager.removePostRenderer(this);
	BaseLayer.prototype._detach.call(this);
}

/**************************************************************************************************************/

/**
	Render the tiles outline
 */
TileWireframeLayer.prototype.render = function( tiles )
{
	var rc = this.globe.renderContext;
	var gl = rc.gl;
	
	gl.enable(gl.BLEND);
	
	// Setup program
	this.program.apply();
	gl.uniformMatrix4fv(this.program.uniforms["projectionMatrix"], false, rc.projectionMatrix);
	
	var vertexAttribute = this.program.attributes['vertex'];
	var currentIB = null;	
	
	for ( var i = 0; i < tiles.length; i++ )
	{
		var tile = tiles[i];
		
		var isLoaded = ( tile.state == Tile.State.LOADED );
		var isLevelZero = ( tile.parentIndex == -1 );
	
		// Update uniforms for modelview matrix
		mat4.multiply( rc.viewMatrix, tile.matrix, rc.modelViewMatrix );
		gl.uniformMatrix4fv(this.program.uniforms["modelViewMatrix"], false, rc.modelViewMatrix);
		gl.uniform3f(this.program.uniforms["color"], this.color[0], this.color[1], this.color[2] );
		gl.uniform1f(this.program.uniforms["alpha"], this.opacity() );
			
		// Bind the vertex buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, tile.vertexBuffer);
		gl.vertexAttribPointer(vertexAttribute, 3, gl.FLOAT, false, 4*tile.config.vertexSize, 0);
		
		var indexBuffer = ( isLoaded || isLevelZero ) ? this.indexBuffer : this.subIndexBuffer[tile.parentIndex];
		// Bind the index buffer only if different (index buffer is shared between tiles)
		if ( currentIB != indexBuffer )
		{
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
			currentIB = indexBuffer;
		}
		
		// Draw the tiles in wireframe mode
		var numIndices = currentIB.numIndices;
		gl.drawElements(gl.LINES, currentIB.numIndices, gl.UNSIGNED_SHORT, 0);
	}
	
	gl.disable(gl.BLEND);
}

/**************************************************************************************************************/

/**
 * 	Get/Set visibility of the layer
 */
TileWireframeLayer.prototype.visible = function( arg )
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

return TileWireframeLayer;

});
