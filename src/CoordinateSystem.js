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

define( ['./Numeric' ], function(Numeric) {
 
var CoordinateSystem = function(options)
{
	this.radius = options && options.hasOwnProperty('radius') ? options.radius : 1.0;
	this.realEarthRadius = options && options.hasOwnProperty('realEarthRadius') ? options.realEarthRadius : 6356752.3142;
	this.heightScale = 1.0 / this.realEarthRadius;
};

/**************************************************************************************************************/

/*
	Convert a geographic position to 3D
 */
CoordinateSystem.prototype.fromGeoTo3D = function(geo, dest)
{
    if (!dest) { dest = new Array(3); }

	var longInRad = Numeric.toRadian(geo[0]);
	var latInRad = Numeric.toRadian(geo[1]);
	var cosLat = Math.cos(latInRad);
	
	// Take height into account
	var height = geo.length > 2 ? this.heightScale * geo[2] : 0;
	var radius = this.radius + height;

    dest[0] = radius * Math.cos(longInRad) * cosLat;
    dest[1] = radius * Math.sin(longInRad) * cosLat;
    dest[2] = radius * Math.sin(latInRad);

    return dest;
};

/**************************************************************************************************************/

/*
	Convert a 3D position to geographic
    Returns 3 values [long, lat, distance from earth surface]
 */
CoordinateSystem.prototype.from3DToGeo = function(position3d, dest)
{
    if (!dest) { dest = new Array(3); }

    var r = Math.sqrt(position3d[0]*position3d[0] +
                      position3d[1]*position3d[1] +
                      position3d[2]*position3d[2]);
    var lon = Math.atan2(position3d[1] / r, position3d[0] / r);
    var lat = Math.asin(position3d[2] / r);

    dest[0] = Numeric.toDegree(lon);
    dest[1] = Numeric.toDegree(lat);
    dest[2] = this.realEarthRadius * (r - this.radius);

    return dest;
};

/**************************************************************************************************************/

/*
	Get local transformation
 */
CoordinateSystem.prototype.getLocalTransform = function(geo, dest)
{
    if (!dest) { dest = mat4.create(); }

	var longitude = geo[0] * Math.PI / 180.0;
	var latitude = geo[1] * Math.PI / 180.0;
	
	var up = [  Math.cos(longitude)*Math.cos(latitude), Math.sin(longitude)*Math.cos(latitude), Math.sin(latitude) ];
	var east = [ -Math.sin(longitude), Math.cos(longitude), 0 ];
	var north = vec3.create();
	vec3.cross( up, east, north );
	
	dest[0] = east[0];
	dest[1] = east[1];
	dest[2] = east[2];
	dest[3] = 0.0;
		
	dest[4] = north[0];
	dest[5] = north[1];
	dest[6] = north[2];
	dest[7] = 0.0;
		
	dest[8] = up[0];
	dest[9] = up[1];
	dest[10] = up[2];
	dest[11] = 0.0;

	dest[12] = 0.0;
	dest[13] = 0.0;
	dest[14] = 0.0;
	dest[15] = 1.0;

	return dest;
};

/**************************************************************************************************************/

/*
	Get local transformation
 */
CoordinateSystem.prototype.getLHVTransform = function(geo, dest)
{
    if (!dest) { dest = mat4.create(); }

	var longitude = geo[0] * Math.PI / 180.0;
	var latitude = geo[1] * Math.PI / 180.0;
	
	var up = [  Math.cos(longitude)*Math.cos(latitude), Math.sin(longitude)*Math.cos(latitude), Math.sin(latitude) ];
	var east = [ -Math.sin(longitude), Math.cos(longitude), 0 ];
	var north = vec3.create();
	vec3.cross( up, east, north );
	
	var pt = this.fromGeoTo3D(geo);
	
	dest[0] = east[0];
	dest[1] = east[1];
	dest[2] = east[2];
	dest[3] = 0.0;
		
	dest[4] = north[0];
	dest[5] = north[1];
	dest[6] = north[2];
	dest[7] = 0.0;
		
	dest[8] = up[0];
	dest[9] = up[1];
	dest[10] = up[2];
	dest[11] = 0.0;

	dest[12] = pt[0];
	dest[13] = pt[1];
	dest[14] = pt[2];
	dest[15] = 1.0;

	return dest;
};

/**************************************************************************************************************/

/*
	Get the side (i.e. X) vector from a local transformation
 */
CoordinateSystem.prototype.getSideVector = function( matrix, v )
{
	v[0] = matrix[0];
	v[1] = matrix[1];
	v[2] = matrix[2];
	
    return v;
};

/**************************************************************************************************************/

/*
	Get the front (i.e. Y) vector from a local transformation
 */
CoordinateSystem.prototype.getFrontVector = function( matrix, v )
{
	v[0] = matrix[4];
	v[1] = matrix[5];
	v[2] = matrix[6];
	
    return v;
};

/**************************************************************************************************************/

/*
	Get the up (i.e. Z) vector from a local transformation
 */
CoordinateSystem.prototype.getUpVector = function( matrix, v )
{
	v[0] = matrix[8];
	v[1] = matrix[9];
	v[2] = matrix[10];
	
    return v;
};

/**************************************************************************************************************/

return CoordinateSystem;

});