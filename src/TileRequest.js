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

 define(['./Tile', './ImageRequest'], function(Tile, ImageRequest) {
 
/**************************************************************************************************************/

/** @constructor
	TileRequest constructor
 */
var TileRequest = function(tileManager)
{
	// Private variables
	var _imageLoaded = false;
	var _elevationLoaded = true;
	var _xhr = new XMLHttpRequest();
	var _imageRequest;

	// Public variables
	this.tile = null;
	this.elevations = null;
	this.image = null;

	var self = this;
	
	// Setup the XHR callback
	_xhr.onreadystatechange = function(e)
	{
		if ( _xhr.readyState == 4 )
		{
			if ( _xhr.status == 200 )
			{
				_handleLoadedElevation();
			}
			else
			{
				_handleErrorElevation();
			}
		}
	};
	

	/**************************************************************************************************************/

	/**
		Handle when image is loaded
	 */
	var _handleLoadedImage = function() 
	{
		// The method can be called twice when the image is in the cache (see launch())
		if (!_imageLoaded)
		{
			_imageLoaded = true;
			if ( _elevationLoaded )
			{
				// Call post-process function if defined
				if ( tileManager.imageryProvider && tileManager.imageryProvider.handleImage )
					tileManager.imageryProvider.handleImage(_imageRequest);

				tileManager.completedRequests.push(self);
				tileManager.renderContext.requestFrame();
			}
			self.image = _imageRequest.image;
		}
	};

	/**************************************************************************************************************/

	/**
		Handle when loading image failed
	 */
	var _handleErrorImage = function() 
	{
		self.tile.state = Tile.State.ERROR;
		tileManager.availableRequests.push(self);
	}

	/**************************************************************************************************************/

	/**
		Abort request
	 */
	var _handleAbort = function() 
	{
		self.tile.state = Tile.State.NONE;
		tileManager.availableRequests.push(self);
	}

	/**************************************************************************************************************/

	/**
		Handle when elevation is loaded
	 */
	var _handleLoadedElevation = function() 
	{
		self.elevations = tileManager.elevationProvider.parseElevations(_xhr.responseText);	
		_elevationLoaded = true;
		
		if ( _imageLoaded )
		{
			tileManager.completedRequests.push(self);
			tileManager.renderContext.requestFrame();
		}
	}

	/**************************************************************************************************************/

	/**
		Handle when loading elevation failed
	 */
	var _handleErrorElevation = function() 
	{
		self.elevations = null;
		_elevationLoaded = true;
		
		if ( _imageLoaded )
		{
			tileManager.completedRequests.push(self);
			tileManager.renderContext.requestFrame();
		}
	}

	/**************************************************************************************************************/

	/**
		Launch the HTTP request for a tile
	 */
	this.launch = function(tile)
	{
		tile.state = Tile.State.LOADING;
		this.tile = tile;
		
		this.image = null;
		this.elevations = null;
		
		// Request the elevation if needed
		if ( tileManager.elevationProvider )
		{
			_elevationLoaded = false;
			_xhr.open("GET", tileManager.elevationProvider.getUrl(tile) );
			_xhr.send();
		}
		else
		{
			_elevationLoaded = true;
		}
		
		if ( tileManager.imageryProvider )
		{
			if (!_imageRequest)
			{
				_imageRequest = new ImageRequest({
					successCallback: _handleLoadedImage,
					failCallback: _handleErrorImage,
					abortCallback: _handleAbort
				});
			}
			_imageLoaded = false;
			_imageRequest.send( tileManager.imageryProvider.getUrl(tile) );
		}
		
		// Check if there is nothing to load
		if ( !tileManager.imageryProvider && !tileManager.elevationProvider )
		{
			tileManager.completedRequests.push(this);
		}
	};
	
};

/**************************************************************************************************************/

return TileRequest;

});
