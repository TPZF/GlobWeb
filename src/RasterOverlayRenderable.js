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

define( ['./Tile'],
	function(Tile) {

/** 
	@constructor
	Create a renderable for the overlay.
	There is one renderable per overlay and per tile.
 */
var RasterOverlayRenderable = function( bucket )
{
	this.bucket = bucket;
	this.ownTextures = [];
	this.textures = [];
	this.request = null;
	this.requestFinished = false;
	this.tile = null;
	this.uvScale = 1.0;
	this.uTrans = 0.0;
	this.vTrans = 0.0;
	this.nbTextures = 1;
	this.baseIndex = 0;
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
	if ( this.textures.length > 0 )
	{
		renderable.textures = this.textures;
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
				if ( cr && !cr.ownTextures.length > 0 )
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
		this.textures = parent.textures;
		this.uvScale = parent.uvScale * 0.5;
		this.uTrans = parent.uTrans;
		this.vTrans = parent.vTrans;
		
		this.uTrans += (this.tile.parentIndex & 1) ? this.uvScale : 0;
		this.vTrans += (this.tile.parentIndex & 2) ? this.uvScale : 0;
	}
	else
	{
		this.textures = parent.textures;
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
	// NB: commented cuz the requests are launched from render method..
	if ( isLeaf /* && this.textures.length >= this.nbTexturesToRender*/ )
	{
		manager.renderables.push( this );
	}

	if (!this.requestFinished && this.tile.state == Tile.State.LOADED)
	{	
		this.bucket.renderer.generateRequests( this );
	}

	// if (!this.requestFinished && this.tile.state == Tile.State.LOADED)
	// {
	// 	this.bucket.renderer.requestOverlayTextureForTile( this );
	// }
}

/**************************************************************************************************************/

/** 
	Dispose the renderable
 */
RasterOverlayRenderable.prototype.dispose = function(renderContext,tilePool)
{
	if ( this.ownTextures.length > 0 ) 
	{
		for ( var i=0; i<this.ownTextures.length; i++ )
		{	
			tilePool.disposeGLTexture(this.ownTextures[i]);
		}
		this.ownTextures = [];
	}
}

/**************************************************************************************************************/

return RasterOverlayRenderable;

});