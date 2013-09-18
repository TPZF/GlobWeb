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

define(['./Tile','./TilePool', './TileRequest', './TileIndexBuffer', './Program', './CoordinateSystem'],
	function (Tile,TilePool,TileRequest,TileIndexBuffer,Program, CoordinateSystem) {

/** @constructor
	TileManager constructor
 */
var TileManager = function( globe )
{
	this.globe = globe;
	this.renderContext = this.globe.renderContext;
	this.tilePool = new TilePool(this.renderContext);
	this.imageryProvider = null;
	this.elevationProvider = null;
	this.tilesToRender = [];
	this.tilesToRequest = [];
	this.postRenderers = [];
	this.level0Tiles = [];
	this.levelZeroTexture = null;
	
	// Tile requests : limit to 4 at a given time
	this.maxRequests = 4;
	this.availableRequests = [];
	for ( var i=0; i < this.maxRequests; i++ )
	{
		this.availableRequests[i] = new TileRequest(this);
	}
	this.completedRequests = [];
				
	this.level0TilesLoaded = false;
	
	// Configuration for tile
	this.tileConfig = {
		tesselation: 9,
		skirt: true,
		cullSign: 1.0,
		imageSize: 256,
		vertexSize: this.renderContext.lighting ? 6 : 3, 
		normals: this.renderContext.lighting
	};
		
	// Shared index and texture coordinate buffer : all tiles uses the same
	this.tcoordBuffer = null;
	this.tileIndexBuffer = new TileIndexBuffer(this.renderContext,this.tileConfig);
	this.identityTextureTransform = [ 1.0, 1.0, 0.0, 0.0 ];

	// For debug
	this.showWireframe = false;
	this.freeze = false;

	// Stats
	this.numTilesGenerated = 0;
	this.frameNumber = 0;

	this.vertexShader = "\
	attribute vec3 vertex;\n\
	attribute vec2 tcoord;\n\
	uniform mat4 modelViewMatrix;\n\
	uniform mat4 projectionMatrix;\n\
	uniform vec4 texTransform;\n\
	varying vec2 texCoord;\n";
	if ( this.renderContext.lighting )
		this.vertexShader += "attribute vec3 normal;\nvarying vec3 color;\n";
	this.vertexShader += "\
	void main(void) \n\
	{\n\
		gl_Position = projectionMatrix * modelViewMatrix * vec4(vertex, 1.0);\n";
	if ( this.renderContext.lighting )
		this.vertexShader += "vec4 vn = modelViewMatrix * vec4(normal,0);\ncolor = max( vec3(-vn[2],-vn[2],-vn[2]), 0.0 );\n";
	this.vertexShader += "\
		texCoord = vec2(tcoord.s * texTransform.x + texTransform.z, tcoord.t * texTransform.y + texTransform.w);\n\
	}\n\
	";

	this.fragmentShader = "\
	precision highp float; \n\
	varying vec2 texCoord;\n";
	if ( this.renderContext.lighting )
		this.fragmentShader += "varying vec3 color;\n";
	this.fragmentShader += "\
	uniform sampler2D colorTexture;\n\
	void main(void)\n\
	{\n\
		gl_FragColor.rgb = texture2D(colorTexture, texCoord).rgb;\n";
	if ( this.renderContext.lighting )
		this.fragmentShader += "gl_FragColor.rgb *= color;\n";
	this.fragmentShader += "\
		gl_FragColor.a = 1.0;\n\
	}\n\
	";
	
	this.program = new Program(this.renderContext);
	this.program.createFromSource( this.vertexShader, this.fragmentShader );
}

/**************************************************************************************************************/

/** 
	Add post renderer
 */
TileManager.prototype.addPostRenderer = function(renderer)
{	
	this.postRenderers.push( renderer );
	this.postRenderers.sort( function(a,b) {
		return (a.zIndex || 0) - (b.zIndex || 0);
	});
}

/**************************************************************************************************************/

/** 
	Remove a post renderer
 */
TileManager.prototype.removePostRenderer = function(renderer)
{
	var rendererIndex = this.postRenderers.indexOf(renderer);
	if ( rendererIndex != -1 )
	{
		// Remove the renderer from all the tiles if it has a cleanupTile method
		if ( renderer.cleanupTile )
			this.visitTiles( function(tile) { renderer.cleanupTile(tile); } );
			
		// Remove renderer from the list
		this.postRenderers.splice( rendererIndex, 1 );
	}
}

/**************************************************************************************************************/

/** 
	Set the imagery provider to be used
 */
TileManager.prototype.setImageryProvider = function(ip)
{
	this.reset();
	this.imageryProvider = ip;
	
	if (ip)
	{
		// Clean tile pool
		this.tilePool.disposeAll();

		// Rebuild level zero tiles
		this.tileConfig.imageSize = ip.tilePixelSize;
		this.level0Tiles = ip.tiling.generateLevelZeroTiles(this.tileConfig,this.tilePool);

		// Update program
		if ( ip.customShader )
		{
			this.program.dispose();
			this.program = new Program(this.renderContext);

			// Memorize current fragment shader
			this.currentFragmentShader = ip.customShader.fragmentCode ? ip.customShader.fragmentCode : this.fragmentShader;
			this.program.createFromSource( ip.customShader.vertexCode ? ip.customShader.vertexCode : this.vertexShader,
											this.currentFragmentShader );
		}
		else
		{	
			// Revert to default if needed
			if ( this.currentFragmentShader != null )
			{
				this.program.dispose();
				this.program = new Program(this.renderContext);
				this.program.createFromSource( this.vertexShader, this.fragmentShader );
				this.currentFragmentShader = null;
			}
		}
	}
}

/**************************************************************************************************************/

/** 
	Set the elevation provider to be used
 */
TileManager.prototype.setElevationProvider = function(tp)
{	
	this.reset();
	this.elevationProvider = tp;
	this.tileConfig.tesselation = tp ? tp.tilePixelSize : 9;
}

/**************************************************************************************************************/

/**
	Reset the tile manager : remove all the tiles
 */
TileManager.prototype.reset = function()
{
	// Reset all level zero tiles : destroy render data, and reset state to NONE
	for (var i = 0; i < this.level0Tiles.length; i++)
	{
		this.level0Tiles[i].deleteChildren(this.renderContext,this.tilePool);
		this.level0Tiles[i].dispose(this.renderContext,this.tilePool);
	}
	
	// Reset the shared buffers : texture coordinate and indices
	var gl = this.renderContext.gl;
	this.tileIndexBuffer.reset();
	gl.deleteBuffer( this.tcoordBuffer );
	this.tcoordBuffer = null;
	
	this.levelZeroTexture = null;
	
	this.level0TilesLoaded = false;
}

/**************************************************************************************************************/

/** 
	Tile visitor
 */
TileManager.prototype.visitTiles = function( callback )
{
	// Store the tiles to process in an array, first copy level0 tiles
	var tilesToProcess = this.level0Tiles.concat([]);
	
	while( tilesToProcess.length > 0 )
	{
		// Retreive the first tile and remove it from the array
		var tile = tilesToProcess.shift();
		
		callback( tile );
		
		// Add tile children to array to be processed later
		if ( tile.children )
		{
			tilesToProcess.push( tile.children[0] );
			tilesToProcess.push( tile.children[1] );
			tilesToProcess.push( tile.children[2] );
			tilesToProcess.push( tile.children[3] );
		}
	}
}

/**************************************************************************************************************/

/**
	Traverse tiless tiles
 */
 TileManager.prototype.traverseTiles = function()
 {		
	this.tilesToRender.length = 0;
	this.tilesToRequest.length = 0;
	this.numTraversedTiles = 0;
	
	// First load level 0 tiles if needed
	if ( !this.level0TilesLoaded && !this.levelZeroTexture )
	{
		this.level0TilesLoaded = true;
		for ( var i = 0; i < this.level0Tiles.length; i++ )
		{
			var tile = this.level0Tiles[i];
			var tileIsLoaded = tile.state == Tile.State.LOADED;
			
			// Update frame number
			tile.frameNumber = this.frameNumber;
			
			this.level0TilesLoaded = this.level0TilesLoaded && tileIsLoaded;
			if ( !tileIsLoaded )
			{		
				// Request tile if necessary
				if ( tile.state == Tile.State.NONE )
				{
					tile.state = Tile.State.REQUESTED;
					this.tilesToRequest.push(tile);
				}
				else if ( tile.state == Tile.State.ERROR )
				{
					this.globe.publish("baseLayersError", this.imageryProvider);
					this.imageryProvider._ready = false;
				}
			}
		}
		if ( this.level0TilesLoaded )
		{
			this.globe.publish("baseLayersReady");
		}
	}
	
	// Traverse tiles
	if ( this.level0TilesLoaded || this.levelZeroTexture )
	{
		// Normal traversal, iterate through level zero tiles and process them recursively
		for ( var i = 0; i < this.level0Tiles.length; i++ )
		{
			var tile = this.level0Tiles[i];
			if ( !tile.isCulled(this.renderContext) )
			{
				this.processTile(tile,0);
			}
			else 
			{
				var tileIsLoaded = (tile.state == Tile.State.LOADED);
				// Remove texture from level 0 tile, only if there is a global level zero texture
				if( this.levelZeroTexture && tileIsLoaded )
				{
						this.tilePool.disposeGLTexture( tile.texture );
						// Dispose raster overlay extension when tile is culled
						if ( tile.extension.rasterOverlay )
						{
							tile.extension.rasterOverlay.dispose(this.renderContext, this.tilePool);
						}
						tile.texture = null;
						tile.state = Tile.State.NONE;
				}
				// Delete its children
				tile.deleteChildren(this.renderContext,this.tilePool);
			}
		}
	}
}

/**************************************************************************************************************/

/**
	Process a tile
 */
TileManager.prototype.processTile = function(tile,level)
{
	this.numTraversedTiles++;
	
	// Update frame number
	tile.frameNumber = this.frameNumber;

	// Request the tile if needed
	if ( tile.state == Tile.State.NONE )
	{
		tile.state = Tile.State.REQUESTED;
		
		// Add it to the request
		this.tilesToRequest.push(tile);
	}
	
	// Check if the tiles needs to be refined
	if ( (tile.state == Tile.State.LOADED) && (level+1 < this.imageryProvider.numberOfLevels) && (tile.needsToBeRefined(this.renderContext) ) )
	{
		// Create the children if needed
		if ( tile.children == null )
		{
			tile.createChildren();
		}
		
		for ( var i = 0; i < 4; i++ )
		{
			if (!tile.children[i].isCulled(this.renderContext))
			{
				this.processTile(tile.children[i],level+1);
			}
			else
			{
				tile.children[i].deleteChildren(this.renderContext,this.tilePool);
			}
		}
	}
	else
	{
		// Push the tiles to render
		this.tilesToRender.push( tile );
	}
}

/**************************************************************************************************************/

/**
	Generate tiles
 */
 TileManager.prototype.generateReceivedTiles = function()
 {
	while ( this.completedRequests.length > 0 )
	{
		var tileRequest = this.completedRequests.pop();
		var tile = tileRequest.tile;
		if ( tile.frameNumber == this.frameNumber )
		{
			// Generate the tile using data from tileRequest
			tile.generate( this.tilePool, tileRequest.imageRequest.image, tileRequest.elevations );

			// Now post renderers can generate their data on the new tile
			for (var i=0; i < this.postRenderers.length; i++ )
			{
				if ( this.postRenderers[i].generate )
					this.postRenderers[i].generate(tile);
			}
			
			this.numTilesGenerated++;
			this.renderContext.requestFrame();
		}
		else
		{
			tile.state = Tile.State.NONE;			
		}
		this.availableRequests.push(tileRequest);
	}
	
	// All requests have been processed, send endBackgroundLoad event
	if ( this.availableRequests.length == this.maxRequests )
		this.globe.publish("endBackgroundLoad");

}

/**************************************************************************************************************/

/**
	Render tiles
 */
 TileManager.prototype.renderTiles = function()
 {	
	var rc = this.renderContext;
	var gl = rc.gl;
	
	gl.enable(gl.POLYGON_OFFSET_FILL);
	gl.polygonOffset(0,4);
	// TODO : remove this
	gl.disable(gl.CULL_FACE);
	
	// Check if the program of imagery provider changed
	// Only for fragment shader for now
	if ( this.currentFragmentShader && this.currentFragmentShader != this.imageryProvider.customShader.fragmentCode )
	{
		this.program.dispose();
		this.program = new Program(this.renderContext);

		if ( this.imageryProvider.customShader )
		{
			this.currentFragmentShader = this.imageryProvider.customShader.fragmentCode ? this.imageryProvider.customShader.fragmentCode : this.fragmentShader;
			this.program.createFromSource( this.imageryProvider.customShader.vertexShader ? this.imageryProvider.customShader.vertexShader : this.vertexShader,
										   this.currentFragmentShader );
		}
	}

    // Setup program
    this.program.apply();
	
	var attributes = this.program.attributes;
	
	// Compute near/far from tiles
	var nr;
	var fr;
	if ( this.tileConfig.cullSign < 0 )
	{
		// When in "Astro" mode, do not compute near/far from tiles not really needed
		// And the code used for "Earth" does not works really well, when the earth is seen from inside...
		nr = 0.2 * CoordinateSystem.radius;
		fr = 1.1 * CoordinateSystem.radius;
	}
	else
	{
		nr = 1e9;
		fr = 0.0;
		for ( var i = 0; i < this.tilesToRender.length; i++ )
		{
			var tile = this.tilesToRender[i];
			// Update near/far to take into account the tile
			nr = Math.min( nr, tile.distance - 1.5 * tile.radius );
			fr = Math.max( fr, tile.distance + 1.5 * tile.radius );
		}
	}
	rc.near = Math.max( rc.minNear, nr );
	rc.far = fr;
	
	// Update projection matrix with new near and far values
	mat4.perspective(rc.fov, rc.canvas.width / rc.canvas.height, rc.near, rc.far, rc.projectionMatrix);

	// Update uniforms if needed
	if ( this.imageryProvider.customShader )
		this.imageryProvider.customShader.updateUniforms(gl, this.program);

	// Setup state
	gl.activeTexture(gl.TEXTURE0);
	gl.uniformMatrix4fv(this.program.uniforms["projectionMatrix"], false, rc.projectionMatrix);
	gl.uniform1i(this.program.uniforms["colorTexture"], 0);
	
	// Bind the texture coordinate buffer (shared between all tiles
	if ( !this.tcoordBuffer )
		this.buildSharedTexCoordBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.tcoordBuffer);
	gl.vertexAttribPointer(attributes['tcoord'], 2, gl.FLOAT, false, 0, 0);
	
	var currentIB = null;
	
	var currentTextureTransform = null;
	
	for ( var i = 0; i < this.tilesToRender.length; i++ )
	{
		var tile = this.tilesToRender[i];
		
		var isLoaded = ( tile.state == Tile.State.LOADED );
		var isLevelZero = ( tile.parentIndex == -1 );
		
		// Bind tile texture
		var textureTransform;
		if ( !isLoaded && isLevelZero )
		{
			// The texture is not yet loaded but there is a full texture to render the tile
			gl.bindTexture(gl.TEXTURE_2D, this.levelZeroTexture);
			textureTransform = tile.texTransform;
		}
		else
		{
			gl.bindTexture(gl.TEXTURE_2D, tile.texture);
			textureTransform = this.identityTextureTransform;
		}
		
		// Update texture transform
		if ( currentTextureTransform != textureTransform )
		{
			gl.uniform4f(this.program.uniforms["texTransform"], textureTransform[0], textureTransform[1], textureTransform[2], textureTransform[3]);
			currentTextureTransform = textureTransform;
		}
	
		// Update uniforms for modelview matrix
		mat4.multiply( rc.viewMatrix, tile.matrix, rc.modelViewMatrix );
		gl.uniformMatrix4fv(this.program.uniforms["modelViewMatrix"], false, rc.modelViewMatrix);
	
		// Bind the vertex buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, tile.vertexBuffer);
		gl.vertexAttribPointer(attributes['vertex'], 3, gl.FLOAT, false, 4*this.tileConfig.vertexSize, 0);
		if (this.tileConfig.normals)
			gl.vertexAttribPointer(attributes['normal'], 3, gl.FLOAT, false, 4*this.tileConfig.vertexSize, 12);
				
		var indexBuffer = ( isLoaded || isLevelZero ) ? this.tileIndexBuffer.getSolid() : this.tileIndexBuffer.getSubSolid(tile.parentIndex);
		// Bind the index buffer only if different (index buffer is shared between tiles)
		if ( currentIB != indexBuffer )
		{	
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
			currentIB = indexBuffer;
		}
		
		// Finally draw the tiles
		gl.drawElements(gl.TRIANGLES, currentIB.numIndices, gl.UNSIGNED_SHORT, 0);
	}
	
	for (var i=0; i < this.postRenderers.length; i++ )
	{
		if (this.postRenderers[i].needsOffset)
			this.postRenderers[i].render( this.tilesToRender );
	}
	
	gl.disable(gl.POLYGON_OFFSET_FILL);
	
	for (var i=0; i < this.postRenderers.length; i++ )
	{
		if (!this.postRenderers[i].needsOffset)
			this.postRenderers[i].render( this.tilesToRender );
	}
}

// Internal function to sort tiles
var _sortTilesByDistance = function(t1,t2)
{
	return t1.distance - t2.distance;
};

/**************************************************************************************************************/

/**
	Request tiles
 */
 TileManager.prototype.launchRequests = function()
 {
	// Process request
	this.tilesToRequest.sort( _sortTilesByDistance );
	
	var trl = this.tilesToRequest.length; 
	for ( var i = 0; i < trl; i++ )
	{
		var tile = this.tilesToRequest[i];
		if ( this.availableRequests.length > 0 ) // Check to limit the number of requests done per frame
		{
			// First launch request, send an event
			if ( this.availableRequests.length == this.maxRequests )
				this.globe.publish("startBackgroundLoad");
			
			var tileRequest = this.availableRequests.pop();
			tileRequest.launch( tile );
			tile.state = Tile.State.LOADING;
		}
		else
		{
			tile.state = Tile.State.NONE;
		}
	}
}

/**************************************************************************************************************/

/**
	Render the tiles
 */
TileManager.prototype.render = function()
{
	if ( this.imageryProvider == null
		|| !this.imageryProvider._ready )
	{
		return;
	}
	
	// Create the texture for level zero
	if ( this.levelZeroTexture == null && this.imageryProvider.levelZeroImage )
	{
		if ( this.imageryProvider.getLevelZeroTexture )
		{
			this.levelZeroTexture = this.imageryProvider.getLevelZeroTexture();
		}
		else
		{
			this.levelZeroTexture = this.renderContext.createNonPowerOfTwoTextureFromImage(this.imageryProvider.levelZeroImage);
		}
		this.globe.publish("baseLayersReady");
	}

	var stats = this.renderContext.stats;
	
	if (!this.freeze)
	{
		if (stats) stats.start("traverseTime");
		this.traverseTiles();
		if (stats) stats.end("traverseTime");
	}

	if ( this.level0TilesLoaded || this.levelZeroTexture )
	{
		if (stats) stats.start("renderTime");
		this.renderTiles();
		if (stats) stats.end("renderTime");
	}
	
	if (stats) stats.start("generateTime");
	this.generateReceivedTiles();
	if (stats) stats.end("generateTime");
	
	if (stats) stats.start("requestTime");
	this.launchRequests();
	if (stats) stats.end("requestTime");
		
	this.frameNumber++;
}

/**************************************************************************************************************/

/**
	Returns visible tile for given longitude/latitude, null otherwise
 */
TileManager.prototype.getVisibleTile = function(lon, lat)
{
	return this.imageryProvider.tiling.findInsideTile(lon, lat, this.tilesToRender);
}

/**************************************************************************************************************/

/**
	Build shared texture coordinate buffer
 */
TileManager.prototype.buildSharedTexCoordBuffer = function()
{
	var size = this.tileConfig.tesselation;
	var skirt = this.tileConfig.skirt;
	var bufferSize = 2*size*size;
	if (skirt)
		bufferSize += 2*size*6;

	var tcoords = new Float32Array( bufferSize );

	var step = 1.0 / (size-1);
	
	var offset = 0;
	var v = 0.0;
	for ( var j=0; j < size; j++)
	{
		var u = 0.0;
		for ( var i=0; i < size; i++)
		{
			tcoords[offset] = u;
			tcoords[offset+1] = v;

			offset += 2;
			u += step;
		}
		
		v += step;
	}
	
	if ( skirt )
	{
		// Top skirt
		u = 0.0;
		v = 0.0;
		for ( var i=0; i < size; i++)
		{
			tcoords[offset] = u;
			tcoords[offset+1] = v;
			u += step;
			offset += 2;
		}
		// Bottom skirt
		u = 0.0;
		v = 1.0;
		for ( var i=0; i < size; i++)
		{
			tcoords[offset] = u;
			tcoords[offset+1] = v;
			u += step;
			offset += 2;
		}
		// Left skirt
		u = 0.0;
		v = 0.0;
		for ( var i=0; i < size; i++)
		{
			tcoords[offset] = u;
			tcoords[offset+1] = v;
			v += step;
			offset += 2;
		}
		// Right skirt
		u = 1.0;
		v = 0.0;
		for ( var i=0; i < size; i++)
		{
			tcoords[offset] = u;
			tcoords[offset+1] = v;
			v += step;
			offset += 2;
		}
		
		// Center skirt
		u = 0.0;
		v = 0.5;
		for ( var i=0; i < size; i++)
		{
			tcoords[offset] = u;
			tcoords[offset+1] = v;
			u += step;
			offset += 2;
		}
		
		// Middle skirt
		u = 0.5;
		v = 0.0;
		for ( var i=0; i < size; i++)
		{
			tcoords[offset] = u;
			tcoords[offset+1] = v;
			v += step;
			offset += 2;
		}
	}
	
	var gl = this.renderContext.gl;
	var tcb = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, tcb);
	gl.bufferData(gl.ARRAY_BUFFER, tcoords, gl.STATIC_DRAW);
	
	this.tcoordBuffer = tcb;
}

/**************************************************************************************************************/

return TileManager;

});