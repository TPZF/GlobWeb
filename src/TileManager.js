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

/** @constructor
	TileManager constructor
 */
GlobWeb.TileManager = function(renderContext)
{
	this.renderContext = renderContext;
	this.tilePool = new GlobWeb.TilePool(renderContext);
	this.imageryProvider = null;
	this.elevationProvider = null;
	this.tilesToRender = [];
	this.tilesToRequest = [];
	this.postRenderers = [];
	this.level0Tiles = [];
	this.levelZeroTexture = null;
	
	// Tile requests : limit to 4 at a given time
	var callback = function() { renderContext.requestFrame(); };
	this.tileRequests = [];
	for ( var i=0; i < 4; i++ )
	{
		this.tileRequests[i] = new GlobWeb.TileRequest(callback);
	}
				
	this.level0TilesLoaded = false;
	
	// Configuration for tile
	this.tileConfig = {
		tesselation: 9,
		skirt: true,
		cullSign: 1.0,
		imageSize: 256,
		vertexSize: renderContext.lighting ? 6 : 3, 
		normals: renderContext.lighting
	};
		
	// Shared index and texture coordinate buffer : all tiles uses the same
	this.tcoordBuffer = null;
	this.tileIndexBuffer = new GlobWeb.TileIndexBuffer(this.renderContext,this.tileConfig);
	this.identityTextureTransform = [ 1.0, 1.0, 0.0, 0.0 ];

	// For debug
	this.showWireframe = false;
	this.freeze = false;

	// Stats
	this.numTilesGenerated = 0;
	this.frameNumber = 0;

	var vertexShader = "\
	attribute vec3 vertex;\n\
	attribute vec2 tcoord;\n\
	uniform mat4 modelViewMatrix;\n\
	uniform mat4 projectionMatrix;\n\
	uniform vec4 texTransform;\n\
	varying vec2 texCoord;\n";
	if ( renderContext.lighting )
		vertexShader += "attribute vec3 normal;\nvarying vec3 color;\n";
	vertexShader += "\
	void main(void) \n\
	{\n\
		gl_Position = projectionMatrix * modelViewMatrix * vec4(vertex, 1.0);\n";
	if ( renderContext.lighting )
		vertexShader += "vec4 vn = modelViewMatrix * vec4(normal,0);\ncolor = max( vec3(-vn[2],-vn[2],-vn[2]), 0.0 );\n";
	vertexShader += "\
		texCoord = vec2(tcoord.s * texTransform.x + texTransform.z, tcoord.t * texTransform.y + texTransform.w);\n\
	}\n\
	";

	var fragmentShader = "\
	#ifdef GL_ES\n\
	precision highp float;\n\
	#endif\n\
	\n\
	varying vec2 texCoord;\n";
	if ( renderContext.lighting )
		fragmentShader += "varying vec3 color;\n";
	fragmentShader += "\
	uniform sampler2D colorTexture;\n\
	uniform int wireframe;\n\
	\n\
	void main(void)\n\
	{\n\
		if(wireframe == 1)\n\
			gl_FragColor.rgb = vec3(1.0,1.0,1.0);\n\
		else {\n\
			gl_FragColor.rgb = texture2D(colorTexture, texCoord).rgb;\n";
	if ( renderContext.lighting )
		fragmentShader += "gl_FragColor.rgb *= color;\n";
	fragmentShader += "\
		}\n\
		gl_FragColor.a = 1.0;\n\
	}\n\
	";
	
    this.program = new GlobWeb.Program(this.renderContext);
	this.program.createFromSource( vertexShader, fragmentShader );
}

/**************************************************************************************************************/

/** 
	Add post renderer
 */
GlobWeb.TileManager.prototype.addPostRenderer = function(renderer)
{	
	this.postRenderers.push( renderer );
}

/**************************************************************************************************************/

/** 
	Remove a post renderer
 */
GlobWeb.TileManager.prototype.removePostRenderer = function(renderer)
{
	var rendererIndex = this.postRenderers.indexOf(renderer);
	if ( rendererIndex != -1 )
	{
		// Remove the renderer from the tile
		if ( renderer.cleanup )
			this.visitTiles( function(tile) { renderer.cleanup(tile); } );
			
		// Remove renderer from the list
		this.postRenderers.splice( rendererIndex, 1 );
	}
}

/**************************************************************************************************************/

/** 
	Set the imagery provider to be used
 */
GlobWeb.TileManager.prototype.setImageryProvider = function(ip)
{	
	this.imageryProvider = ip;
	
	this.reset();
	
	if (ip)
	{
		// Rebuild level zero tiles
		this.tileConfig.imageSize = ip.tilePixelSize;
		this.level0Tiles = ip.tiling.generateLevelZeroTiles(this.tileConfig,this.tilePool);
		this.level0TilesLoaded = false;
	}
}

