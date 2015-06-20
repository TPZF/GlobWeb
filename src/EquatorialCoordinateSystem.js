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

define( ['./CoordinateSystem', './Utils', './Numeric', './AstroCoordTransform', './glMatrix'], function(CoordinateSystem, Utils, Numeric, AstroCoordTransform) {

/**************************************************************************************************************/

var EquatorialCoordinateSystem = function(options)
{
	CoordinateSystem.prototype.constructor.call( this, options );
	// Default coordinate system: ("EQ" or "GAL")
	this.type = "EQ";
};

/**************************************************************************************************************/

Utils.inherits( CoordinateSystem, EquatorialCoordinateSystem );

/**************************************************************************************************************/

/**
*	Convert a 3D position to equatorial coordinates
*/
EquatorialCoordinateSystem.prototype.from3DToEquatorial = function(position3d, dest, inSexagesimal){
	
	dest = dest || new Array(3);
	if( typeof(inSexagesimal) == 'undefined' ) {
		inSexagesimal = true;	
	}
	
	var geo = [];

	this.from3DToGeo(position3d, geo);
	this.fromGeoToEquatorial(geo, dest, inSexagesimal);
	
	return dest;
};

/**************************************************************************************************************/

/**
*	Converts an equatorial position to 3D
*/
EquatorialCoordinateSystem.prototype.fromEquatorialTo3D = function(equatorial, dest, inSexagesimal){
	
	dest = dest || new Array(3);
	if( typeof(inSexagesimal) == 'undefined' ) {
		inSexagesimal = true;	
	}
	var geo = [];
	
	this.fromEquatorialToGeo(equatorial, geo, inSexagesimal);
	this.fromGeoTo3D(geo,dest);
	
	return dest;	
};

/**************************************************************************************************************/

/**
*	Convert an equatorial position to geographic
*	@param {String[]} equatorial Array of two numbers or strings corresponding to Right Ascension and Declination
*	@param {Float[]} dest Destination array of two floats corresponding to Longitude and Latitude		  
*	@param {Boolean} inSexagesimal, by default true. When inSexagesimal is true, the equatorial parameter is processed as a sexagesimal expression
*                                       specified by: 'hours+"h" minuts+"m" seconds+"s"' and 'degrees+"°" minuts+"\'" seconds+"""'
*/
EquatorialCoordinateSystem.prototype.fromEquatorialToGeo = function(equatorial, dest, inSexagesimal){
	
	dest = dest || [];
	if( typeof(inSexagesimal) == 'undefined' ) {
		inSexagesimal = true;	
	}

	if (inSexagesimal) {	
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
	
		var Decl = equatorial[1].split(" ");
		// lat
		deg = parseFloat(Decl[0]);
		min = parseFloat(Decl[1]);
		sec = parseFloat(Decl[2]);
	
		dest[1] = sign(Decl[0]) * (Math.abs(deg) + min/60 + sec/3600);
	} else {
		dest[0] = equatorial[0];
		dest[1] = equatorial[1];
	}
	if(dest[0] > 180) {
		dest[0] -= 360;
	}	
	return dest;

};

/**************************************************************************************************************/

/**
*	Convert a geographic position to equatorial
*	@param {Float[]} geo Array of two floats corresponding to Longitude and Latitude
*	@param {String[]} dest Destination array of two numbers or two strings in sexagesimal, respectively the Right Ascension and Declination
*			  the Right ascension is in [0..360], the declination [-90..90]			  
*	@param {Boolean} inSexagesimal, by default true. When inSexagesimal is true, the dest parameter is transformed in sexagesimal
*                                       specified by: 'hours+"h" minuts+"m" seconds+"s"' and 'degrees+"°" minuts+"\'" seconds+"""'
* 	@see <CoordinateSystem.fromDegreesToDMS>
* * 	@see <CoordinateSystem.fromDegreesToHMS>
*/
EquatorialCoordinateSystem.prototype.fromGeoToEquatorial = function(geo, dest, inSexagesimal){
	
	dest = dest || [];
	if( typeof(inSexagesimal) == 'undefined' ) {
		inSexagesimal = true;	
	}
	 
	var deg = geo[0];
	// RA
	if(deg < 0){
		deg += 360;
	}

	if (inSexagesimal) {
		dest[0] = this.fromDegreesToHMS( deg );
		dest[1] = this.fromDegreesToDMS(geo[1]);
	} else {
		dest[0] = deg;
		dest[1] = geo[1];
	}
	
	return dest;
};


/**************************************************************************************************************/

/**
 *	Function converting degrees to DMS("degrees minuts seconds")
 * 
 *	@param {Float} degree The degree
 */

EquatorialCoordinateSystem.prototype.fromDegreesToDMS = function(degree)
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
	
};

/**************************************************************************************************************/

/**
 *	Function converting degrees to HMS("hours minuts seconds")
 *
 *	@param {Float} degree The degree > 0
 */

EquatorialCoordinateSystem.prototype.fromDegreesToHMS = function(degree)
{
	var degree = degree/15;
	
	var absLon = Math.abs(degree);
	var hours = Math.floor(absLon);
	var decimal = (absLon - hours) * 60;
	var min = Math.floor(decimal);
	var sec = (decimal - min) * 60;
	
	return hours+"h "+min+"m "+ Numeric.roundNumber(sec, 2) +"s";
};

/**************************************************************************************************************/

/**
 *	Conversion between coordinate systems("EQ" or "GAL")
 *
 *	@param {Float[]} geo Geographic coordinates
 *	@param from Type of source coordinate system
 *	@param to Type of destination coordinate system
 */
EquatorialCoordinateSystem.prototype.convert = function(geo, from, to)
{
	// No conversion needed
	if ( from == to ) {
		return geo;
	}

	var convertedGeo = null;
	var convertType = null;
	switch ( from+"2"+to ) {
		case "GAL2EQ" :
			convertType = AstroCoordTransform.Type.GAL2EQ;
			convertedGeo = AstroCoordTransform.transformInDeg( geo, convertType );
			break;
		case "EQ2GAL" :
			convertType = AstroCoordTransform.Type.EQ2GAL;
			convertedGeo = AstroCoordTransform.transformInDeg( geo, convertType );
			if (convertedGeo[0] < 0) {
				// TODO : Check if convertedGeo can be negative
				console.warn("EQ2GAL transformation returned negative value");
				convertedGeo[0]+=360;
			}
			break;
		default:
			console.error("Not implemented");
	}
	
	return convertedGeo;
};

/**************************************************************************************************************/

/**
 *	Transfrom 3D vector from galactic coordinate system to equatorial
 */
EquatorialCoordinateSystem.prototype.transformVec = function( vec )
{
	var transformMatrix = this.computeTransformMatrix();
	var res = [];
	mat4.multiplyVec3( transformMatrix, vec, res );
	return res;
};

/**************************************************************************************************************/

/**
 *	Compute transform matrix from GAL to EQ in 3D coordinates
 */
EquatorialCoordinateSystem.prototype.computeTransformMatrix = function()
{
	var transformMatrix = [];

	var galNorth = this.convert([0,90], 'GAL', 'EQ');
	var gal3DNorth = this.fromGeoTo3D(galNorth);

	var galCenter = this.convert([0, 0], 'GAL', 'EQ');
	var gal3DCenter = this.fromGeoTo3D(galCenter);

	var galEast = this.convert([90, 0], 'GAL', 'EQ');
	var gal3DEast = this.fromGeoTo3D(galEast);

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

	return transformMatrix;
};

/**************************************************************************************************************/

return EquatorialCoordinateSystem;

});
