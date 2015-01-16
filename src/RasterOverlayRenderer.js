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

define( ['./Program','./Tile','./ImageRequest','./RendererTileData'], function(Program, Tile, ImageRequest, RendererTileData) {

/**************************************************************************************************************/

/** 
	@constructor
	RasterOverlayRenderer constructor
 */
var RasterOverlayRenderer = function(globe)
{
	this.vertexShader = "\
	attribute vec3 vertex;\n\
	attribute vec2 tcoord;\n\
	uniform mat4 modelViewMatrix;\n\
	uniform mat4 projectionMatrix;\n\
	uniform vec4 textureTransform; \n\
	varying vec2 texCoord;\n\
	void main(void) \n\
	{\n\
		gl_Position = projectionMatrix * modelViewMatrix * vec4(vertex, 1.0);\n\
		texCoord = tcoord * textureTransform.xy + textureTransform.zw;\n\
	}\n\
	";

	this.fragmentShader = "\
	precision lowp float;\n\
	varying vec2 texCoord;\n\
	uniform sampler2D overlayTexture;\n\
	uniform float opacity; \n\
	void main(void)\n\
	{\n\
		gl_FragColor.rgba = texture2D(overlayTexture, texCoord.xy); \n\
		gl_FragColor.a *= opacity; \n\
	}\n\
	";
	
	this.rendererManager = globe.vectorRendererManager;
	this.tileManager = globe.tileManager;
	this.programs = [];
	this.program = this.createProgram( {
		vertexCode: this.vertexShader,
		fragmentCode: this.fragmentShader,
		updateUniforms: null
	});
	
	this.buckets = [];
	this.imageRequests = [];
	this.frameNumber = 0;
	
	
	var self = this;
	for ( var i = 0; i < 4; i++ ) {
		var imageRequest = new ImageRequest({
			successCallback: function(){
				if ( this.renderable )
				{
					if ( this.renderable.bucket.layer.handleImage )
						this.renderable.bucket.layer.handleImage(this);

					this.renderable.ownTexture = self.tileManager.tilePool.createGLTexture(this.image);
					this.renderable.texture = this.renderable.ownTexture;
					this.renderable.uvScale = 1.0;
					this.renderable.uTrans = 0.0;
					this.renderable.vTrans = 0.0;
					this.renderable.updateChildrenTexture();
					this.renderable.onRequestFinished(true);
					this.renderable = null;
					self.tileManager.renderContext.requestFrame();
				}
			},
			failCallback: function(){
				if ( this.renderable )
				{
					this.renderable.onRequestFinished(true);
					this.renderable = null;
				}
			},
			abortCallback: function(){
				//console.log("Raster overlay request abort.");
				if ( this.renderable )
				{
					this.renderable.onRequestFinished(false);
					this.renderable = null;
				}
			}
		});

		this.imageRequests.push( imageRequest );
	}
}

/**************************************************************************************************************/

/** 
	@constructor
	Create a renderable for the overlay.
	There is one renderable per overlay and per tile.
 */
var RasterOverlayRenderable = function( bucket )
{
	this.bucket = bucket;
	this.ownTexture = null;
	this.texture = null;
	this.request = null;
	this.requestFinished = false;
	this.tile = null;
	this.uvScale = 1.0;
	this.uTrans = 0.0;
	this.vTrans = 0.0;
}

/**************************************************************************************************************/

/** 
	Called when a request is started
 */
RasterOverlayRenderable.prototype.onRequestStarted = function(request)
{
	this.request = request;
	this.requestFinished = false;
	var layer = this.bucket.layer;
	if ( layer._numRequests == 0 )
	{
		layer.globe.publish('startLoad',layer);
	}
	layer._numRequests++;
}

/**************************************************************************************************************/

/** 
	Called when a request is finished
 */
RasterOverlayRenderable.prototype.onRequestFinished = function(completed)
{
	this.request = null;
	this.requestFinished = completed;
	var layer = this.bucket.layer;
	layer._numRequests--;
	if ( layer.globe && layer._numRequests == 0 )
	{
		layer.globe.publish('endLoad',layer);
	}
}

/**************************************************************************************************************/

/**
 * Initialize a child renderable
 */
RasterOverlayRenderable.prototype.initChild = function(i,j,childTile)
{				
	// Request finished and no texture  : no init needed for children
/*	// TODO : does not work because sometimes level 0 cannot be loaded
	if (this.requestFinished && !this.ownTexture)
		return null;*/
		
	var renderable = this.bucket.createRenderable();
	renderable.tile = childTile;	
	if ( this.texture )
	{
		renderable.texture = this.texture;
		renderable.uvScale = this.uvScale;
		renderable.uTrans = this.uTrans;
		renderable.vTrans = this.vTrans;
	}
	
	return renderable;
}

/**************************************************************************************************************/

/** 
	Generate child renderable
 */
RasterOverlayRenderable.prototype.generateChild = function( tile )
{
	// Request finished and no texture  : no generate needed for children
/*	// TODO : does not work because sometimes level 0 cannot be loaded
	if (this.requestFinished && !this.ownTexture)
		return;*/

	var r = this.bucket.renderer;
	r.addOverlayToTile( tile, this.bucket, this );
}

/**************************************************************************************************************/

/** 
	Update the children texture
 */
 RasterOverlayRenderable.prototype.updateChildrenTexture = function()
{
	if ( this.tile.children )
	{
		for ( var i = 0; i < 4; i++ )
		{
			var rd = this.tile.children[i].extension.renderer;
			if ( rd )
			{
				var cr = rd.getRenderable(this.bucket);
				if ( cr && !cr.ownTexture )
				{
					cr.updateTextureFromParent( this );
					cr.updateChildrenTexture();
				}
			}
		}
	}
}

/**************************************************************************************************************/

/** 
	Update texture from its parent
 */
RasterOverlayRenderable.prototype.updateTextureFromParent = function( parent )
{
	if ( this.tile.state == Tile.State.LOADED )
	{
		this.texture = parent.texture;
		this.uvScale = parent.uvScale * 0.5;
		this.uTrans = parent.uTrans;
		this.vTrans = parent.vTrans;
		
		this.uTrans += (this.tile.parentIndex & 1) ? this.uvScale : 0;
		this.vTrans += (this.tile.parentIndex & 2) ? this.uvScale : 0;
	}
	else
	{
		this.texture = parent.texture;
		this.uvScale = parent.uvScale;
		this.uTrans = parent.uTrans;
		this.vTrans = parent.vTrans;
	}
}

/**************************************************************************************************************/

/** 
	Traverse renderable : add it to renderables list if there is a texture
	Request the texture
 */
 RasterOverlayRenderable.prototype.traverse = function( manager, tile, isLeaf  )
{
	if ( isLeaf && this.texture )
	{
		manager.renderables.push( this );
	}
	
	if (!this.requestFinished && this.tile.state == Tile.State.LOADED)
	{
		this.bucket.renderer.requestOverlayTextureForTile( this);
	}
}

/**************************************************************************************************************/

/** 
	Dispose the renderable
 */
RasterOverlayRenderable.prototype.dispose = function(renderContext,tilePool)
{
	if ( this.ownTexture ) 
	{
		tilePool.disposeGLTexture(this.ownTexture);
		this.ownTexture = null;
	}
}


/**************************************************************************************************************/

/**
	Bucket constructor for RasterOverlay
 */
var Bucket = function(layer)
{
	this.layer = layer;
	this.renderer = null;
	// TODO : hack
	this.style = layer;
}

/**************************************************************************************************************/

/**
	Create a renderable for this bucket
 */
Bucket.prototype.createRenderable = function()
{
	return new RasterOverlayRenderable(this);
}

/**************************************************************************************************************/

/**
	Add an overlay into the renderer.
	The overlay is added to all loaded tiles.
 */
RasterOverlayRenderer.prototype.addOverlay = function( overlay )
{
	// Initialize num requests to 0
	overlay._numRequests = 0;

	var bucket = new Bucket(overlay);
	bucket.renderer = this;
	bucket.id = this.rendererManager.bucketId++;
	this.buckets.push( bucket );
	
	overlay._bucket = bucket;
	
	for ( var i = 0; i < this.tileManager.level0Tiles.length; i++ )
	{
		var tile = this.tileManager.level0Tiles[i];
		if ( tile.state == Tile.State.LOADED )
		{
			this.addOverlayToTile( tile, bucket );
		}
	}
}

/**************************************************************************************************************/

/**
	Remove an overlay
	The overlay is removed from all loaded tiles.
 */
RasterOverlayRenderer.prototype.removeOverlay = function( overlay )
{
	var index = this.buckets.indexOf( overlay._bucket );
	this.buckets.splice(index,1);
	
	var rc = this.tileManager.renderContext;
	var tp = this.tileManager.tilePool;
	this.tileManager.visitTiles( function(tile) 
			{
				var rs = tile.extension.renderer;
				var renderable = rs ?  rs.getRenderable( overlay._bucket ) : null;
				if ( renderable ) 
				{
					// Remove the renderable
					var index = rs.renderables.indexOf(renderable);
					rs.renderables.splice(index,1);
					
					// Dispose its data
					renderable.dispose(rc,tp);
					
					// Remove tile data if not needed anymore
					if ( rs.renderables.length == 0 )
						delete tile.extension.renderer;
				}
			}
	);
}

/**************************************************************************************************************/

/**
	Add an overlay into a tile.
	Create tile data if needed, and create the renderable for the overlay.
 */
RasterOverlayRenderer.prototype.addOverlayToTile = function( tile, bucket, parentRenderable )
{
	if (!this.overlayIntersects( tile.geoBound, bucket.layer ))
		return;
		
	if ( !tile.extension.renderer )
		tile.extension.renderer = new RendererTileData(this.rendererManager);
	
	var renderable = bucket.createRenderable();
	renderable.tile = tile;
	tile.extension.renderer.renderables.push( renderable );
	
	if ( parentRenderable && parentRenderable.texture )
	{
		renderable.updateTextureFromParent( parentRenderable );
	}
	
	if ( tile.children )
	{
		// Add the overlay to loaded children
		for ( var i = 0; i < 4; i++ )
		{
			if ( tile.children[i].state == Tile.State.LOADED )
			{
				this.addOverlayToTile( tile.children[i], bucket, renderable );
			}
		}
	}

}

/**************************************************************************************************************/

/**
	Create an interpolated for polygon clipping
 */	
var _createInterpolatedVertex = function( t, p1, p2 )
{
	return [ p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1]) ];
}

