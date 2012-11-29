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

/**************************************************************************************************************/


/** @export
	@constructor
	WCSElevationLayer constructor
 */
GlobWeb.WCSElevationLayer = function( options )
{
	GlobWeb.RasterLayer.prototype.constructor.call( this, options );
	
	this.baseUrl = options['baseUrl'];
	this.tilePixelSize = options['tilePixelSize'] || 33;
	this.tiling = new GlobWeb.GeoTiling( 4, 2 );
	this.numberOfLevels = options['numberOfLevels'] || 21;
	this.type = "ImageryRaster";
	this.version = options['version'] || '2.0.0';
	this.format = options['format'] || 'image/x-aaigrid';
	
	// Build the base GetMap URL
	var url = this.baseUrl;
	if ( url.indexOf('?',0) == -1 )
	{
		url += '?service=wcs';
	}
	else
	{
		url += '&service=wcs';
	}
	url += "&version=" + this.version;
	url += "&request=GetCoverage";

	switch (this.version.substring(0,3)) 
	{
		case '2.0':
			this.crs = options['outputCRS'] || options['crs'] || 'http://www.opengis.net/def/crs/EPSG/0/4326';
			url += '&outputCRS=' + this.crs;
			url += "&size=x(" + this.tilePixelSize + ")";
			url += "&size=y(" + this.tilePixelSize + ")";
			url += "&coverageid=" + options['coverage'];
			break;
		case '1.0':
			url += "&width=" + this.tilePixelSize;
			url += "&height=" + this.tilePixelSize;
			url += '&crs=' + (options['crs'] || 'EPSG:4326');
			url += "&coverage=" + options['coverage'];
			break;
	}
	url += '&format=' + this.format;
	
	this.getCoverageBaseUrl = url;
}

GlobWeb.inherits(GlobWeb.RasterLayer,GlobWeb.WCSElevationLayer);


/**************************************************************************************************************/

/**
	Parse a elevation response
 */
GlobWeb.WCSElevationLayer.prototype.parseElevations = function(text)
{
	if (text == null) {
		return this._returnZeroElevations();
	}
	switch(this.format) {
	case "image/x-aaigrid":
		return this._parseAAIGrid(text);
	default:
		console.log("Format '" + this.format + "' could not be parsed.");
		return this._returnZeroElevations();
	}
}

/**************************************************************************************************************/


/**
	Fallback elevations when no data was returned
 */
GlobWeb.WCSElevationLayer.prototype._returnZeroElevations = function()
{
	var elevations = [];
	for( var i = 0; i < this.tilePixelSize * this.tilePixelSize; ++i ) {
		elevations.push(0);
	}
	return elevations;
}


/**************************************************************************************************************/


/**
	Parse a elevation response from AAIGrid
 */
GlobWeb.WCSElevationLayer.prototype._parseAAIGrid = function(text)
{
	var elevations = [];
	var lines = text.trim().split('\n');

	var dataLinesStart = 0;
	for ( var i = 0; i < lines.length; ++i ) {
		if (lines[i].substring(0, 1) === " ") {
			dataLinesStart = i;
			break;
		}
	}

	for ( var i = dataLinesStart; i < lines.length; i++ )
	{
		var elts = lines[i].trim().split(/\s+/);
		for ( var n=0; n < elts.length; n++ )
		{
			elevations.push( parseInt(elts[n]) );
		}
	}

	return elevations;
}


/**************************************************************************************************************/

/**
	Get an url for the given tile
 */
GlobWeb.WCSElevationLayer.prototype.getUrl = function(tile)
{
	var geoBound = tile.geoBound;
	var url = this.getCoverageBaseUrl;

	if (this.version.substring(0,3) === '2.0') 
	{
		url += '&subset=x,' + this.crs + '(' + geoBound.west + ',' + geoBound.east + ')';
		url += '&subset=y,' + this.crs + '(' + geoBound.south + ',' + geoBound.north + ')';
	}
	else if (this.version.substring(0,3) === '1.0') 
	{
		url += "&bbox=";	
		url += geoBound.west;
		url += ",";
		url += geoBound.south;
		url += ",";
		url += geoBound.east;
		url += ",";
		url += geoBound.north;
	}
	
	return url;
}

/**************************************************************************************************************/
