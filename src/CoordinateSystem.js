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

GlobWeb.CoordinateSystem = { radius: 1.0, heightScale: 1.0 / 6356752.3142, realEarthRadius: 6356752.3142  };

/*
	Convert a geographic position to 3D
 */
GlobWeb.CoordinateSystem.fromGeoTo3D = function(geo, dest)
{
    if (!dest) { dest = new Array(3); }

	var longInRad = Numeric.toRadian(geo[0]);
	var latInRad = Numeric.toRadian(geo[1]);
	var cosLat = Math.cos(latInRad);
	
	// Take height into account
	var height = geo.length > 2 ? GlobWeb.CoordinateSystem.heightScale * geo[2] : 0;
	var radius = GlobWeb.CoordinateSystem.radius + height;

    dest[0] = radius * Math.cos(longInRad) * cosLat;
    dest[1] = radius * Math.sin(longInRad) * cosLat;
    dest[2] = radius * Math.sin(latInRad);

    return dest;
}

/*
	Convert a 3D position to geographic
    Returns 3 values [long, lat, distance from earth surface]
 */
GlobWeb.CoordinateSystem.from3DToGeo = function(position3d, dest)
{
    if (!dest) { dest = new Array(3); }

    var r = Math.sqrt(position3d[0]*position3d[0] +
                      position3d[1]*position3d[1] +
                      position3d[2]*position3d[2]);
    var lon = Math.atan2(position3d[1] / r, position3d[0] / r);
    var lat = Math.asin(position3d[2] / r);

    dest[0] = Numeric.toDegree(lon);
    dest[1] = Numeric.toDegree(lat);
    dest[2] = GlobWeb.CoordinateSystem.realEarthRadius * Math.abs(r - GlobWeb.CoordinateSystem.radius);

    return dest;
}

/**
*	Convert a 3D position to equatorial coordinates
*/
GlobWeb.CoordinateSystem.from3DToEquatorial = function(position3d, dest){
	
	if (!dest) { dest = new Array(3); }
	
	var geo = [];

	GlobWeb.CoordinateSystem.from3DToGeo(position3d, geo);
	GlobWeb.CoordinateSystem.fromGeoToEquatorial(geo, dest);
	
	return dest;
}

/**
*	Converts an equatorial position to 3D
*/
GlobWeb.CoordinateSystem.fromEquatorialTo3D = function(equatorial, dest){
	
	if (!dest) { dest = new Array(3); }

	var geo = [];
	
	GlobWeb.CoordinateSystem.fromEquatorialToGeo(equatorial, geo);
	GlobWeb.CoordinateSystem.fromGeoTo3D(geo,dest);
	
	return dest;	
}

/**
*	Convert an equatorial position to geographic
*	@param {String[]} equatorial Array of two strings corresponding to Right Ascension and Declination
*					  specified by: "hours minuts seconds" and "degrees minuts seconds" respectively
*	@param {Float[]} dest Destination array of two floats corresponding to Longitude and Latitude
*/
GlobWeb.CoordinateSystem.fromEquatorialToGeo = function(equatorial, dest){
	
	if(!dest) dest = [];
	
	// we use string because : parseFloat("-0") returns 0..
	function sign(stringDegree){
		return ((stringDegree[0] == "-") ? -1 : 1);
	}

	var RA = equatorial[0].split(" ");
	// long
	var deg = parseFloat(RA[0]);
	var min = parseFloat(RA[1]);
	var sec = parseFloat(RA[2]);
	
	dest[0] = (deg + min/60 + sec/3600) * 15.;
	if(dest[0] > 180)
		dest[0] -= 360;
	
	var Decl = equatorial[1].split(" ");
	// lat
	deg = parseFloat(Decl[0]);
	min = parseFloat(Decl[1]);
	sec = parseFloat(Decl[2]);
	
	dest[1] = sign(Decl[0]) * (Math.abs(deg) + min/60 + sec/3600);
	
	return dest;

}

/**
*	Convert a geographic position to equatorial
*	@param {Float[]} geo Array of two floats corresponding to Longitude and Latitude
*	@param {String[]} dest Destination array of two strings corresponding to Right Ascension and Declination
*					  specified by: "hours minuts seconds" and "degrees minuts seconds" respectively
*/
GlobWeb.CoordinateSystem.fromGeoToEquatorial = function(geo, dest){
	
	if (!dest) dest = [];
	
	function stringSign(val){
		return (val>=0 ? "" : "-");
	}
	
	var deg = geo[0];
	// RA
	if(deg < 0){
		deg += 360;
	}
	
	var deg = deg/15;
	
	var absLon = Math.abs(deg);
	var hours = Math.floor(absLon);
	var decimal = (absLon - hours) * 60;
	var min = Math.floor(decimal);
	var sec = (decimal - min) * 60;
	
	dest[0] = hours+" "+min+" "+sec;
	
	// Decl
	var absLat = Math.abs(geo[1]);
	deg = Math.floor(absLat);
	decimal = (absLat - deg) * 60;
	min = Math.floor(decimal);
	sec = (decimal - min) * 60;
	
	dest[1] = stringSign(geo[1]) +""+ deg + " " + min + " " + sec;
	
	return dest;
}

GlobWeb.CoordinateSystem.equatorialLayout = function(equatorialCoordinates)
{
	function roundNumber(num, dec) {
		var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
		return result;
	}
	
	var wordRA = equatorialCoordinates[0].split(" ");
	var wordDecl = equatorialCoordinates[1].split(" ");
	return [ wordRA[0] +"h "+ wordRA[1] +"mn "+ roundNumber(parseFloat(wordRA[2]), 2) +"s", wordDecl[0]+String.fromCharCode(176) +" "+ wordDecl[1] +"' "+ roundNumber(parseFloat(wordDecl[2]), 2) ];
}

/*
	Get local transformation
 */
GlobWeb.CoordinateSystem.getLocalTransform = function(geo, dest)
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
}

/*
	Get local transformation
 */
GlobWeb.CoordinateSystem.getLHVTransform = function(geo, dest)
{
    if (!dest) { dest = mat4.create(); }

	var longitude = geo[0] * Math.PI / 180.0;
	var latitude = geo[1] * Math.PI / 180.0;
	
	var up = [  Math.cos(longitude)*Math.cos(latitude), Math.sin(longitude)*Math.cos(latitude), Math.sin(latitude) ];
	var east = [ -Math.sin(longitude), Math.cos(longitude), 0 ];
	var north = vec3.create();
	vec3.cross( up, east, north );
	
	var pt = GlobWeb.CoordinateSystem.fromGeoTo3D(geo);
	
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
}

/*
	Get the side (i.e. X) vector from a local transformation
 */
GlobWeb.CoordinateSystem.getSideVector = function( matrix, v )
{
	v[0] = matrix[0];
	v[1] = matrix[1];
	v[2] = matrix[2];
	
    return v;
}

/*
	Get the front (i.e. Y) vector from a local transformation
 */
GlobWeb.CoordinateSystem.getFrontVector = function( matrix, v )
{
	v[0] = matrix[4];
	v[1] = matrix[5];
	v[2] = matrix[6];
	
    return v;
}

/*
	Get the up (i.e. Z) vector from a local transformation
 */
GlobWeb.CoordinateSystem.getUpVector = function( matrix, v )
{
	v[0] = matrix[8];
	v[1] = matrix[9];
	v[2] = matrix[10];
	
    return v;
}