/**************************************************************************************************************/

/**
	Clip polygon to a side (used by bound-overlay intersection)
 */	
RasterOverlayRenderer.prototype.clipPolygonToSide = function( coord, sign, value, polygon )
{
	var clippedPolygon = [];

	// iterate through vertices
	for ( var i = 0; i < polygon.length; i++ )
	{
		var p1 = polygon[i];
		var p2 = polygon[ (i+1) % polygon.length ];
		var val1 = p1[coord];
		var val2 = p2[coord];

		// test containement
		var firstInside = (val1 - value) * sign >= 0.0;
		var secondInside = (val2 - value) * sign >= 0.0;
	
		// output vertices for inside polygon
		if ( !firstInside && secondInside )
		{
			var t = (value - val1) / (val2- val1);
			var newPoint = _createInterpolatedVertex( t, p1, p2 );
			clippedPolygon.push( newPoint );
			clippedPolygon.push( p2 );
		}
		else if ( firstInside && secondInside )
		{
			clippedPolygon.push( p2 );
		}
		else if ( firstInside && !secondInside )
		{
			var t = (value - val1) / (val2- val1);
			var newPoint = _createInterpolatedVertex( t, p1, p2 );
			clippedPolygon.push( newPoint );
		}
	}
	
	return clippedPolygon;
}

