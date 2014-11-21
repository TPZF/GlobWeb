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
	@export
	GeoBound constructor
 */
var GeoBound = function( w, s, e, n )
{
	this.south = s;
	this.west = w;
	this.north = n;
	this.east = e;
}

/**************************************************************************************************************/

/**
	Get geo center
 */
GeoBound.prototype.getCenter = function()
{
	return [ (this.east+this.west)*0.5, (this.south+this.north)*0.5, 0.0 ];
}

/**************************************************************************************************************/

/**	@export
	Get north
 */
GeoBound.prototype.getNorth = function()
{
	return this.north;
}

/**************************************************************************************************************/

/**	@export
	Get south
 */
GeoBound.prototype.getSouth = function()
{
	return this.south;
}

/**************************************************************************************************************/

/**	@export
	Get west
 */
GeoBound.prototype.getWest = function()
{
	return this.west;
}

/**************************************************************************************************************/

/**	@export
	Get east
 */
GeoBound.prototype.getEast = function()
{
	return this.east;
}

/**************************************************************************************************************/

/**
	Compute the geo bound from coordinates
 */
GeoBound.prototype.computeFromCoordinates = function( coordinates )
{
	this.west = coordinates[0][0];
	this.east = coordinates[0][0];
	this.south = coordinates[0][1];
	this.north = coordinates[0][1];
	
	for ( var i = 1; i < coordinates.length; i++ )
	{
		this.west = Math.min( this.west, coordinates[i][0] );
		this.east = Math.max( this.east, coordinates[i][0] );
		this.south = Math.min( this.south, coordinates[i][1] );
		this.north = Math.max( this.north, coordinates[i][1] );
	}
}

/**************************************************************************************************************/

/**
	Intersects this geo bound with another one
 */
GeoBound.prototype.intersects = function( geoBound )
{
	if ( this.west >= geoBound.east || this.east <= geoBound.west )
		return false;
		
	if ( this.south >= geoBound.north || this.north <= geoBound.south )
		return false;
		
	return true;
}

/**************************************************************************************************************/

/**
 	Intersects this geo bound with GeoJSON geometry
 */
GeoBound.prototype.intersectsGeometry = function( geometry )
{
	var isIntersected = false;
	var geoBound = new GeoBound();
	var coords = geometry['coordinates'];
	switch (geometry['type'])
	{
		case "LineString":
			geoBound.computeFromCoordinates( coords );
			isIntersected |= this.intersects(geoBound);
			break;
		case "Polygon":
			// Don't take care about holes
			for ( var i = 0; i < coords.length && !isIntersected; i++ )
			{
				geoBound.computeFromCoordinates( coords[i] );
				isIntersected |= this.intersects(geoBound);
			}
			break;
		case "MultiLineString":
			for ( var i = 0; i < coords.length && !isIntersected; i++ )
			{
				geoBound.computeFromCoordinates( coords[i] );
				isIntersected |= this.intersects(geoBound);
			}
			break;
		case "MultiPolygon":
			for ( var i = 0; i < coords.length && !isIntersected; i++ )
			{
				for ( var j = 0; j < coords[i].length && !isIntersected; j++ )
				{
					geoBound.computeFromCoordinates( coords[i][j] );
					isIntersected |= this.intersects(geoBound);
				}
			}
			break;
	}
	return isIntersected;
}

/**************************************************************************************************************/

return GeoBound;

});
