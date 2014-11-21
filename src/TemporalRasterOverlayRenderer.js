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

define( ['./Utils', './RasterOverlayRenderer', './RasterOverlayRenderable', './Program','./Tile','./ImageRequest','./RendererTileData'],
	function(Utils, RasterOverlayRenderer, RasterOverlayRenderable, Program, Tile, ImageRequest, RendererTileData) {

/**************************************************************************************************************/

/** 
	@constructor
	TemporalRasterOverlayRenderer constructor
 */
var TemporalRasterOverlayRenderer = function(globe)
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
	uniform float time;\n\
	uniform sampler2D tOverlayTexture;\n\
	uniform sampler2D t1OverlayTexture;\n\
	uniform float opacity; \n\
	void main(void)\n\
	{\n\
		vec4 tex1 = texture2D(tOverlayTexture, texCoord.xy);\n\
		vec4 tex2 = texture2D(t1OverlayTexture, texCoord.xy);\n\
		vec3 color1 = tex1.xyz * (1. - time);\n\
		vec3 color2 = tex2.xyz * time;\n\
		gl_FragColor.rgba = vec4( (color1 + color2), 1. ); \n\
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
	
	this.requestsToSend = [];
	
	var self = this;
	for ( var i = 0; i < 4; i++ ) {
		var imageRequest = new ImageRequest({
			successCallback: function(){
				if ( this.renderable )
				{
					if ( this.renderable.bucket.layer.handleImage )
						this.renderable.bucket.layer.handleImage(this);

					this.renderable.ownTextures.push(self.tileManager.tilePool.createGLTexture(this.image));
					if ( this.renderable.ownTextures.length == this.renderable.nbTexturesToRender )
					{
						this.renderable.textures = this.renderable.ownTextures;
						this.renderable.uvScale = 1.0;
						this.renderable.uTrans = 0.0;
						this.renderable.vTrans = 0.0;
						this.renderable.updateChildrenTexture();
					}
					//console.log(this.renderable.ownTextures.length);
					//console.log(this.renderable.request.image.currentSrc);

					// Request finished only when at least two imageries have been loaded
					var allTexturesAreLoaded = (this.renderable.ownTextures.length == (this.renderable.nbBufferizedTextures + this.renderable.nbTexturesToRender));
					this.renderable.onRequestFinished( allTexturesAreLoaded );
					this.renderable = null;
					this.baseIndex = null;
					self.tileManager.renderContext.requestFrame();
				}
			},
			failCallback: function(){
				if ( this.renderable )
				{
					console.log("###failed:" + this.renderable.request.image.src);
					this.renderable.onRequestFinished(true);
					this.renderable = null;
					this.baseIndex = null;
				}
			},
			abortCallback: function(){
				if ( this.renderable )
				{
					//console.log("Raster overlay request abort : " + this.renderable.request.image.src);
					this.renderable.onRequestFinished(false);
					this.renderable = null;
					this.baseIndex = null;
				}
			}
		});

		this.imageRequests.push( imageRequest );
	}
}

/**************************************************************************************************************/

Utils.inherits(RasterOverlayRenderer,TemporalRasterOverlayRenderer);

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
	var rasterOverlayRenderable = new RasterOverlayRenderable(this);
	rasterOverlayRenderable.nbTexturesToRender = 2;
	rasterOverlayRenderable.nbBufferizedTextures = 2;
	return rasterOverlayRenderable;
}

/**************************************************************************************************************/

/**
	Add an overlay into the renderer.
	The overlay is added to all loaded tiles.
 */
TemporalRasterOverlayRenderer.prototype.addOverlay = function( overlay )
{
	// Initialize num requests to 0
	overlay._numRequests = 0;

	var bucket = new Bucket(overlay);
	bucket.renderer = this;
	bucket.id = this.rendererManager.bucketId++;
	this.buckets.push( bucket );
	
	overlay._bucket = bucket;
	var self = this;
	overlay.subscribe("time:changed", function() {

		var publishPause = false;
		var allRequests = self.requestsToSend.concat(self.imageRequests);
		for ( var i=0; i<allRequests.length; i++ )
		{
			var ir = allRequests[i];
			if ( ir.renderable && overlay.id == ir.renderable.bucket.layer.id )
			{
				// Publish paused event in case where base index of current image
				// requests isn't sufficient to continue the rendering
				// (at least first bufferized texture must be loaded)
				publishPause |= (ir.baseIndex <= ir.renderable.nbTexturesToRender);

				// Abort only request of base url which won't be used anymore(the first one)
				if ( ir.baseIndex == 0 && ir.renderable.request )
				{
					console.log("Aborting:" + ir.renderable.request.image.src);
					ir.renderable.request.abort();
				}
			} 
		}
		
		if ( publishPause )
		{
			overlay.publish("animation:paused");
		}

		var tp = self.tileManager.tilePool;
		self.tileManager.visitTiles( function(tile) {
			// Remove first texture, relaunch requests
			var rs = tile.extension.renderer;
			var renderable = rs ?  rs.getRenderable( overlay._bucket ) : null;
			if ( renderable ) 
			{
				// Dispose first texture
				if ( renderable.ownTextures.length > 0 )
				{
					tp.disposeGLTexture(renderable.ownTextures[0]);
					renderable.ownTextures.splice(0,1);
				}

				// Force renderable to continue texture loading
				renderable.requestFinished = false;
			}
		});
		// overlay.time = 0;
	});

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
	Add an overlay into a tile.
	Create tile data if needed, and create the renderable for the overlay.
 */
TemporalRasterOverlayRenderer.prototype.addOverlayToTile = function( tile, bucket, parentRenderable )
{
	if (!this.overlayIntersects( tile.geoBound, bucket.layer ))
		return;
		
	if ( !tile.extension.renderer )
		tile.extension.renderer = new RendererTileData(this.rendererManager);
	
	var renderable = bucket.createRenderable();
	renderable.tile = tile;
	tile.extension.renderer.renderables.push( renderable );
	
	if ( parentRenderable && parentRenderable.textures.length > 0 )
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
 *	Create all necessary requests for the given renderable
 *	(Depending on already loaded textures & the number of bufferized textures)
 */
TemporalRasterOverlayRenderer.prototype.generateRequests = function (renderable)
{
	if ( !renderable.request )
	{
		for ( var i=renderable.ownTextures.length; i<(renderable.nbTexturesToRender + renderable.nbBufferizedTextures); i++ )
		{
			var url = renderable.bucket.layer.getUrl(renderable.tile, i);
			this.requestsToSend.push( {
				url: url,
				baseIndex: i,
				renderable: renderable
			} );
		}
	}
}

/**************************************************************************************************************/

/**
	Request the overlay texture for a tile
 */
TemporalRasterOverlayRenderer.prototype.requestOverlayTextureForTile = function( request )
{	
	var renderable = request.renderable;
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
			imageRequest.baseIndex = request.baseIndex;
			//console.log(request.baseIndex + " " + request.url);
			imageRequest.send(renderable.bucket.layer.getUrl(renderable.tile, renderable.ownTextures.length));
		}
	}
	else
	{
		renderable.request.frameNumber = this.frameNumber;
	}
}

/**************************************************************************************************************/

// Internal function to sort requests
var _sortByIndex = function(r1,r2)
{
	var criteria = r1.baseIndex - r2.baseIndex;
	if ( criteria == 0 )
	{
		criteria = r1.renderable.radius - r2.renderable.radius;
	}
	return criteria;
};

/**************************************************************************************************************/

/**
 *	Launch generated requests sorted by priority( base url index )
 *	TODO: sort by radius 
 */
TemporalRasterOverlayRenderer.prototype.launchRequests = function()
{
	// Sort tile requests by radius & baseIndex
	this.requestsToSend.sort( _sortByIndex );

	// Launch requests
	for ( var i=0; i<this.requestsToSend.length; i++ )
	{
		var request = this.requestsToSend[i];
		this.requestOverlayTextureForTile( request );
	}

	// Check if all the current requests have base index > 2
	// so we can unpause the animation
	var baseIndex = Number.MAX_VALUE;
	var unpause = true;
	var layersToPause = {};
	var allRequests = this.requestsToSend.concat( this.imageRequests );
	for ( var i=0; i<allRequests.length; i++ )
	{
		var request = allRequests[i];
		if ( request.renderable )
		{
			var layerName = request.renderable.bucket.layer.name;
			var layerInfo = layersToPause[ layerName ];
			if ( !layerInfo )
			{
				layerInfo = {
					layer: request.renderable.bucket.layer,
					baseIndex: request.baseIndex,
					nbTexturesToRender: request.renderable.nbTexturesToRender
				};
				layersToPause[ layerName ] = layerInfo;
			}

			layerInfo.baseIndex = Math.min( layerInfo.baseIndex, request.baseIndex );
		}
	}

	for ( var x in layersToPause )
	{
		var layerInfo = layersToPause[x];
		if ( layerInfo.baseIndex >= layerInfo.nbTexturesToRender )
		{
			layerInfo.layer.publish("animation:unpaused");
		}
	}
}

/**************************************************************************************************************/

/**
 *	Render the raster overlays for the given tiles
 */
TemporalRasterOverlayRenderer.prototype.render = function( renderables, start, end )
{
	this.launchRequests();
	this.requestsToSend = [];

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
			gl.uniform1i(program.uniforms["tOverlayTexture"], 0);
			gl.uniform1i(program.uniforms["t1OverlayTexture"], 1);
			
			// Bind tcoord buffer
			gl.bindBuffer(gl.ARRAY_BUFFER, this.tileManager.tcoordBuffer);
			gl.vertexAttribPointer(program.attributes['tcoord'], 2, gl.FLOAT, false, 0, 0);
		}	
		
		if (updateUniforms)
			updateUniforms(gl, program);
		
		// Bind the vertex buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, renderable.tile.vertexBuffer);
		gl.vertexAttribPointer(program.attributes['vertex'], 3, gl.FLOAT, false, 0, 0);
		
		// Bind the index buffer only if different (index buffer is shared between tiles)
		var indexBuffer = ( renderable.tile.state == Tile.State.LOADED ) ? this.tileManager.tileIndexBuffer.getSolid() : this.tileManager.tileIndexBuffer.getSubSolid(renderable.tile.parentIndex);
		if ( currentIB != indexBuffer )
		{	
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer );
			currentIB = indexBuffer;
		}

		// Bind the tile matrix
		mat4.multiply( rc.viewMatrix, renderable.tile.matrix, modelViewMatrix );
		gl.uniformMatrix4fv(program.uniforms["modelViewMatrix"], false, modelViewMatrix);
					
		gl.uniform1f(program.uniforms["opacity"], layer._opacity );
		gl.uniform1f(program.uniforms["time"], layer.time);
		gl.uniform4f(program.uniforms["textureTransform"], renderable.uvScale, renderable.uvScale, renderable.uTrans, renderable.vTrans );
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, renderable.textures[0] );
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, renderable.textures[1] );
		
		// Finally draw the tiles
		gl.drawElements(gl.TRIANGLES, currentIB.numIndices, gl.UNSIGNED_SHORT, 0);
	}
	
	// reset gl states
	gl.disable(gl.BLEND);
	//gl.disable(gl.POLYGON_OFFSET_FILL);
	gl.depthFunc( gl.LESS );
}

/**************************************************************************************************************/
									
return TemporalRasterOverlayRenderer;

});
