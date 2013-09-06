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

 define( ['./Program','./FeatureStyle','./Tile','./RendererTileData'], function(Program,FeatureStyle,Tile,RendererTileData) {

/**************************************************************************************************************/


/** @constructor
	TiledVectorRenderer constructor
 */
var TiledVectorRenderer = function(tileManager)
{
	this.tileManager = tileManager;
	
	// Create a bucket with default style
	// Bucket aggregate geometries that shares a common style
	this.buckets = [  { style: new FeatureStyle(), geometries: [] } ];
	
	var vertexShader = "\
	attribute vec3 vertex; \n\
	uniform float zOffset; \n\
	uniform mat4 modelViewMatrix;\n\
	uniform mat4 projectionMatrix;\n\
	\n\
	void main(void)  \n\
	{ \n\
		gl_Position = projectionMatrix * modelViewMatrix * vec4(vertex.x, vertex.y, vertex.z + zOffset, 1.0); \n\
	} \n\
	";
	
	var fragmentShader = "\
	#ifdef GL_ES \n\
	precision highp float; \n\
	#endif \n\
	uniform vec4 color; \n\
	\n\
	void main(void) \n\
	{ \n\
		gl_FragColor = color; \n\
	} \n\
	";

    this.program = new Program(this.tileManager.renderContext);
    this.program.createFromSource(vertexShader, fragmentShader);
	
	// Customization for different renderer : lineString or polygon
	this.styleEquals = null;
	this.renderableConstuctor = null;
	this.id = "empty"
	
	this.needsOffset = true;
}

/**************************************************************************************************************/

/**
	Get or create a bucket to store a feature with the given style
 */
TiledVectorRenderer.prototype.getOrCreateBucket = function( layer, style )
{
	for ( var i = 0; i < this.buckets.length; i++ )
	{
		if ( this.buckets[i].layer == layer && this.styleEquals(style, this.buckets[i].style ) )
		{
			return this.buckets[i];
		}
	}
	
	var bucket = { layer: layer, style: style, geometries: [] };
	this.buckets.push( bucket );
	return bucket;
}

/**************************************************************************************************************/

/**
	Remove a geometry from the tile
 */
TiledVectorRenderer.prototype.removeGeometryFromTile = function( bucket, geometry, tile )
{
	var renderable;
	if ( tile.extension[this.id] )
	{
		renderable = tile.extension[this.id].getRenderable( bucket );
	}
	if ( renderable && renderable.removeGeometry( geometry ) && tile.children )
	{
		// Remove the geometry from loaded children
		for ( var i = 0; i < 4; i++ )
		{
			if ( tile.children[i].state == Tile.State.LOADED )
			{
				this.removeGeometryFromTile( bucket, geometry, tile.children[i] );
			}
		}
	}
}

/**************************************************************************************************************/

/**
	Remove a geometry from the renderer
 */
TiledVectorRenderer.prototype.removeGeometry = function( geometry, layer )
{
	var foundBucket = null;
	
	// Remove geometry from buckets
	for ( var i = 0; i < this.buckets.length && !foundBucket; i++ )
	{
		var bucket = this.buckets[i];
		if ( bucket.layer == layer ) 
		{
			var index = bucket.geometries.indexOf( geometry );
			if ( index != -1 )
			{
				bucket = this.buckets[i];
				bucket.geometries.splice( index, 1 );
				foundBucket = bucket;
			}
		}
	}
	
	// Remove geometry 
	if ( foundBucket )
	{
		for ( var i = 0; i < this.tileManager.level0Tiles.length; i++ )
		{
			this.removeGeometryFromTile( foundBucket, geometry, this.tileManager.level0Tiles[i] );
		}
	}
}

/**************************************************************************************************************/

/**
	Clean-up a tile
	TODO : the method is only used by TileManager.removePostRenderer, maybe remove it, TileManager can use directly the extension id.
 */
TiledVectorRenderer.prototype.cleanupTile = function( tile )
{
	if ( tile.extension[this.id] )
	{
		tile.extension[this.id].dispose();
		delete tile.extension[this.id];
	}
}

/**************************************************************************************************************/

/**
	Add a geometry to the renderer.
	Public method to add geometry to the renderer
 */
TiledVectorRenderer.prototype.addGeometry = function( geometry, layer, style )
{
	var bucket = this.getOrCreateBucket( layer, style );
	bucket.geometries.push( geometry );
	
	for ( var i = 0; i < this.tileManager.level0Tiles.length; i++ )
	{
		var tile = this.tileManager.level0Tiles[i];
		if ( tile.state == Tile.State.LOADED )
			this.addGeometryToTile( bucket, geometry, tile );
	}
}

/**************************************************************************************************************/

/**
	Add a geometry to the given tile.
	The method is recursive, it will also add the geometry to children if exists
 */
TiledVectorRenderer.prototype.addGeometryToTile = function( bucket, geometry, tile )
{
	var isNewRenderable = false;
	
	// Try to find an existing renderable on the tile
	var renderable;
	if ( tile.extension[this.id] )
	{
		renderable = tile.extension[this.id].getRenderable( bucket );
	}
	
	// If no renderable on the tile, create a new renderable (or reuse an existing one)
	if ( !renderable )
	{
		renderable = new this.renderableConstuctor(bucket,this.tileManager.renderContext.gl);
		isNewRenderable = true;
	}
	
	if ( renderable.addGeometry( geometry, tile ) && tile.children )
	{
		// Recursively add the geometry to loaded children
		for ( var i = 0; i < 4; i++ )
		{
			if ( tile.children[i].state == Tile.State.LOADED )
			{
				this.addGeometryToTile( bucket, geometry, tile.children[i] );
			}
		}
	}
	
	// 	If the renderable is new, add it to the tile
	if (isNewRenderable)
	{
		this.addRenderableToTile(tile,renderable);
	}
}

/**************************************************************************************************************/

/**
	Add a renderable to the tile
 */
TiledVectorRenderer.prototype.addRenderableToTile = function( tile, renderable )
{
	if ( renderable.vertices.length > 0 )
	{
		if ( !tile.extension[this.id] )
			tile.extension[this.id] = new RendererTileData();
		
		tile.extension[this.id].renderables.push( renderable );
	}
}

/**************************************************************************************************************/

/**
	Generate renderable data on the tile
 */
TiledVectorRenderer.prototype.generate = function( tile )
{
	if ( tile.parent )
	{	
		// Only add geometry from parent tile (if any)
		var ls = tile.parent.extension[this.id];
		var ll = ls ?  ls.renderables.length : 0;
		for ( var i = 0; i < ll; i++ )
		{
			var parentRenderable = ls.renderables[i];
			var renderable = new this.renderableConstuctor(parentRenderable.bucket,this.tileManager.renderContext.gl);
			
			var parentGeometryInfos = parentRenderable.geometryInfos;
			for ( var j = 0; j < parentGeometryInfos.length; j++ )
			{
				renderable.addGeometry( parentGeometryInfos[j].geometry, tile );
			}
			
			this.addRenderableToTile(tile,renderable);
		}
	}
	else
	{
		// No parent tile : traverse all geometries to generate data on tile
		for ( var i = 0; i < this.buckets.length; i++ )
		{
			var bucket = this.buckets[i];
			var renderable = new this.renderableConstuctor(bucket,this.tileManager.renderContext.gl);
			
			for ( var j = 0; j < bucket.geometries.length; j++ )
			{
				renderable.addGeometry( bucket.geometries[j], tile );
			}
			
			this.addRenderableToTile(tile,renderable);
		}
	}
}

/**************************************************************************************************************/

/**
	Render all redenrable on the given tiles
 */
TiledVectorRenderer.prototype.render = function( visibleTiles )
{
	var renderContext = this.tileManager.renderContext;
	var gl = renderContext.gl;
	
	var modelViewMatrix = mat4.create();
	
    // Setup program
    this.program.apply();
	
	gl.depthFunc(gl.LEQUAL);
	// Do not write into z-buffer : the tiled vector are clamped to terrain, so the z of terrain should not change
	gl.depthMask(false);
 	gl.uniformMatrix4fv( this.program.uniforms["projectionMatrix"], false, renderContext.projectionMatrix);
    
	var currentStyle = null;
	
    for (var i = 0; i < visibleTiles.length; ++i)
    {
		var tile = visibleTiles[i];
		
		// If the tile is loaded and contains renderable, render them
		if ( tile.extension[this.id] )
		{
			mat4.multiply( renderContext.viewMatrix, tile.matrix, modelViewMatrix );
			gl.uniformMatrix4fv( this.program.uniforms["modelViewMatrix"], false, modelViewMatrix );
			gl.uniform1f( this.program.uniforms["zOffset"], tile.radius * 0.0007 );
			
			var renderables = tile.extension[this.id].renderables;
			for (var j=0; j < renderables.length; j++)
			{
				var renderable = renderables[j];
				
				if ( renderable.bucket.layer._visible )
				{
					if ( renderable.bucket.style != currentStyle )
					{
						currentStyle = renderable.bucket.style;
						gl.lineWidth( currentStyle.strokeWidth );
						gl.uniform4f( this.program.uniforms["color"], currentStyle.strokeColor[0], currentStyle.strokeColor[1], currentStyle.strokeColor[2], 
							currentStyle.strokeColor[3] * renderable.bucket.layer._opacity );
							
						// TODO : manage opacity
					}
					
					renderables[j].render( this.program.attributes );
				}
			}
		}
		// If the tile is not loaded, but its parent contains some renderable, render them 'clipped' to the child tile to avoid 'glitch' when zooming
		else if ( tile.state != Tile.State.LOADED && tile.parent.extension[this.id] )
		{
			mat4.multiply( renderContext.viewMatrix, tile.parent.matrix, modelViewMatrix );
			gl.uniformMatrix4fv( this.program.uniforms["modelViewMatrix"], false, modelViewMatrix );
			gl.uniform1f( this.program.uniforms["zOffset"], tile.parent.radius * 0.0007 );
			
			var renderables = tile.parent.extension[this.id].renderables;
			for (var j=0; j < renderables.length; j++)
			{
				var renderable = renderables[j];
				if ( renderable.bucket.layer._visible )
				{
					if ( renderable.bucket.style != currentStyle )
					{
						currentStyle = renderable.bucket.style;
						gl.lineWidth( currentStyle.strokeWidth );
						gl.uniform4f( this.program.uniforms["color"], currentStyle.strokeColor[0], currentStyle.strokeColor[1], currentStyle.strokeColor[2], 
							currentStyle.strokeColor[3] * renderable.bucket.layer._opacity );
							
						// TODO : manage opacity
					}
					
					renderables[j].renderChild( this.program.attributes, tile.parentIndex );
				}
			}
		
		}
    }

	gl.depthMask(true);
	gl.depthFunc(gl.LESS);
}

/**************************************************************************************************************/

return TiledVectorRenderer;

});