/**************************************************************************************************************/

/** 
	Set the elevation provider to be used
 */
GlobWeb.TileManager.prototype.setElevationProvider = function(tp)
{	
	this.reset();
	this.elevationProvider = tp;
	this.tileConfig.tesselation = tp ? tp.tilePixelSize : 9;
}

/**************************************************************************************************************/

/*
	Reset the tile manager : remove all the tiles
 */
GlobWeb.TileManager.prototype.reset = function()
{
	// Reset all level zero tiles : destroy render data, and reset state to NONE
	for (var i = 0; i < this.level0Tiles.length; i++)
	{
		this.level0Tiles[i].deleteChildren(this.tilePool);
		this.level0Tiles[i].state = GlobWeb.Tile.State.NONE;
		this.level0Tiles[i].dispose();
	}
	
	// Reset the shared buffers : texture coordinate and indices
	var gl = this.renderContext.gl;
	this.tileIndexBuffer.reset();
	gl.deleteBuffer( this.tcoordBuffer );
	this.tcoordBuffer = null;
	
	this.levelZeroTexture = null;
}

/**************************************************************************************************************/

/** 
	Tile visitor
 */
GlobWeb.TileManager.prototype.visitTiles = function( callback )
{
	// Store the tiles to process in an array, first copy level0 tiles
	var tilesToProcess = this.level0Tiles.concat([]);
	
	for (var i = 0; i < tilesToProcess.length; i++)
	{
		// Retreive the first tile and remove it from the array
		var tile = tilesToProcess.shift();
		
		// Only process tile if loaded
		if ( tile.state == GlobWeb.Tile.State.LOADED )
		{
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
}

/**************************************************************************************************************/

/*
	Launch the HTTP request for a tile
 */
GlobWeb.TileManager.prototype.launchRequest = function(tile)
{
	var tileRequest = null;
	
	// Find a 'free' request
	for ( var i = 0; i < this.tileRequests.length; i++ )
	{
		if ( !this.tileRequests[i].tile )
		{
			tileRequest = this.tileRequests[i];
			break;
		}
	}
	
	// Process the request
	if ( tileRequest )
	{
		tileRequest.tile = tile;
		var elevationUrl = null;
		if ( this.elevationProvider )
		{
			elevationUrl = this.elevationProvider.getUrl(tile)
		}
		tileRequest.launch( this.imageryProvider.getUrl(tile), elevationUrl );

		tile.state = GlobWeb.Tile.State.LOADING;
	}
	else
	{
		tile.state = GlobWeb.Tile.State.NONE;
	}
}

/**************************************************************************************************************/

/*
	Traverse tiless tiles
 */
 GlobWeb.TileManager.prototype.traverseTiles = function()
 {		
	this.tilesToRender.length = 0;
	this.tilesToRequest.length = 0;
	this.numTraversedTiles = 0;
	this.renderContext.near = 10e9;
	this.renderContext.far = -1.0;
	
	// First load level 0 tiles if needed
	if ( !this.level0TilesLoaded && !this.levelZeroTexture )
	{
		this.level0TilesLoaded = true;
		for ( var i = 0; i < this.level0Tiles.length; i++ )
		{
			var tile = this.level0Tiles[i];
			var tileIsLoaded = tile.state == GlobWeb.Tile.State.LOADED;
			
			// Update frame number
			tile.frameNumber = this.frameNumber;
			
			this.level0TilesLoaded = this.level0TilesLoaded && tileIsLoaded;
			if ( !tileIsLoaded )
			{		
				// Request tile if necessary
				if ( tile.state == GlobWeb.Tile.State.NONE )
				{
					tile.state = GlobWeb.Tile.State.REQUESTED;
					this.tilesToRequest.push(tile);
				}
			}
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
				var tileIsLoaded = (tile.state == GlobWeb.Tile.State.LOADED);
				// Remove texture from level 0 tile, only if there is a global level zero texture
				if( this.levelZeroTexture && tileIsLoaded )
				{
						this.tilePool.disposeGLTexture( tile.texture );
						tile.texture = null;
						tile.state = GlobWeb.Tile.State.NONE;
				}
				// Delete its children
				tile.deleteChildren(this.tilePool);
			}
		}
	}

//	console.log( "Near : " + this.renderContext.near );
//	console.log( "Far : " + this.renderContext.far );

}

/**************************************************************************************************************/

/*
	Process a tile
 */
GlobWeb.TileManager.prototype.processTile = function(tile,level)
{
	this.numTraversedTiles++;
	
	// Update frame number
	tile.frameNumber = this.frameNumber;

	// Request the tile if needed
	if ( tile.state == GlobWeb.Tile.State.NONE )
	{
		tile.state = GlobWeb.Tile.State.REQUESTED;
		
		// Add it to the request
		this.tilesToRequest.push(tile);
	}
	
	// Check if the tiles needs to be refined
	if ( (tile.state == GlobWeb.Tile.State.LOADED) && (level+1 < this.imageryProvider.numberOfLevels) && (tile.needsToBeRefined(this.renderContext) ) )
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
				tile.children[i].deleteChildren(this.tilePool);
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

/*
	Generate tiles
 */
 GlobWeb.TileManager.prototype.generateReceivedTiles = function()
 {
	for ( var i = 0; i < this.tileRequests.length; i++ )
	{
		var tileRequest = this.tileRequests[i];
		var tile = tileRequest.tile;
		if ( tile && tileRequest.successfull )
		{
			if ( tile.frameNumber == this.frameNumber )
			{
				// Generate the tile using data from tilRequest
				if ( this.elevationProvider )
				{
					tile.generate( this.tilePool, tileRequest.image, this.elevationProvider.parseElevations( tileRequest.elevations ) );
				}
				else
					tile.generate( this.tilePool, tileRequest.image );
								
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
				tile.state = GlobWeb.Tile.State.NONE;			
			}
			
			tileRequest.tile = null;
		}
		else if ( tile && tileRequest.failed )
		{
			tile.state = GlobWeb.Tile.State.ERROR;
			tileRequest.tile = null;
		}
	}
}

/**************************************************************************************************************/

/*
	Render tiles
 */
 GlobWeb.TileManager.prototype.renderTiles = function()
 {	
	var rc = this.renderContext;
	var gl = this.renderContext.gl;
	
	gl.enable(gl.POLYGON_OFFSET_FILL);
	gl.polygonOffset(0,4);
	// TODO : remove this
	gl.disable(gl.CULL_FACE);
	
    // Setup program
    this.program.apply();
	
	var attributes = this.program.attributes;

	// Update projection matrix with new near and far values
	mat4.perspective(rc.fov, rc.canvas.width / rc.canvas.height, rc.near, rc.far, rc.projectionMatrix);

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
		
		var isLoaded = ( tile.state == GlobWeb.Tile.State.LOADED );
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
		
		//gl.uniform3fv(this.program.uniforms["color"], tile.color );
	
		// Bind the vertex buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, tile.vertexBuffer);
		gl.vertexAttribPointer(attributes['vertex'], 3, gl.FLOAT, false, 4*this.tileConfig.vertexSize, 0);
		if (this.tileConfig.normals)
			gl.vertexAttribPointer(attributes['normal'], 3, gl.FLOAT, false, 4*this.tileConfig.vertexSize, 12);
		
		if ( this.showWireframe )
		{
			var indexBuffer = ( isLoaded || isLevelZero ) ? this.tileIndexBuffer.getWireframe() : this.tileIndexBuffer.getSubWireframe(tile.parentIndex);
			// Bind the index buffer only if different (index buffer is shared between tiles)
			if ( currentIB != indexBuffer )
			{
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
				currentIB = indexBuffer;
			}
			
			gl.uniform1i(this.program.uniforms["wireframe"], 1 );
			
			// Draw the tiles in wireframe mode
			var numIndices = currentIB.numIndices;
			gl.drawElements(gl.LINES, currentIB.numIndices, gl.UNSIGNED_SHORT, 0);
			
			gl.uniform1i(this.program.uniforms["wireframe"], 0 );
		}
		
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

/**************************************************************************************************************/

/*
	Request tiles
 */
 GlobWeb.TileManager.prototype.launchRequests = function()
 {
	// Process request
	this.tilesToRequest.sort( function(a,b) { return a.distance - b.distance; } );
	
	var trl = this.tilesToRequest.length; 
	for ( var i = 0; i < trl; i++ )
	{
		var tile = this.tilesToRequest[i];
		if ( tile.frameNumber == this.frameNumber )
		{
			this.launchRequest( tile );
		}
		else
		{
			tile.state = GlobWeb.Tile.State.NONE;
		}
	}
}

/**************************************************************************************************************/

/*
	Render the tiles
 */
GlobWeb.TileManager.prototype.render = function()
{
	if ( this.imageryProvider == null
		|| !this.imageryProvider.ready )
	{
		return;
	}
	
	// Create the texture for level zero
	if ( this.levelZeroTexture == null && this.imageryProvider.levelZeroImage )
	{
		this.levelZeroTexture = this.renderContext.createNonPowerOfTwoTextureFromImage(this.imageryProvider.levelZeroImage);
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

/*
	Build shared texture coordinate buffer
 */
GlobWeb.TileManager.prototype.buildSharedTexCoordBuffer = function()
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
