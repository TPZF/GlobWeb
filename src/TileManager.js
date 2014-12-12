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

define(['./Tile', './GeoTiling','./TilePool', './TileRequest', './TileIndexBuffer', './Program'],
	function (Tile, GeoTiling, TilePool, TileRequest, TileIndexBuffer, Program) {

/** @constructor
	TileManager constructor
	
	Take in parameters its parent : can be a globe or a sky
 */
var TileManager = function( parent, options )
{
	this.parent = parent;
	this.renderContext = this.parent.renderContext;
	// Create a new tile pool or use the one from the parent
	this.tilePool = parent.tilePool || new TilePool(this.renderContext);
	this.tiling = new GeoTiling( 4, 2 ); // Use geo tiling by default

	this.imageryProvider = null;
	this.elevationProvider = null;
	this.tilesToRender = [];
	this.visibleTiles = [];
	this.tilesToRequest = [];
	this.postRenderers = [];

	// Init default texture
	var gl = this.renderContext.gl;
	this.defaultTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, this.defaultTexture);
	var defaultColor = options.defaultColor ? options.defaultColor : [200,200,200,255];
	var pixel = new Uint8Array(defaultColor);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, 
	              gl.RGBA, gl.UNSIGNED_BYTE, pixel);
	
	// Tile requests : limit to 4 at a given time
	this.maxRequests = 4;
	this.availableRequests = [];
	for ( var i=0; i < this.maxRequests; i++ )
	{
		this.availableRequests[i] = new TileRequest(this);
	}
	this.pendingRequests = [];
	this.completedRequests = [];
				
	this.level0TilesLoaded = false;
	
	// Configuration for tile
	this.tileConfig = {
		tesselation: 9,
		skirt: true,
		cullSign: 1.0,
		imageSize: 256,
		vertexSize: this.renderContext.lighting ? 6 : 3, 
		normals: this.renderContext.lighting,
		coordinateSystem: this.parent.coordinateSystem
	};
	this.level0Tiles = this.tiling.generateLevelZeroTiles(this.tileConfig,this.tilePool);
		
	// Shared index and texture coordinate buffer : all tiles uses the same
	this.tcoordBuffer = null;
	this.tileIndexBuffer = new TileIndexBuffer(this.renderContext,this.tileConfig);

	// HACK : to fix sky rendering
	this.renderTileWithoutTexture = options.hasOwnProperty('renderTileWithoutTexture') ? options.renderTileWithoutTexture : true;

	// For debug
	this.freeze = false;

	// Stats
	this.numTilesGenerated = 0;
	this.frameNumber = 0;

	this.vertexShader = "\
	attribute vec3 vertex;\n\
	attribute vec2 tcoord;\n\
	uniform mat4 modelViewMatrix;\n\
	uniform mat4 projectionMatrix;\n\
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
		texCoord = tcoord;\n\
	}\n\
	";

	this.fragmentShader = "\
	precision lowp float; \n\
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
	
	this.postRenderers.sort( function(r1,r2) {
		var z1 = r1.zIndex | 0;
		var z2 = r2.zIndex | 0;
		return z1 - z2;
	});
	
	if ( renderer.generate )
	{
		this.visitTiles( function(tile) {
		
			renderer.generate(tile);
		} );
	}
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
		
		this.tiling = ip.tiling;

		// Rebuild level zero tiles
		this.tileConfig.imageSize = ip.tilePixelSize;
		this.level0Tiles = this.tiling.generateLevelZeroTiles(this.tileConfig,this.tilePool);

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
	
	var newTesselation = tp ? tp.tilePixelSize : 9;
	if ( newTesselation != this.tileConfig.tesselation )
	{
		this.tileConfig.tesselation = newTesselation;
		
		// Reset the shared buffers : texture coordinate and indices
		var gl = this.renderContext.gl;
		this.tileIndexBuffer.reset();
		gl.deleteBuffer( this.tcoordBuffer );
		this.tcoordBuffer = null;
	}
}

/**************************************************************************************************************/

/**
	Reset the tile manager : unload all tiles
 */
