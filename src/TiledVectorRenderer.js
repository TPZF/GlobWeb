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
	TiledVectorRenderer constructor
 */
GlobWeb.TiledVectorRenderer = function(tileManager)
{
	this.tileManager = tileManager;
	
	// Create a bucket with default style
	// Bucket aggregate features that shares a common style
	this.buckets = [  { style: new GlobWeb.FeatureStyle(), features: [] } ];
	
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

    this.program = new GlobWeb.Program(this.tileManager.renderContext);
    this.program.createFromSource(vertexShader, fragmentShader);
	
	// Customization for different renderer : lineString or polygon
	this.styleEquals = null;
	this.renderableConstuctor = null;
	this.id = "empty";
}

/**************************************************************************************************************/

/**
	Get or create a bucket to store a feature with the given style
 */
GlobWeb.TiledVectorRenderer.prototype.getOrCreateBucket = function( style )
{
	for ( var i = 0; i < this.buckets.length; i++ )
	{
		if ( this.styleEquals(style, this.buckets[i].style ) )
		{
			return this.buckets[i];
		}
	}
	
	var bucket = { style: style, features: [] };
	this.buckets.push( bucket );
	return bucket;
}

/**************************************************************************************************************/

/**
	Get or create a renderable for a tile
 */
GlobWeb.TiledVectorRenderer.prototype.findRenderable = function( style, tile )
{
	if ( tile.extension[this.id] )
	{
		var renderables = tile.extension[this.id].renderables;
		for ( var i = 0; i < renderables.length; i++ )
		{
			if ( renderables[i].style == style )
			{
				return renderables[i];
			}
		}
	}

	return null;
}

/**************************************************************************************************************/

/**
	Remove a feature from the tile
 */
GlobWeb.TiledVectorRenderer.prototype.removeFeatureFromTile = function( style, feature, tile )
{
	if ( tile.extension[this.id] )
	{
		var renderables = tile.extension[this.id].renderables;
		for ( var i = 0; i < renderables.length; i++ )
		{
			if ( renderables[i].style == style )
			{
				if ( renderables[i].removeFeature( feature ) && tile.children )
				{
					// Remove the feature from loaded children
					for ( var i = 0; i < 4; i++ )
					{
						if ( tile.children[i].state == GlobWeb.Tile.State.LOADED )
						{
							this.removeFeatureFromTile( style, feature, tile.children[i] );
						}
					}
				}
			}
		}
	}
}

/**************************************************************************************************************/

/**
	Remove a feature from the renderer
 */
GlobWeb.TiledVectorRenderer.prototype.removeFeature = function( feature )
{
	var rendererStyle = null;
	
	// Remove feature from buckets
	for ( var i = 0; i < this.buckets.length; i++ )
	{
		var index = this.buckets[i].features.indexOf( feature );
		if ( index != -1 )
		{
			rendererStyle = this.buckets[i].styles;
			this.buckets[i].features.splice( index, 1 );
		}
	}
	
	// Remove feature using style
	if ( rendererStyle )
	{
		for ( var i = 0; i < this.tileManager.level0Tiles.length; i++ )
		{
			this.removeFeatureFromTile( rendererStyle, feature, this.tileManager.level0Tiles[i] );
		}
	}
}

/**************************************************************************************************************/

/**
	Get or create a style
 */
GlobWeb.TiledVectorRenderer.prototype.cleanup = function( tile )
{
	if ( tile.extension[this.id] )
	{
		tile.extension[this.id].dispose();
		delete tile.extension[this.id];
	}
}

/**************************************************************************************************************/

/**
	Add a feature to the renderer.
	Public method to add feature to the renderer
 */
GlobWeb.TiledVectorRenderer.prototype.addFeature = function( feature, style )
{
	var bucket = this.getOrCreateBucket( style );
	bucket.features.push( feature );
	
	for ( var i = 0; i < this.tileManager.level0Tiles.length; i++ )
	{
		var tile = this.tileManager.level0Tiles[i];
		if ( tile.state == GlobWeb.Tile.State.LOADED )
			this.addFeatureToTile( bucket.style, feature, tile );
	}
}

/**************************************************************************************************************/

/**
	Add a feature to the given tile.
	The method is recursive, it will also add the feature to children if exists
 */
