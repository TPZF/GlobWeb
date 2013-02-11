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



/**************************************************************************************************************/

/** @constructor
	ConvexPolygonRenderer constructor
 */
GlobWeb.ConvexPolygonRenderer = function(tileManager)
{
	// Store object for rendering
	this.renderContext = tileManager.renderContext;
	this.tileConfig = tileManager.tileConfig;
	
	// Bucket management for rendering : a bucket is a texture with its points
	this.buckets = [];
	 	
	var vertexShader = "\
	attribute vec3 vertex;\n\
	uniform mat4 viewProjectionMatrix;\n\
	\n\
	void main(void)\n\
	{\n\
		gl_Position = viewProjectionMatrix * vec4(vertex, 1.0);\n\
	}\n\
	";
	
	var fragmentShader = "\
	precision highp float; \n\
	uniform vec4 color; \n\
	\n\
	void main(void) \n\
	{ \n\
		gl_FragColor = color; \n\
	} \n\
	";
	
	this.program = new GlobWeb.Program(this.renderContext);
	this.program.createFromSource(vertexShader, fragmentShader);
	
	this.frameNumber = 0;
	this.gid = 0;
}

GlobWeb.ConvexPolygonRenderer.Renderable = function(bucket) 
{
	this.bucket = bucket;
	this.geometry2vb = {};
	this.vertices = [];
	this.lineIndices = [];
	this.triangleIndices = [];
	this.vertexBuffer = null;
	this.lineIndexBuffer = null;
	this.triangleIndexBuffer = null;
	this.bufferDirty = false;
}
GlobWeb.ConvexPolygonRenderer.Renderable.prototype.add = function(geometry)
{
	var coords = geometry['coordinates'][0];
	var numPoints = coords.length-1;
	this.geometry2vb[ geometry.gid ] = {
		vertexStart: this.vertices.length,
		vertexCount: 3 * numPoints,
		lineIndexStart: this.lineIndices.length,
		lineIndexCount: 2 * numPoints,
		triIndexStart: this.triangleIndices.length,
		triIndexCount: 3 * (numPoints-2)
	};
	
	var startIndex = this.vertices.length / 3;
	for ( var i = 0; i < numPoints; i++ ) 
	{
		var pt = GlobWeb.CoordinateSystem.fromGeoTo3D( coords[i] );
		this.vertices.push( pt[0], pt[1], pt[2] );
		this.lineIndices.push( startIndex + i, startIndex + ((i+1) % numPoints) );
	}
	
	if ( this.bucket.style.fill ) 
	{
		for ( var i = 0; i < numPoints-2; i++ ) 
		{
			this.triangleIndices.push( 0, i+1, i+2 );
		}
	}
	
	this.bufferDirty = true;
}
GlobWeb.ConvexPolygonRenderer.Renderable.prototype.remove = function(geometry)
{
	if ( this.geometry2vb.hasOwnProperty(geometry.gid) )
	{
		var data = this.geometry2vb[ geometry.gid ];
		delete this.geometry2vb[ geometry.gid ];
		
		for ( var i = data.lineIndexStart+data.lineIndexCount; i < this.lineIndices.length; i++ ) 
		{
			this.lineIndices[i] -= (data.vertexCount/3);
		}
		for ( var i = data.triIndexStart+data.triIndexCount; i < this.triangleIndices.length; i++ ) 
		{
			this.triangleIndices[i] -= (data.vertexCount/3);
		}

		this.vertices.splice( data.vertexStart, data.vertexCount );
		this.lineIndices.splice( data.lineIndexStart, data.lineIndexCount );
		this.triangleIndices.splice( data.triIndexStart, data.triIndexCount );
		
		for ( var g in this.geometry2vb ) 
		{
			if ( g ) 
			{
				var d = this.geometry2vb[g];
				if ( d.vertexStart > data.vertexStart ) 
				{
					d.vertexStart -= data.vertexCount;
					d.indexStart -= data.indexCount;
				}
			}
		}
		
		this.bufferDirty = true;
	}
}
GlobWeb.ConvexPolygonRenderer.Renderable.prototype.dispose = function(renderContext)
{
	if ( this.vertexBuffer ) 
	{
		renderContext.gl.deleteBuffer( this.vertexBuffer );
	}
	if ( this.lineIndexBuffer ) 
	{
		renderContext.gl.deleteBuffer( this.lineIndexBuffer );
	}
	if ( this.triangleIndexBuffer ) 
	{
		renderContext.gl.deleteBuffer( this.triangleIndexBuffer );
	}
}

/**************************************************************************************************************/

/** @constructor
	ConvexPolygonRenderer.TileData constructor
 */
GlobWeb.ConvexPolygonRenderer.TileData = function()
{
	this.renderables = [];
	this.frameNumber = -1;
}

/**************************************************************************************************************/

/**
	Get or create a renderable from the tile
 */
GlobWeb.ConvexPolygonRenderer.TileData.prototype.getOrCreateRenderable = function(bucket)
{
	for ( var i=0; i < this.renderables.length; i++ )
	{
		if ( bucket == this.renderables[i].bucket )
		{
			return this.renderables[i];
		}
	}
	var renderable = new GlobWeb.ConvexPolygonRenderer.Renderable(bucket);
	this.renderables.push( renderable );
	return renderable;
}

/**************************************************************************************************************/

/**
	Dispose renderable data from tile
 */
