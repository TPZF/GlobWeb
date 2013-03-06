
define( ['./CoordinateSystem', './Numeric'], function(CoordinateSystem, Numeric) {

/**************************************************************************************************************/

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
		return (val>=0 ? "": "-");
	}
	
	var absLat = Math.abs(degree);
	deg = Math.floor(absLat);
	decimal = (absLat - deg) * 60;
	min = Math.floor(decimal);
	sec = (decimal - min) * 60;
	
	return stringSign(degree) + deg + String.fromCharCode(176) +" "+ min +"' "+ Numeric.roundNumber(sec, 2)+"\"";
	
}

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

});
