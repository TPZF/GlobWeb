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
	this.tilePixelSize = options['tilePixelSize'] || 256;
	this.tiling = new GlobWeb.GeoTiling( 4, 2 );
	this.numberOfLevels = options['numberOfLevels'] || 21;
	this.type = "ImageryRaster";
    options['version'] = options.hasOwnProperty('version') ? options['version'] : '2.0.0';
	
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
	url += "&version=" + options['version'];
	url += "&request=GetCoverage";

    if (options['version'].substring(0,3) === '2.0') {
        url += "&outputCRS=" + options.hasOwnProperty('srs') ? options['srs'] : 'EPSG:4326';
    }
	url += "&srs=";
	url += options.hasOwnProperty('srs') ? options['srs'] : 'EPSG:4326';
	url += "&layers=" + options['layers'];
	url += "&format=";
	url += options.hasOwnProperty('format') ? options['format'] : 'image/jpeg';
	url += "&width=";
	url += this.tilePixelSize;
	url += "&height=";
	url += this.tilePixelSize;
	
	this.getMapBaseUrl = url;
	options['format'] = 'image/x-aaigrid';
	options['tilePixelSize'] = options['tilePixelSize'] || 33;
	GlobWeb.WMSLayer.prototype.constructor.call( this, options );
}

GlobWeb.inherits(GlobWeb.RasterLayer,GlobWeb.WCSElevationLayer);


/**************************************************************************************************************/

/**
	Parse a elevation response
 */
GlobWeb.WCSElevationLayer.prototype.parseElevations = function(text)
{
	var elevations = [];
	var lines = text.trim().split('\n');
	
	for ( var i = 5; i < lines.length; i++ )
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