TileManager.prototype.reset = function()
{
	// Abort all pending requests
	this.abortRequests();

	// Reset all level zero tiles : destroy render data, and reset state to NONE
	for (var i = 0; i < this.level0Tiles.length; i++)
	{
		this.level0Tiles[i].deleteChildren(this.renderContext,this.tilePool);
		this.level0Tiles[i].dispose(this.renderContext,this.tilePool);
	}
	
	this.level0TilesLoaded = false;
}

/**************************************************************************************************************/

/**
 *	Abort all pending requests
 */
TileManager.prototype.abortRequests = function()
{
	for ( var i=this.pendingRequests.length-1; i>=0; i-- )
	{
		this.pendingRequests[i].abort();
	}
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
	this.visibleTiles.length = 0;
	this.tilesToRequest.length = 0;
	this.numTraversedTiles = 0;
	
	// First load level 0 tiles if needed
	if ( !this.level0TilesLoaded )
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
				else if ( tile.state == Tile.State.ERROR && this.imageryProvider )
				{
					this.parent.publish("baseLayersError", this.imageryProvider);
				}
			}
		}
		if ( this.level0TilesLoaded && this.imageryProvider  )
		{
			this.parent.publish("baseLayersReady");
		}
	}
	
	// Traverse tiles
	if ( this.level0TilesLoaded )
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
	
	var isLeaf = true;

	// Request the tile if needed
	if ( tile.state == Tile.State.NONE )
	{
		tile.state = Tile.State.REQUESTED;
		
		// Add it to the request
		this.tilesToRequest.push(tile);
	}
		
	// Check if the tiles needs to be refined
	// We only refine loaded tile
	if ( tile.state == Tile.State.LOADED  )
	{
		if ( this.imageryProvider )
		{
			isLeaf = level >= this.imageryProvider.numberOfLevels;
		}
		else
		{
			isLeaf = false;
		}
		
		isLeaf |= !tile.needsToBeRefined( this.renderContext );
	}
	
	if ( isLeaf )
	{
		// Push the tiles to render only if the texture is valid or there is no imagery provider defined
		if ( tile.texture || this.renderTileWithoutTexture )
		{
			this.tilesToRender.push( tile );
		}
		this.visibleTiles.push( tile );
	}
	else
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
	
	// Traverse extension
	for ( var x in tile.extension ) 
	{
		var e = tile.extension[x];
		if ( e.traverse ) e.traverse(tile,isLeaf);
	}
}

/**************************************************************************************************************/

/**
 	Generate tile
 */
TileManager.prototype.generateTile = function(tile, tileRequest)
{
	// Generate the tile using data from tileRequest if defined
	tile.generate( this.tilePool, tileRequest.image, tileRequest.elevations );

	// Now post renderers can generate their data on the new tile
	for (var i=0; i < this.postRenderers.length; i++ )
	{
		if ( this.postRenderers[i].generate )
			this.postRenderers[i].generate( tile );
	}
	
	this.numTilesGenerated++;
	this.renderContext.requestFrame();
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
			this.generateTile( tile, tileRequest );
		}
		else
		{
			tile.state = Tile.State.NONE;			
		}
		this.availableRequests.push(tileRequest);
	}
	
	// All requests have been processed, send endBackgroundLoad event
	if ( this.availableRequests.length == this.maxRequests && this.imageryProvider )
		this.parent.publish("endBackgroundLoad");

}

/**************************************************************************************************************/