GlobWeb.TiledVectorRenderer.prototype.addFeatureToTile = function( style, feature, tile )
{
	var isNewRenderable = false;
	
	// Try to find an existing renderable on the tile
	var renderable = this.findRenderable( style, tile );
	
	// If no renderable on the tile, create a new renderable (or reuse an existing one)
	if ( !renderable )
	{
		renderable = new this.renderableConstuctor(style,this.tileManager.renderContext.gl);
		isNewRenderable = true;
	}
	
	if ( renderable.addFeature( feature, tile ) && tile.children )
	{
		// Add the feature to loaded children
		for ( var i = 0; i < 4; i++ )
		{
			if ( tile.children[i].state == GlobWeb.Tile.State.LOADED )
			{
				this.addFeatureToTile( style, feature, tile.children[i] );
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

/** @constructor
	TiledVectorRenderer.TileData constructor
 */
GlobWeb.TiledVectorRenderer.TileData = function()
{
	this.renderables = [];
}

/**************************************************************************************************************/

/**
	Dispose renderable data from tile
 */
GlobWeb.TiledVectorRenderer.TileData.prototype.dispose = function()
{
	for ( var i=0; i < this.renderables.length; i++ )
	{
		this.renderables[i].dispose();
	}
	this.renderables.length = 0;
}

/**************************************************************************************************************/

/**
	Add a renderable to the tile
 */
GlobWeb.TiledVectorRenderer.prototype.addRenderableToTile = function( tile, renderable )
{
	if ( renderable.vertices.length > 0 )
	{
		if ( !tile.extension[this.id] )
			tile.extension[this.id] = new GlobWeb.TiledVectorRenderer.TileData();
		
		tile.extension[this.id].renderables.push( renderable );
	}
}

/**************************************************************************************************************/

/**
	Generate line string renderable data on the tile
 */
GlobWeb.TiledVectorRenderer.prototype.generate = function( tile )
{
	if ( tile.parent )
	{	
		// Only add feature from parent tile (if any)
		var ls = tile.parent.extension[this.id];
		var ll = ls ?  ls.renderables.length : 0;
		for ( var i = 0; i < ll; i++ )
		{
			var parentRenderable = ls.renderables[i];
			var renderable = new this.renderableConstuctor(parentRenderable.style,this.tileManager.renderContext.gl);
			
			for ( var j = 0; j < parentRenderable.featureInfos.length; j++ )
			{
				renderable.addFeature( parentRenderable.featureInfos[j].feature, tile );
			}
			
			this.addRenderableToTile(tile,renderable);
		}
	}
	else
	{
		// No parent tile : traverse all features to generate data on tile
		for ( var i = 0; i < this.buckets.length; i++ )
		{
			var bucket = this.buckets[i];
			var renderable = new this.renderableConstuctor(bucket.style,this.tileManager.renderContext.gl);
			
			for ( var j = 0; j < bucket.features.length; j++ )
			{
				renderable.addFeature( bucket.features[j], tile );
			}
			
			this.addRenderableToTile(tile,renderable);
		}
	}
}

/**************************************************************************************************************/

/**
	Render all redenrable on the given tiles
 */
GlobWeb.TiledVectorRenderer.prototype.render = function( visibleTiles )
{
	var renderContext = this.tileManager.renderContext;
	var gl = renderContext.gl;
	
	var modelViewMatrix = mat4.create();
	
    // Setup program
    this.program.apply();
	
	gl.depthFunc(gl.LEQUAL);
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
				if ( renderable.style != currentStyle )
				{
					currentStyle = renderable.style;
					gl.lineWidth( currentStyle.strokeWidth );
					gl.uniform4f( this.program.uniforms["color"], currentStyle.strokeColor[0], currentStyle.strokeColor[1], currentStyle.strokeColor[2], currentStyle.strokeColor[3] );
 				}
				
				renderables[j].render( this.program.attributes );
			}
		}
		// If the tile is not loaded, but its parent contains some renderable, render them 'clipped' to the child tile to avoid 'glitch' when zooming
		else if ( tile.state != GlobWeb.Tile.State.LOADED && tile.parent.extension[this.id] )
		{
			mat4.multiply( renderContext.viewMatrix, tile.parent.matrix, modelViewMatrix );
			gl.uniformMatrix4fv( this.program.uniforms["modelViewMatrix"], false, modelViewMatrix );
			gl.uniform1f( this.program.uniforms["zOffset"], tile.parent.radius * 0.0007 );
			
			var renderables = tile.parent.extension[this.id].renderables;
			for (var j=0; j < renderables.length; j++)
			{
				var renderable = renderables[j];
				if ( renderable.style != currentStyle )
				{
					currentStyle = renderable.style;
					gl.lineWidth( currentStyle.strokeWidth );
					gl.uniform4f( this.program.uniforms["color"], currentStyle.strokeColor[0], currentStyle.strokeColor[1], currentStyle.strokeColor[2], currentStyle.strokeColor[3] );
 				}
				
				renderables[j].renderChild( this.program.attributes, tile.parentIndex );
			}
		
		}
    }

	gl.depthFunc(gl.LESS);
}

/**************************************************************************************************************/
