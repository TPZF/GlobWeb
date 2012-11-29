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
	WMSElevationLayer constructor
 */
GlobWeb.WMSElevationLayer = function( options )
{
	options['format'] = 'image/x-aaigrid';
	options['tilePixelSize'] = options['tilePixelSize'] || 33;
	GlobWeb.WMSLayer.prototype.constructor.call( this, options );
}

GlobWeb.inherits(GlobWeb.WMSLayer,GlobWeb.WMSElevationLayer);


/**************************************************************************************************************/

/**
	Parse a elevation response
 */
GlobWeb.WMSElevationLayer.prototype.parseElevations = function(text)
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