/**
	Render tiles
 */
 TileManager.prototype.renderTiles = function()
 {
	var rc = this.renderContext;
	var gl = rc.gl;
	
	// Compute near/far from tiles
	var nr;
	var fr;
	if ( this.tileConfig.cullSign < 0 )
	{
		// When in "Astro" mode, do not compute near/far from tiles not really needed
		// And the code used for "Earth" does not works really well, when the earth is seen from inside...
		nr = 0.2 * this.tileConfig.coordinateSystem.radius;
		fr = 1.1 * this.tileConfig.coordinateSystem.radius;
	}
	else
	{
		nr = 1e9;
		fr = 0.0;
		for ( var i = 0; i < this.visibleTiles.length; i++ )
		{
			var tile = this.visibleTiles[i];
			// Update near/far to take into account the tile
			nr = Math.min( nr, tile.distance - 1.5 * tile.radius );
			fr = Math.max( fr, tile.distance + 1.5 * tile.radius );
		}
	}
	rc.near = Math.max( rc.minNear, nr );
	rc.far = Math.max( rc.minFar, fr );

	if ( this.tilesToRender.length != 0 )
	{
		// Set state (depends if geo or astro)
		if ( this.tileConfig.cullSign < 0 )
		{
			gl.depthMask(false);
			gl.disable(gl.DEPTH_TEST);
			gl.disable(gl.CULL_FACE);
		}
		else
		{
			gl.enable(gl.POLYGON_OFFSET_FILL);
			gl.polygonOffset(0,4);
		}
		
		// Check if the program of imagery provider changed
		// Only for fragment shader for now
		if ( this.currentFragmentShader && this.currentFragmentShader != this.imageryProvider.customShader.fragmentCode )
		{
			this.program.dispose();
			this.program = new Program(this.renderContext);

			if ( this.imageryProvider && this.imageryProvider.customShader )
			{
				this.currentFragmentShader = this.imageryProvider.customShader.fragmentCode ? this.imageryProvider.customShader.fragmentCode : this.fragmentShader;
				this.program.createFromSource( this.imageryProvider.customShader.vertexShader ? this.imageryProvider.customShader.vertexShader : this.vertexShader,
											   this.currentFragmentShader );
			}
		}

		// Setup program
		this.program.apply();
		
		var attributes = this.program.attributes;
			
		// Update projection matrix with new near and far values
		mat4.perspective(rc.fov, rc.canvas.width / rc.canvas.height, rc.near, rc.far, rc.projectionMatrix);

		// Update uniforms if needed
		if ( this.imageryProvider && this.imageryProvider.customShader )
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
		
		for ( var i = 0; i < this.tilesToRender.length; i++ )
		{
			var tile = this.tilesToRender[i];
			
			var isLoaded = ( tile.state == Tile.State.LOADED );
			var isLevelZero = ( tile.parentIndex == -1 );
			
			// Bind tile texture if defined, the default texture otherwise
			if ( tile.texture )
			{
				gl.bindTexture(gl.TEXTURE_2D, tile.texture);
			}
			else
			{
				gl.bindTexture(gl.TEXTURE_2D, this.defaultTexture);
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
		
		if ( this.tileConfig.cullSign < 0 )
		{
			gl.depthMask(true);
			gl.enable(gl.DEPTH_TEST);
		}
		else		
		{
			gl.disable(gl.POLYGON_OFFSET_FILL);
		}
	}
	
	for (var i=0; i < this.postRenderers.length; i++ )
	{
		this.postRenderers[i].render( this.visibleTiles );
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
			if ( this.availableRequests.length == this.maxRequests && this.imageryProvider )
				this.parent.publish("startBackgroundLoad");
			
			var tileRequest = this.availableRequests.pop();
			tileRequest.launch( tile );
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
	if ( this.imageryProvider && !this.imageryProvider._ready )
	{
		return;
	}
	
	// Specific case when the image provider has a level zero image : generate the texture for each level zero tile
	if ( !this.level0TilesLoaded && this.imageryProvider && this.imageryProvider.levelZeroImage )
	{
		this.imageryProvider.generateLevel0Textures( this.level0Tiles, this.tilePool );
		
		for (var n = 0; n < this.level0Tiles.length; n++ )
		{
			var tile = this.level0Tiles[n];
			// Generate the tile without tile request
			this.generateTile( tile, {} );
		}

		this.level0TilesLoaded = true;

		this.parent.publish("baseLayersReady");
	}

	var stats = this.renderContext.stats;
	
	if (!this.freeze)
	{
		if (stats) stats.start("traverseTime");
		this.traverseTiles();
		if (stats) stats.end("traverseTime");
	}

	if ( this.level0TilesLoaded || !this.imageryProvider )
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
	return this.tiling.findInsideTile(lon, lat, this.visibleTiles);
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