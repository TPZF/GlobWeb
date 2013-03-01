
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
RendererTileData.prototype.dispose = function(renderContext)
{
	for ( var i=0; i < this.renderables.length; i++ )
	{
		this.renderables[i].dispose(renderContext);
	}
	this.renderables.length = 0;
}

/**************************************************************************************************************/

return RendererTileData;

});