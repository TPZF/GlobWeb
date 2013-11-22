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
 
define( ['./Utils','./VectorRenderer','./CoordinateSystem','./VectorRendererManager','./FeatureStyle','./Program','./Triangulator'], 
	function(Utils,VectorRenderer,CoordinateSystem,VectorRendererManager,FeatureStyle,Program,Triangulator) {

/**************************************************************************************************************/

/** @constructor
 *	Basic renderer for polygon
 */

var PolygonRenderer = function(globe)
{
	VectorRenderer.prototype.constructor.call( this, globe );
	this.maxTilePerGeometry = 0;
		
	var vertexShader = "\
	attribute vec3 vertex;\n\
	uniform mat4 mvp;\n\
	void main(void) \n\
	{\n\
		gl_Position = mvp * vec4(vertex, 1.0);\n\
	}\n\
	";

	var fragmentShader = "\
	precision lowp float; \n\
	uniform vec4 u_color;\n\
	void main(void)\n\
	{\n\
		gl_FragColor = u_color;\n\
	}\n\
	";
	
	this.program = new Program(globe.renderContext);
	this.program.createFromSource(vertexShader, fragmentShader);
}

Utils.inherits(VectorRenderer,PolygonRenderer);

/**************************************************************************************************************/

/**
 * Renderable constructor for Polygon
 */
var PolygonRenderable = function(bucket) 
{
	this.bucket = bucket;
	this.geometry = null;
	this.matrix = mat4.create();
	this.vertexBuffer = null;
	this.indexBuffer = null;
}

/**************************************************************************************************************/

/**
 * Add a geometry to the renderbale
 */
PolygonRenderable.prototype.add = function(geometry)
{
	var gl = this.bucket.renderer.tileManager.renderContext.gl;
	var style = this.bucket.style;
		
	// Create vertex buffer
	this.vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	
	var coords = geometry['coordinates'][0];
	var vertices = new Float32Array( style.extrude ? coords.length * 6 : coords.length * 3 );
	
	var origin = vec3.create();
	CoordinateSystem.fromGeoTo3D(coords[0], origin);
	
	// For polygons only
	for ( var i=0; i < coords.length; i++)
	{
		var pos3d = [];
		CoordinateSystem.fromGeoTo3D(coords[i], pos3d);
		vertices[i*3] = pos3d[0] - origin[0];
		vertices[i*3+1] = pos3d[1] - origin[1];
		vertices[i*3+2] = pos3d[2] - origin[2];
	}
	
	if ( style.extrude )
	{
		var offset = coords.length * 3;
		for ( var i=0; i < coords.length; i++)
		{
			var pos3d = [];
			var coordAtZero = [ coords[i][0], coords[i][1], 0.0 ];
			CoordinateSystem.fromGeoTo3D( coordAtZero, pos3d);
			vertices[offset] = pos3d[0] - origin[0];
			vertices[offset+1] = pos3d[1] - origin[1];
			vertices[offset+2] = pos3d[2] - origin[2];
			offset += 3;
		}
	}

	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
	// Create index buffer(make shared ?)
	var indices = [];
	indices = Triangulator.process( coords );
	
	if ( indices == null )
	{
		console.error("Triangulation error ! Check if your GeoJSON geometry is valid");
		return false;
	}
	
	if ( style.extrude )
	{
		var upOffset = 0;
		var lowOffset = coords.length;
		
		for ( var i = 0; i < coords.length-1; i++ )
		{
			indices.push( upOffset, upOffset + 1, lowOffset );
			indices.push( upOffset + 1, lowOffset + 1, lowOffset );
			
			upOffset += 1;
			lowOffset += 1;
		}
	}
	
	this.numTriIndices = indices.length;
	
	var offset = 0;
	for ( var i = 0; i < coords.length-1; i++ )
	{
		indices.push( offset, offset + 1 );
		offset += 1;
	}
	if ( style.extrude )
	{
		var upOffset = 0;
		var lowOffset = coords.length;
		for ( var i = 0; i < coords.length-1; i++ )
		{
			indices.push( upOffset, lowOffset );
			
			upOffset += 1;
			lowOffset += 1;
		}
	}
	
	this.numLineIndices = indices.length - this.numTriIndices;

	this.indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
	
	mat4.identity(this.matrix);
	mat4.translate(this.matrix,origin);
	
	// Always add the geometry
	return true;
}

/**************************************************************************************************************/

/**
 * Remove a geometry from the renderable
 */
PolygonRenderable.prototype.remove = function(geometry)
{
	if ( this.geometry == geometry)
	{
		this.geometry = null;
	}
}

/**************************************************************************************************************/

/**
 * Dispose the renderable
 */
PolygonRenderable.prototype.dispose = function(renderContext)
{
	var gl = renderContext.gl;
	if (this.vertexBuffer) gl.deleteBuffer( this.vertexBuffer );
	if (this.indexBuffer) gl.deleteBuffer( this.indexBuffer );
}


/**************************************************************************************************************/

/**
	Bucket constructor for PolygonRenderer
 */
var PolygonBucket = function(layer,style)
{
	this.layer = layer;
	this.style = new FeatureStyle(style);
	this.renderer = null;
}

/**************************************************************************************************************/

/**
	Create a renderable for this bucket
 */
PolygonBucket.prototype.createRenderable = function()
{
	return new PolygonRenderable(this);
}

/**************************************************************************************************************/

/**
	Check if a bucket is compatible
 */
PolygonBucket.prototype.isCompatible = function(style)
{
	return false;
}

/**************************************************************************************************************/

/**
 * 	Render all the polygons
 */
PolygonRenderer.prototype.render = function(renderables, start, end)
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
	
	this.program.apply();
	
	// Compute the viewProj matrix
	var viewProjMatrix = mat4.create();
	mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, viewProjMatrix);
	
	var modelViewProjMatrix = mat4.create();
	for ( var n = start; n < end; n++ )
	{
		var renderable = renderables[n];
				
		mat4.multiply(viewProjMatrix,renderable.matrix,modelViewProjMatrix);
		gl.uniformMatrix4fv(this.program.uniforms["mvp"], false, modelViewProjMatrix);
			
		var style = renderable.bucket.style;
		gl.uniform4f(this.program.uniforms["u_color"], style.fillColor[0], style.fillColor[1], style.fillColor[2], 
				style.fillColor[3] * renderable.bucket.layer._opacity);  // use fillColor
				
		gl.bindBuffer(gl.ARRAY_BUFFER, renderable.vertexBuffer);
		gl.vertexAttribPointer(this.program.attributes['vertex'], 3, gl.FLOAT, false, 0, 0);
		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderable.indexBuffer);
		
		gl.drawElements( gl.TRIANGLES, renderable.numTriIndices, gl.UNSIGNED_SHORT, 0);
		if ( renderable.numLineIndices > 0 )
		{
			gl.uniform4f(this.program.uniforms["u_color"], style.strokeColor[0], style.strokeColor[1], style.strokeColor[2], style.strokeColor[3] * renderable.bucket.layer._opacity);  
			gl.drawElements( gl.LINES, renderable.numLineIndices, gl.UNSIGNED_SHORT, renderable.numTriIndices * 2);
		}
	}
	
	//gl.enable(gl.DEPTH_TEST);
	//gl.disable(gl.POLYGON_OFFSET_FILL);
	gl.depthFunc(gl.LESS);
	gl.disable(gl.BLEND);
}

/**************************************************************************************************************/

/**
	Check if renderer is applicable
 */
PolygonRenderer.prototype.canApply = function(type,style)
{
	return (type == "Polygon") && style.fill;
}

/**************************************************************************************************************/

/**
	Create a bucket
 */
PolygonRenderer.prototype.createBucket = function(layer,style)
{
	return new PolygonBucket(layer,style);
}

/**************************************************************************************************************/

// Register the renderer
VectorRendererManager.factory.push( function(globe) { return new PolygonRenderer(globe); } );

});