/**************************************************************************************************************/

/**
	Check the intersection between a geo bound and an overlay
 */	
RasterOverlayRenderer.prototype.overlayIntersects = function( bound, overlay )
{
	if ( overlay.coordinates )
	{
		var c;
		c = this.clipPolygonToSide( 0, 1, bound.west, overlay.coordinates );
		c = this.clipPolygonToSide( 0, -1, bound.east, c );
		c = this.clipPolygonToSide( 1, 1, bound.south, c );
		c = this.clipPolygonToSide( 1, -1, bound.north, c );
		return c.length > 0;
	}
	else if ( overlay.geoBound )
	{
		return overlay.geoBound.intersects( bound );
	}
	
	// No geobound or coordinates : always return true
	return true;
}

/**************************************************************************************************************/

/**
	Generate Raster overlay data on the tile.
	The method is called by TileManager when a new tile has been generated.
 */
RasterOverlayRenderer.prototype.generateLevelZero = function( tile )
{
	// Traverse all overlays
	for ( var i = 0; i < this.buckets.length; i++ )
	{
		this.addOverlayToTile(tile,this.buckets[i]);
	}
}

/**************************************************************************************************************/

/**
	Request the overlay texture for a tile
 */
RasterOverlayRenderer.prototype.requestOverlayTextureForTile = function( renderable )
{	
	if ( !renderable.request )
	{
		var imageRequest;
		for ( var i = 0; i < this.imageRequests.length; i++ )
		{
			if ( !this.imageRequests[i].renderable  ) 
			{
				imageRequest = this.imageRequests[i];
				break;
			}
		}
		
		if ( imageRequest )
		{
			renderable.onRequestStarted(imageRequest);
			imageRequest.renderable = renderable;
			imageRequest.frameNumber = this.frameNumber;
			imageRequest.send(renderable.bucket.layer.getUrl(renderable.tile), renderable.bucket.layer.crossOrigin);
		}
	}
	else
	{
		renderable.request.frameNumber = this.frameNumber;
	}
}

