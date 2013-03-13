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

 define(function() {
 
/**************************************************************************************************************/

/** @constructor
	TileRequest constructor
 */
var TileRequest = function(tileManager)
{
	this.tile = null;
	this.imageLoaded = false;
	this.elevationLoaded = true;
	this.tileManager = tileManager;

	var that = this;
	
	this.image = new Image();
	this.image.crossOrigin = '';
	this.image.onload = function() { that.handleLoadedImage(); };
	this.image.onerror = function()  { that.handleErrorImage(); };
	this.image.onabort = function()  { that.handleAbort(); };

	this.xhr = new XMLHttpRequest();
	this.xhr.onreadystatechange = function(e)
	{
		if ( that.xhr.readyState == 4 )
		{
			if ( that.xhr.status == 200 )
			{
				that.handleLoadedElevation();
			}
			else
			{
				that.handleErrorElevation();
			}
		}
	};
}

/**************************************************************************************************************/

/**
	Handle when image is loaded
 */
TileRequest.prototype.handleLoadedImage = function() 
{
	this.imageLoaded = true;
	if ( this.elevationLoaded )
	{
		this.tileManager.completedRequests.push(this);
		this.tileManager.renderContext.requestFrame();
	}
}

/**************************************************************************************************************/

/**
	Handle when loading image failed
 */
TileRequest.prototype.handleErrorImage = function() 
{
	console.log( "Error while loading " + this.image.src );
	this.tile.state = Tile.State.ERROR;
	this.tileManager.availableRequests.push(this);
}

/**************************************************************************************************************/

/**
	Abort request
 */
TileRequest.prototype.handleAbort = function() 
{
	this.tile.state = Tile.State.NONE;
	this.tileManager.availableRequests.push(this);
}

/**************************************************************************************************************/

/**
	Handle when elevation is loaded
 */
TileRequest.prototype.handleLoadedElevation = function() 
{
	this.elevations = this.xhr.responseText;
		
	this.elevationLoaded = true;
	
	if ( this.imageLoaded )
	{
		this.tileManager.completedRequests.push(this);
		this.tileManager.renderContext.requestFrame();
	}
}

/**************************************************************************************************************/

/**
	Handle when loading elevation failed
 */
TileRequest.prototype.handleErrorElevation = function() 
{
	this.elevations = null;
	this.elevationLoaded = true;
	
	if ( this.imageLoaded )
	{
		this.tileManager.completedRequests.push(this);
		this.tileManager.renderContext.requestFrame();
	}
}

/**************************************************************************************************************/

/**
	Launch the HTTP request for a tile
 */
TileRequest.prototype.launch = function(tile)
{
	this.tile = tile;
	
	// Request the elevation if needed
	if ( this.tileManager.elevationProvider )
	{
		this.elevationLoaded = false;
		this.xhr.open("GET", this.tileManager.elevationProvider.getUrl(tile) );
		this.xhr.send();
	}
	else
	{
		this.elevationLoaded = true;
	}
	this.imageLoaded = false;
	this.image.src = this.tileManager.imageryProvider.getUrl(tile);
}

/**************************************************************************************************************/

return TileRequest;

});
