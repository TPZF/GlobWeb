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

define( function() {

/**************************************************************************************************************/

/** @constructor
	RendererTileData constructor
	Contains a list of renderables for the tiles
	
	A renderable contains the following attributes/methods :
		Attributes :
			bucket : the renderable bucket
			initChild (opt) : create a child at "init" time (children are created but not yet loaded)
			generateChild (opt) : generate a child at "generate" time (children are loaded)
			dispose : discard any gl data
			add : add a geometry to the renderable
			remove: remove a geometry from the renderable
 */
var RendererTileData = function(manager)
{
	this.manager = manager;
	this.renderables = [];
}

/**************************************************************************************************************/

/**
 * Initialize a child tile
 */
RendererTileData.prototype.initChild = function(childTile,i,j)
{
	var childData;
	for ( var n = 0; n < this.renderables.length; n++ ) 
	{
		if ( this.renderables[n].initChild )
		{		
			var r = this.renderables[n].initChild(i,j,childTile);
			if (r)
			{
				if (!childData)
					childData = childTile.extension.renderer = new RendererTileData(this.manager);
				childData.renderables.push( r );
			}
		}
	}
}

/**************************************************************************************************************/

/**
 * Traverse the renderer data
 */
RendererTileData.prototype.traverse = function(tile,isLeaf)
{
	for ( var i = 0; i < this.renderables.length; i++ ) 
	{
		var renderable = this.renderables[i];
		var bucket = renderable.bucket;
		if ( bucket.layer._visible && bucket.layer._opacity > 0 )
		{
			if ( renderable.traverse )
			{
				renderable.traverse( this.manager, tile, isLeaf  );
			}
			else
			{
				if ( renderable.hasChildren 
					&& !isLeaf )
					continue;
				
				this.manager.renderables.push( renderable );
			}
		}
	}
}

/**************************************************************************************************************/

/**
	Get a renderable from the tile, given the bucket
 */
RendererTileData.prototype.getRenderable = function(bucket)
{
	for ( var i=0; i < this.renderables.length; i++ )
	{
		if ( bucket == this.renderables[i].bucket )
		{
			return this.renderables[i];
		}
	}
	return null;
}

/**************************************************************************************************************/

/**
	Dispose renderable data from tile
 */
RendererTileData.prototype.dispose = function(renderContext,tilePool)
{
	for ( var i=0; i < this.renderables.length; i++ )
	{
		this.renderables[i].dispose(renderContext,tilePool);
	}
	this.renderables.length = 0;
}

/**************************************************************************************************************/

return RendererTileData;

});