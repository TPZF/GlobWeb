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
var TileRequest = function(cb)
{
	this.successfull = false;
	this.failed = false;
	this.tile = null;
	this.imageLoaded = false;
	this.elevationLoaded = true;
	this.callback = cb;

	var that = this;
	
	this.image = new Image();
	this.image.crossOrigin = '';
	this.image.onload = function() { that.handleLoadedImage(); };
	this.image.onerror = function()  { that.handleErrorImage(); };

	this.xhr = new XMLHttpRequest();
	this.xhr.onreadystatechange = function(e)
	{
		if ( that.xhr.readyState == 4 && that.xhr.status == 200)
		{
			that.handleLoadedElevation( that );
		}

		if ( that.xhr.status >= 400)
		{
			that.handleErrorElevation( that );
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
		this.successfull = true;
		this.callback();
	}
}

/**************************************************************************************************************/

/**
	Handle when loading image failed
 */
TileRequest.prototype.handleErrorImage = function() 
{
	console.log( "Error while loading " + this.image.src );
	this.failed = true;
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
		this.successfull = true;
		this.callback();
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
		this.successfull = true;
		this.callback();
	}
}

/**************************************************************************************************************/

/**
	Launch the HTTP request for a tile
 */
TileRequest.prototype.launch = function(imageUrl,elevationUrl)
{
	this.successfull = false;
	this.failed = false;
	
	this.imageLoaded = false;
	this.image.src = imageUrl;
	
	// Request the elevation if needed
	if ( elevationUrl )
	{
		this.elevationLoaded = false;
		this.xhr.open("GET", elevationUrl );
		this.xhr.send();
	}
}

/**************************************************************************************************************/

return TileRequest;

});