GlobWeb.ConvexPolygonRenderer.TileData.prototype.dispose = function(renderContext)
{
	for ( var i=0; i < this.renderables.length; i++ )
	{
		this.renderables[i].dispose(renderContext);
	}
	this.renderables.length = 0;
}

/**************************************************************************************************************/

/**
	Add a point to the renderer
 */
GlobWeb.ConvexPolygonRenderer.prototype.addGeometryToTile = function(bucket,geometry,tile)
{
	var tileData = tile.extension.polygon;
	if (!tileData)
	{
		tileData = tile.extension.polygon = new GlobWeb.ConvexPolygonRenderer.TileData();
	}
	if (!geometry.gid)
	{
		geometry.gid = this.gid++;
	}
	var renderable = tileData.getOrCreateRenderable(bucket);
	renderable.add(geometry);

}

/**************************************************************************************************************/

/**
	Remove a point from the renderer
 */
GlobWeb.ConvexPolygonRenderer.prototype.removeGeometryFromTile = function(geometry,tile)
{
	var tileData = tile.extension.polygon;
	if (tileData)
	{
		for ( var i=0; i < tileData.renderables.length; i++ )
		{
			tileData.renderables[i].remove(geometry);
		}
	}
}

GlobWeb.ConvexPolygonRenderer.prototype.removeGeometry = function()
{
}

/**************************************************************************************************************/

/*
	Get or create bucket to render a point
 */
GlobWeb.ConvexPolygonRenderer.prototype.getOrCreateBucket = function(layer,style)
{
	// Find an existing bucket for the given style, except if label is set, always create a new one
	for ( var i = 0; i < this.buckets.length; i++ )
	{
		var bucket = this.buckets[i];
		if ( bucket.layer == layer 
			&& bucket.style.strokeColor[0] == style.strokeColor[0]
			&& bucket.style.strokeColor[1] == style.strokeColor[1]
			&& bucket.style.strokeColor[2] == style.strokeColor[2]
			&& bucket.fill == style.fill )
		{
			return bucket;
		}
	}

	var gl = this.renderContext.gl;
	var vb = gl.createBuffer();


	// Create a bucket
	var bucket = {
		style: new GlobWeb.FeatureStyle(style),
		layer: layer		
	};
		
	this.buckets.push( bucket );
	
	return bucket;
}

/**************************************************************************************************************/

/*
	Render all the POIs
 */
GlobWeb.ConvexPolygonRenderer.prototype.render = function(tiles)
{	
	var renderContext = this.renderContext;
	var gl = this.renderContext.gl;
	
	// Setup states
	gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendEquation(gl.FUNC_ADD);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	// Setup program
	this.program.apply();
	
	// The shader only needs the viewProjection matrix, use GlobWeb.modelViewMatrix as a temporary storage
	mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, renderContext.modelViewMatrix)
	gl.uniformMatrix4fv(this.program.uniforms["viewProjectionMatrix"], false, renderContext.modelViewMatrix);
	
	for ( var n = 0; n < tiles.length; n++ )
	{
		var tile = tiles[n];
		var tileData = tile.extension.polygon;
		while (tile.parent && !tileData)
		{
			tile = tile.parent;
			tileData = tile.extension.polygon;
		}
		
		if (!tileData || tileData.frameNumber == renderContext.frameNumber)
			continue;
		
		tileData.frameNumber = this.frameNumber;
		
		for (var i=0; i < tileData.renderables.length; i++ ) 
		{
			var renderable = tileData.renderables[i];
			if (!renderable.bucket.layer._visible)
				continue;
			var color = renderable.bucket.style.strokeColor;
			gl.uniform4f(this.program.uniforms["color"], color[0], color[1], color[2], renderable.bucket.layer._opacity );
				
			if ( !renderable.vertexBuffer )
			{
				renderable.vertexBuffer = gl.createBuffer();
				renderable.lineIndexBuffer = gl.createBuffer();
			}
			
			gl.bindBuffer(gl.ARRAY_BUFFER, renderable.vertexBuffer);
			gl.vertexAttribPointer(this.program.attributes['vertex'], 3, gl.FLOAT, false, 0, 0);
		
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderable.lineIndexBuffer);
			
			if ( renderable.bufferDirty )
			{
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(renderable.vertices), gl.STATIC_DRAW);
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(renderable.lineIndices), gl.STATIC_DRAW);
			}

			gl.drawElements( gl.LINES, renderable.lineIndices.length, gl.UNSIGNED_SHORT, 0);
			
			if ( renderable.bucket.style.fill ) 
			{
				if ( !renderable.triangleIndexBuffer )
				{
					renderable.triangleIndexBuffer = gl.createBuffer();
				}
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderable.triangleIndexBuffer);
				if ( renderable.bufferDirty )
				{
					gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(renderable.triangleIndices), gl.STATIC_DRAW);
				}
				
				gl.drawElements( gl.TRIANGLES, renderable.triangleIndices.length, gl.UNSIGNED_SHORT, 0);
			}
			renderable.bufferDirty = false;
		}
			
		
	}

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
	
	this.frameNumber++;
}


/**************************************************************************************************************/

// Register the renderer
GlobWeb.VectorRendererManager.registerRenderer({
			id: "ConvexPolygon",
			creator: function(globe) { return new GlobWeb.ConvexPolygonRenderer(globe.tileManager); },
			canApply: function(type,style) {return false; }
		});