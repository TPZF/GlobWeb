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
 
define(['./Utils', './RasterLayer', './GeoTiling'], 
	function(Utils, RasterLayer, GeoTiling) {

/**************************************************************************************************************/


/** @name WCSElevationLayer
	@class
	Create a layer for elevation data using WCS protocol.
	The only supported format is right now image/x-aaigrid. It is an ASCII format that is easily parsed in Javascript.
	@augments RasterLayer
	@param options Configuration properties for the WCSElevationLayer. See {@link RasterLayer} for base properties :
		<ul>
			<li>baseUrl : the base Url to access the WCS server</li>
			<li>coverage : the name of the coverage to use (WCS parameter)</li>
			<li>crs : the coordinate reference system to use (WCS parameter)</li>
			<li>version : 2.0.x or 1.0.x is supported</li>
			<li>scale : elevation scale value</li>
		</ul>
 */
var WCSElevationLayer = function( options )
{
	RasterLayer.prototype.constructor.call( this, options );
	
	this.baseUrl = options['baseUrl'];
	this.tilePixelSize = options['tilePixelSize'] || 33;
	this.tiling = new GeoTiling( 4, 2 );
	this.numberOfLevels = options['numberOfLevels'] || 21;
	this.version = options['version'] || '2.0.0';
	this.format = options['format'] || 'image/x-aaigrid';
	this.minElevation = options['minElevation'] || 0;
	this.scale = options['scale'] || 1;
	
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

Utils.inherits(RasterLayer,WCSElevationLayer);


/**************************************************************************************************************/

/**
	Parse a elevation response
 */
WCSElevationLayer.prototype.parseElevations = function(text)
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
WCSElevationLayer.prototype._returnZeroElevations = function()
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
WCSElevationLayer.prototype._parseAAIGrid = function(text)
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
			var elevation = parseInt(elts[n]);
			if ( elevation < this.minElevation ) 
				elevation = this.minElevation;
			elevations.push( elevation * this.scale );
		}
	}

	return elevations;
}


/**************************************************************************************************************/

/**
	Get an url for the given tile
 */
WCSElevationLayer.prototype.getUrl = function(tile)
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

return WCSElevationLayer;

});
