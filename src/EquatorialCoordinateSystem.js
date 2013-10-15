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

define( ['./CoordinateSystem', './Numeric', './AstroCoordTransform', './glMatrix'], function(CoordinateSystem, Numeric, AstroCoordTransform) {

/**************************************************************************************************************/

// Default coordinate system: ("EQ" or "GAL")
CoordinateSystem.type = "EQ";

/**
*	Convert a 3D position to equatorial coordinates
*/
CoordinateSystem.from3DToEquatorial = function(position3d, dest){
	
	if (!dest) { dest = new Array(3); }
	
	var geo = [];

	CoordinateSystem.from3DToGeo(position3d, geo);
	CoordinateSystem.fromGeoToEquatorial(geo, dest);
	
	return dest;
}

/**************************************************************************************************************/

/**
*	Converts an equatorial position to 3D
*/
CoordinateSystem.fromEquatorialTo3D = function(equatorial, dest){
	
	if (!dest) { dest = new Array(3); }

	var geo = [];
	
	CoordinateSystem.fromEquatorialToGeo(equatorial, geo);
	CoordinateSystem.fromGeoTo3D(geo,dest);
	
	return dest;	
}

/**************************************************************************************************************/

/**
*	Convert an equatorial position to geographic
*	@param {String[]} equatorial Array of two strings corresponding to Right Ascension and Declination
*					  specified by: "hours minuts seconds" and "degrees minuts seconds" respectively
*	@param {Float[]} dest Destination array of two floats corresponding to Longitude and Latitude
*/
CoordinateSystem.fromEquatorialToGeo = function(equatorial, dest){
	
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

/**************************************************************************************************************/

/**
*	Convert a geographic position to equatorial
*	@param {Float[]} geo Array of two floats corresponding to Longitude and Latitude
*	@param {String[]} dest Destination array of two strings corresponding to Right Ascension and Declination
*					  specified by: 'hours+"h" minuts+"m" seconds+"s"' and 'degrees+"°" minuts+"\'" seconds+"""' respectively
* 	@see <CoordinateSystem.fromDegreesToDMS>
* * 	@see <CoordinateSystem.fromDegreesToHMS>
*/
CoordinateSystem.fromGeoToEquatorial = function(geo, dest){
	
	if (!dest) dest = [];
	
	var deg = geo[0];
	// RA
	if(deg < 0){
		deg += 360;
	}

	dest[0] = CoordinateSystem.fromDegreesToHMS( deg );
	dest[1] = CoordinateSystem.fromDegreesToDMS(geo[1]);
	
	return dest;
}

/**************************************************************************************************************/

/**
 *	Function converting degrees to DMS("degrees minuts seconds")
 * 
 *	@param {Float} degree The degree
 */

CoordinateSystem.fromDegreesToDMS = function(degree)
{
	function stringSign(val)
	{
		return (val>=0 ? "+": "-");
	}
	
	var absLat = Math.abs(degree);
	var deg = Math.floor(absLat);
	var decimal = (absLat - deg) * 60;
	var min = Math.floor(decimal);
	var sec = (decimal - min) * 60;
	
	return stringSign(degree) + deg + String.fromCharCode(176) +" "+ min +"' "+ Numeric.roundNumber(sec, 2)+"\"";
	
}

/**************************************************************************************************************/

/**
 *	Function converting degrees to HMS("hours minuts seconds")
 *
 *	@param {Float} degree The degree > 0
 */

CoordinateSystem.fromDegreesToHMS = function(degree)
{
	var degree = degree/15;
	
	var absLon = Math.abs(degree);
	var hours = Math.floor(absLon);
	var decimal = (absLon - hours) * 60;
	var min = Math.floor(decimal);
	var sec = (decimal - min) * 60;
	
	return hours+"h "+min+"m "+ Numeric.roundNumber(sec, 2) +"s";
}

/**************************************************************************************************************/

/**
 *	Conversion between coordinate systems("EQ" or "GAL")
 *
 *	@param {Float[]} geo Geographic coordinates
 *	@param from Type of source coordinate system
 *	@param to Type of destination coordinate system
 */
CoordinateSystem.convert = function(geo, from, to)
{
	switch ( from+"2"+to ) {
		case "GAL2EQ" :
			convertType = AstroCoordTransform.Type.GAL2EQ;
			break;
		case "EQ2GAL" :
			convertType = AstroCoordTransform.Type.EQ2GAL;
			break;
		default:
			console.error("Not implemented");
			return null;
	}
	
	return AstroCoordTransform.transformInDeg( geo, convertType );
}

/**************************************************************************************************************/

/**
 *	Transfrom 3D vector from galactic coordinate system to equatorial
 */
CoordinateSystem.transformVec = function( vec )
{
	var res = [];
	mat4.multiplyVec3( transformMatrix, vec, res );
	return res;
}

/**************************************************************************************************************/

// Compute transformation matrix from GAL to EQ in 3D coordinates
var transformMatrix = [];

var galNorth = CoordinateSystem.convert([0,90], 'GAL', 'EQ');
var gal3DNorth = CoordinateSystem.fromGeoTo3D(galNorth);

var galCenter = CoordinateSystem.convert([0, 0], 'GAL', 'EQ');
var gal3DCenter = CoordinateSystem.fromGeoTo3D(galCenter);

var galEast = CoordinateSystem.convert([90, 0], 'GAL', 'EQ');
var gal3DEast = CoordinateSystem.fromGeoTo3D(galEast);

transformMatrix[0] = gal3DCenter[0];
transformMatrix[1] = gal3DCenter[1];
transformMatrix[2] = gal3DCenter[2];
transformMatrix[3] = 0.;
transformMatrix[4] = gal3DEast[0];
transformMatrix[5] = gal3DEast[1];
transformMatrix[6] = gal3DEast[2];
transformMatrix[7] = 0.;
transformMatrix[8] = gal3DNorth[0];
transformMatrix[9] = gal3DNorth[1];
transformMatrix[10] = gal3DNorth[2];
transformMatrix[11] = 0.;
transformMatrix[12] = 0.;
transformMatrix[13] = 0.;
transformMatrix[14] = 0.;
transformMatrix[15] = 1.;
mat4.create(transformMatrix);
mat4.inverse(transformMatrix);

return CoordinateSystem;

});