/**************************************************************************************************************/

/**
 	Create program from customShader object
 */
RasterOverlayRenderer.prototype.createProgram = function(customShader)
{
	var program = new Program(this.tileManager.renderContext);
	program.createFromSource(this.vertexShader, customShader.fragmentCode);
	
    // Add program
    program.id = this.programs.length;
    this.programs.push({ 
    	fragmentCode: customShader.fragmentCode,
    	program: program
	});
	return program;
}

/**************************************************************************************************************/

/**
 	Get program if known by renderer, create otherwise
 */
RasterOverlayRenderer.prototype.getProgram = function(customShader) {

	var program;

    for(var id=0; id<this.programs.length; id++)
    {
        if( this.programs[id].fragmentCode == customShader.fragmentCode )
        {
        	program = this.programs[id].program;
        }
    }

    if ( !program )
    {
    	program = this.createProgram(customShader);
    }
    return program;
}

/**************************************************************************************************************/

/**
 *	Render the raster overlays for the given tiles
 */
RasterOverlayRenderer.prototype.render = function( renderables, start, end )
{
	var rc = this.tileManager.renderContext;
 	var gl = rc.gl;

	// Update gl states
	gl.enable(gl.BLEND);
	gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
	gl.depthFunc( gl.LEQUAL );
	
	var modelViewMatrix = mat4.create();
	
	var currentTile = null;
	var currentIB = null;
	var currentProgram = null;

	for ( var n = start; n < end; n++ )
	{
		var renderable = renderables[n];
		var bucket = renderable.bucket;
		var layer = bucket.layer;
		
		var updateUniforms;
		var program;
		if ( layer.customShader )
		{
			program = this.getProgram(layer.customShader);
			updateUniforms = layer.customShader.updateUniforms;
		}
		else
		{
			program = this.getProgram({
				vertexCode: this.vertexShader,
				fragmentCode: this.fragmentShader,
				updateUniforms: null
			});
		}
		
		// Apply program if changed
		if ( program != currentProgram )
		{
			currentProgram = program;
			program.apply();
							
			gl.uniformMatrix4fv(program.uniforms["projectionMatrix"], false, rc.projectionMatrix);
			gl.uniform1i(program.uniforms["overlayTexture"], 0);
			
			// Bind tcoord buffer
			gl.bindBuffer(gl.ARRAY_BUFFER, this.tileManager.tcoordBuffer);
			gl.vertexAttribPointer(program.attributes['tcoord'], 2, gl.FLOAT, false, 0, 0);
		}	
		
		if (updateUniforms)
			updateUniforms(gl, program);
		
		// Bind the vertex buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, renderable.tile.vertexBuffer);
		gl.vertexAttribPointer(program.attributes['vertex'], 3, gl.FLOAT, false, 4*renderable.tile.config.vertexSize, 0);
		
		// Bind the index buffer only if different (index buffer is shared between tiles)
		var indexBuffer = ( renderable.tile.state == Tile.State.LOADED ) ? this.tileManager.tileIndexBuffer.getSolid() : this.tileManager.tileIndexBuffer.getSubSolid(renderable.tile.parentIndex);
		if ( currentIB != indexBuffer )
		{	
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer );
			currentIB = indexBuffer;
		}

		// Bind the tile tile matrix
		mat4.multiply( rc.viewMatrix, renderable.tile.matrix, modelViewMatrix );
		gl.uniformMatrix4fv(program.uniforms["modelViewMatrix"], false, modelViewMatrix);
					
		gl.uniform1f(program.uniforms["opacity"], layer._opacity );
		gl.uniform4f(program.uniforms["textureTransform"], renderable.uvScale, renderable.uvScale, renderable.uTrans, renderable.vTrans );
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, renderable.texture );
		
		// Finally draw the tiles
		gl.drawElements(gl.TRIANGLES, currentIB.numIndices, gl.UNSIGNED_SHORT, 0);
	}
	
	// reset gl states
	gl.disable(gl.BLEND);
	//gl.disable(gl.POLYGON_OFFSET_FILL);
	gl.depthFunc( gl.LESS );
}

/**************************************************************************************************************/

/**
 * Check if renderer is applicable
 */
RasterOverlayRenderer.prototype.canApply = function(type,style)
{
	return false;
}

/**************************************************************************************************************/
									
return RasterOverlayRenderer;

});
