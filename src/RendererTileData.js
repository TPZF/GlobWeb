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
 */
var RendererTileData = function()
{
	this.renderables = [];
	this.frameNumber = -1;
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