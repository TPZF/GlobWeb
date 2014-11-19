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
 
define( ['./Utils','./VectorRenderer','./VectorRendererManager','./FeatureStyle','./Program','./BatchRenderable','./pnltri'], 
	function(Utils,VectorRenderer,VectorRendererManager,FeatureStyle,Program,BatchRenderable,PNLTRI) {

/**************************************************************************************************************/

/** @constructor
 *	Basic renderer for polygon
 */

var PolygonRenderer = function(globe)
{
	VectorRenderer.prototype.constructor.call( this, globe );
	this.maxTilePerGeometry = 2;
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
		//if (u_color.a == 0.0) discard;\n\
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
	BatchRenderable.prototype.constructor.call( this, bucket );

	this.origin = null;
	
	this.vertexSize = bucket.style.extrude ? 7 : 3;
	this.matrix = mat4.create();
}

Utils.inherits(BatchRenderable,PolygonRenderable);

/**************************************************************************************************************/

/**
 * Add a geometry to the renderbale
 * Vertex buffer : geometry|extrude
 * Index buffer : geometry triangles|extrude triangles|lines
 * Normal buffer : normals.xyz, extrude value as w 
 */
PolygonRenderable.prototype.build = function(geometry)
{
	var renderer = this.bucket.renderer;
	var style = this.bucket.style;
	var coordinateSystem = renderer.globe.coordinateSystem;
		
	var polygons =  (geometry.type == "MultiPolygon") ? geometry.coordinates : [geometry.coordinates];
	var pos3d = vec3.create();

	if (!this.origin)
	{
		this.origin = vec3.create();
		coordinateSystem.fromGeoTo3D(polygons[0][0][0], this.origin);

		mat4.identity(this.matrix);
		mat4.translate(this.matrix,this.origin);
	}
	
	var lastIndex = this.vertices.length / this.vertexSize;
	var offset = this.vertices.length;
	
	for ( var n=0; n < polygons.length; n++ ) {

		// Only take into account outer contour for now
		var coords = polygons[n][0];
		
		offset = this.vertices.length;
				
		// Build upper polygon vertices
		var clockwise = 0;
		for ( var i=0; i < coords.length; i++)
		{
			// Always use coordinates at zero height on vertex construction, height will be taken into account on extrude
			coordinateSystem.fromGeoTo3D([ coords[i][0], coords[i][1], 0.0 ], pos3d);
			this.vertices[offset] = pos3d[0] - this.origin[0];
			this.vertices[offset+1] = pos3d[1] - this.origin[1];
			this.vertices[offset+2] = pos3d[2] - this.origin[2];

			// Find out if its vertices ordered clockwise to build index buffer properly
			if ( i < coords.length - 1 ) {
				clockwise += (coords[i+1][0] - coords[i][0]) * (coords[i+1][1] + coords[i][1]);
			}

			if ( style.extrude )
			{
				// Compute normals
				vec3.normalize(pos3d);
				this.vertices[offset+3] = pos3d[0];
				this.vertices[offset+4] = pos3d[1];
				this.vertices[offset+5] = pos3d[2];
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
				this.vertices[offset+6] = extrudeValue * coordinateSystem.heightScale;
			}

			offset += this.vertexSize;
		}

		// Build bottom polygon vertices on extrude
		if ( style.extrude )
		{
			// Use same vertices as upper polygon but resest the 4-th compoenent
			var prevOffset = lastIndex * this.vertexSize;
			this.vertices = this.vertices.concat( this.vertices.slice(prevOffset, offset) );
			// Reset the 4-th component for extrusion
			for ( var i=offset; i < this.vertices.length; i+= this.vertexSize)
			{				
				this.vertices[i+6] = 0.0;
			}
		}
		
		// Build triangle indices for upper polygon
		var triangulator = new PNLTRI.Triangulator();
		var contour = coords.map( function(value) {  return { x: value[0], y: value[1] }; });
		var triangList = triangulator.triangulate_polygon( [ contour ] );
		for ( var i=0; i<triangList.length; i++ )
		{
			this.triIndices.push(lastIndex + triangList[i][0], lastIndex + triangList[i][1], lastIndex + triangList[i][2] );
			//this.lineIndices.push( lastIndex + triangList[i][0], lastIndex + triangList[i][1], lastIndex + triangList[i][1], lastIndex + triangList[i][2], lastIndex + triangList[i][2], lastIndex + triangList[i][0] );
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
					this.triIndices.push( upOffset, upOffset + 1, lowOffset );
					this.triIndices.push( upOffset + 1, lowOffset + 1, lowOffset );	
				}
				else
				{
					this.triIndices.push( upOffset, lowOffset, upOffset + 1 );
					this.triIndices.push( upOffset + 1, lowOffset, lowOffset + 1 );
				}
				upOffset += 1;
				lowOffset += 1;
			}
		}

		// Build line indices for upper polygon
		for ( var i = 0; i < coords.length-1; i++ )
		{
			this.lineIndices.push( lastIndex + i, lastIndex + i + 1 );
		}

		// Build top-to-bottom line indices
		if ( style.extrude )
		{
			var upOffset = lastIndex;
			var lowOffset = lastIndex + coords.length;
			for ( var i = 0; i < coords.length-1; i++ )
			{
				this.lineIndices.push( upOffset + i, lowOffset + i );
			}
		}

		// Update last index
		lastIndex = this.vertices.length / this.vertexSize;
	}
	// Geometry is always added contrary to tiled renderables
	return true;
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
	return this.style == style;
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
		
		renderable.bindBuffers(renderContext);
		gl.lineWidth( style.strokeWidth );
		
		// Setup attributes
		gl.vertexAttribPointer(program.attributes['vertex'], 3, gl.FLOAT, false, 4 * renderable.vertexSize, 0);
		if ( style.extrude )
		{
			gl.vertexAttribPointer(program.attributes['normal'], 4, gl.FLOAT, false, 4 * renderable.vertexSize, 12);
			gl.uniform1f(program.uniforms["extrusionScale"], style.extrusionScale);
		}
				
		// Draw
		gl.drawElements( gl.TRIANGLES, renderable.triIndices.length, renderable.indexType, 0);
		if ( renderable.lineIndices.length > 0 )
		{
			gl.uniform4f(program.uniforms["u_color"], style.strokeColor[0], style.strokeColor[1], style.strokeColor[2], style.strokeColor[3] * renderable.bucket.layer._opacity);  
			var size = renderable.indexType == gl.UNSIGNED_INT ? 4 : 2;
			gl.drawElements( gl.LINES, renderable.lineIndices.length, renderable.indexType, renderable.triIndices.length * size);
		}
	}
	
	// Revert line width
	gl.lineWidth(1.);

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