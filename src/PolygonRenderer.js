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
 
define( ['./Utils','./VectorRenderer','./VectorRendererManager','./FeatureStyle','./Program','./pnltri.min'], 
	function(Utils,VectorRenderer,VectorRendererManager,FeatureStyle,Program) {

/**************************************************************************************************************/

/** @constructor
 *	Basic renderer for polygon
 */

var PolygonRenderer = function(globe)
{
	VectorRenderer.prototype.constructor.call( this, globe );
	this.maxTilePerGeometry = 0;
	this.renderContext = globe.renderContext;
	this.defaultVertexShader = "\
		attribute vec3 vertex;\n\
		uniform mat4 mvp;\n\
		void main(void) \n\
		{\n\
			gl_Position = mvp * vec4(vertex, 1.0);\n\
		}\n\
	";

	this.extrudeVertexShader = "\
		attribute vec3 vertex;\n\
		attribute vec4 normal;\n\
		uniform float extrusionScale; \n\
		uniform mat4 mvp;\n\
		void main(void) \n\
		{\n\
			vec3 extrudedVertex = vertex + normal.w * vec3(normal.x, normal.y, normal.z) * extrusionScale;\
			gl_Position = mvp * vec4(extrudedVertex, 1.0);\n\
		}\n\
	";

	this.fragmentShader = "\
	precision lowp float; \n\
	uniform vec4 u_color;\n\
	void main(void)\n\
	{\n\
		gl_FragColor = u_color;\n\
	}\n\
	";

	this.program = new Program(globe.renderContext);
	this.program.createFromSource(this.defaultVertexShader, this.fragmentShader);
	
	this.extrudeProgram = new Program(globe.renderContext);
	this.extrudeProgram.createFromSource(this.extrudeVertexShader, this.fragmentShader );
}

/**************************************************************************************************************/

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
 * Vertex buffer : geometry|extrude
 * Index buffer : geometry triangles|extrude triangles|lines
 * Normal buffer : normals.xyz, extrude value as w 
 */
PolygonRenderable.prototype.add = function(geometry)
{
	this.geometry = geometry;

	var renderer = this.bucket.renderer;
	var gl = renderer.tileManager.renderContext.gl;
	var style = this.bucket.style;
		
	var lastIndex = 0;
	var polygons =  (geometry.type == "MultiPolygon") ? geometry.coordinates : [geometry.coordinates];
	var vertices = [];
	var indices = [];
	var lineIndices = [];
	var pos3d = [];

	var origin = vec3.create();
	var coordinateSystem = renderer.globe.coordinateSystem;
	coordinateSystem.fromGeoTo3D(polygons[0][0][0], origin);
	
	var vertexSize = style.extrude ? 7 : 3;

	for ( var n=0; n < polygons.length; n++ ) {

		// Only take into account outer contour for now
		var coords = polygons[n][0];

		// Build upper polygon vertices
		var clockwise = 0;
		var offset = lastIndex * vertexSize;
		for ( var i=0; i < coords.length; i++)
		{
			// Always use coordinates at zero height on vertex construction, height will be taken into account on extrude
			coordinateSystem.fromGeoTo3D([ coords[i][0], coords[i][1], 0.0 ], pos3d);
			vertices[offset] = pos3d[0] - origin[0];
			vertices[offset+1] = pos3d[1] - origin[1];
			vertices[offset+2] = pos3d[2] - origin[2];

			// Find out if its vertices ordered clockwise to build index buffer properly
			if ( i < coords.length - 1 ) {
				clockwise += (coords[i+1][0] - coords[i][0]) * (coords[i+1][1] + coords[i][1]);
			}

			if ( style.extrude )
			{
				// Compute normals
				vec3.normalize(pos3d);
				vertices[offset+3] = pos3d[0];
				vertices[offset+4] = pos3d[1];
				vertices[offset+5] = pos3d[2];
				var extrudeValue;
				if ( typeof style.extrude == "boolean" )
				{
					// Extrude value extracted from KML, use the height coordinate
					extrudeValue = coords[i][2];
				}
				else
				{
					// Extrude value is a float defined by user
					extrudeValue = style.extrude;
				}
				vertices[offset+6] = extrudeValue * coordinateSystem.heightScale;
			}

			offset += vertexSize;
		}

		// Build bottom polygon vertices on extrude
		if ( style.extrude )
		{
			// Use same vertices as upper polygon but resest the 4-th compoenent
			var prevOffset = lastIndex * vertexSize;
			vertices = vertices.concat( vertices.slice(prevOffset, offset) );
			var lastOffset = (offset - prevOffset) + offset;
			// Reset the 4-th component for extrusion
			for ( var i=offset; i < lastOffset; i+= vertexSize)
			{				
				vertices[i+6] = 0.0;
			}
		}
		
		// Build triangle indices for upper polygon
		var triangulator = new PNLTRI.Triangulator();
		var contour = coords.map( function(value) {  return { x: value[0], y: value[1] }; });
		var triangList = triangulator.triangulate_polygon( [ contour ] );
		for ( var i=0; i<triangList.length; i++ )
		{
			indices.push(lastIndex + triangList[i][0], lastIndex + triangList[i][1], lastIndex + triangList[i][2] );
		}


		// Build side triangle indices
		if ( style.extrude )
		{
			var upOffset = lastIndex;
			var lowOffset = lastIndex + coords.length;
			
			for ( var i = 0; i < coords.length-1; i++ )
			{
				// Depending on vertice order, push the
				if ( clockwise > 0 )
				{
					indices.push( upOffset, upOffset + 1, lowOffset );
					indices.push( upOffset + 1, lowOffset + 1, lowOffset );	
				}
				else
				{
					indices.push( upOffset, lowOffset, upOffset + 1 );
					indices.push( upOffset + 1, lowOffset, lowOffset + 1 );
				}
				upOffset += 1;
				lowOffset += 1;
			}
		}

		// Build line indices for upper polygon
		for ( var i = 0; i < coords.length-1; i++ )
		{
			lineIndices.push( lastIndex + i, lastIndex + i + 1 );
		}

		// Build top-to-bottom line indices
		if ( style.extrude )
		{
			var upOffset = lastIndex;
			var lowOffset = lastIndex + coords.length;
			for ( var i = 0; i < coords.length-1; i++ )
			{
				lineIndices.push( upOffset + i, lowOffset + i );
			}
		}

		// Update last index
		lastIndex = vertices.length / vertexSize;
	}

	this.numTriIndices = indices.length;
	this.numLineIndices = lineIndices.length;
	// Index buffer contains triange indices and lines one
	indices = indices.concat(lineIndices);

	// Create vertex buffer
	this.vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array( vertices ), gl.STATIC_DRAW);	

	// Create index buffer
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
		// Since there is only one geometry per bucket
		// return 0 to dispose geometry resources
		return 0;
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
	this.style = style;
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
	
	var currentProgram = null;

	// Compute the viewProj matrix
	var viewProjMatrix = mat4.create();
	mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, viewProjMatrix);
	
	var modelViewProjMatrix = mat4.create();
	for ( var n = start; n < end; n++ )
	{
		var renderable = renderables[n];
		var style = renderable.bucket.style;
		
		// Setup program
		var program = style.extrude ? this.extrudeProgram : this.program;
		if ( program != currentProgram )
		{
			program.apply();
			currentProgram = program;
		}
		
		mat4.multiply(viewProjMatrix,renderable.matrix,modelViewProjMatrix);
		gl.uniformMatrix4fv(program.uniforms["mvp"], false, modelViewProjMatrix);
				
		gl.uniform4f(program.uniforms["u_color"], style.fillColor[0], style.fillColor[1], style.fillColor[2], 
				style.fillColor[3] * renderable.bucket.layer._opacity);  // use fillColor
		
		var vertexSize = style.extrude ? 7 : 3;
		
		gl.bindBuffer(gl.ARRAY_BUFFER, renderable.vertexBuffer);
		gl.vertexAttribPointer(program.attributes['vertex'], 3, gl.FLOAT, false, 4 * vertexSize, 0);
		
		if ( style.extrude )
		{
			gl.vertexAttribPointer(program.attributes['normal'], 4, gl.FLOAT, false, 4 * vertexSize, 12);
			gl.uniform1f(program.uniforms["extrusionScale"], style.extrusionScale);
		}

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderable.indexBuffer);
		
		gl.drawElements( gl.TRIANGLES, renderable.numTriIndices, gl.UNSIGNED_SHORT, 0);
		if ( renderable.numLineIndices > 0 )
		{
			gl.uniform4f(program.uniforms["u_color"], style.strokeColor[0], style.strokeColor[1], style.strokeColor[2], style.strokeColor[3] * renderable.bucket.layer._opacity);  
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
	return (type == "Polygon" || type == "MultiPolygon") && style.fill;
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