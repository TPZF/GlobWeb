/***************************************
 * Copyright 2011, 2012 GlobWeb contributors.
 * Copyright (c) 2013, Michael Bostock
 * All rights reserved.
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

define( ['./CoordinateSystem', './Utils', './glMatrix'],
	function(CoordinateSystem, Utils) {

/**************************************************************************************************************/

/**
 *  Aitoff coordinate system
 */
var AitoffCoordinateSystem = function(options)
{
	CoordinateSystem.prototype.constructor.call( this, options );
    this.isFlat = true;
};

/**************************************************************************************************************/

Utils.inherits( CoordinateSystem, AitoffCoordinateSystem );

/**************************************************************************************************************/

/**
 *	Inverse sampling function(sinc)
 */
var _sinci = function(x) {
   return x ? x / Math.sin(x) : 1;
}

/**************************************************************************************************************/

/**
 *	From 3D to Aitoff
 */
AitoffCoordinateSystem.prototype.from3DToGeo = function(position3d, dest) {
    if (!dest) { dest = new Array(3) };

    var epsilon = 0.005;
    // Abort if [x, y] is not within an ellipse centered at [0, 0] with
  	// semi-major axis pi and semi-minor axis pi/2.
  	if (position3d[0] * position3d[0] + 4 * position3d[1] * position3d[1] > Math.PI * Math.PI + epsilon) return;

	var lambda = position3d[0],
		phi = position3d[1],
		i = 25;

	do {
		var sinLambda = Math.sin(lambda),
		    sinLambda_2 = Math.sin(lambda / 2),
		    cosLambda_2 = Math.cos(lambda / 2),
		    sinPhi = Math.sin(phi),
		    cosPhi = Math.cos(phi),
		    sin_2phi = Math.sin(2 * phi),
		    sin2phi = sinPhi * sinPhi,
		    cos2phi = cosPhi * cosPhi,
		    sin2lambda_2 = sinLambda_2 * sinLambda_2,
		    C = 1 - cos2phi * cosLambda_2 * cosLambda_2,
		    E = C ? Math.acos(cosPhi * cosLambda_2) * Math.sqrt(F = 1 / C) : F = 0,
		    F,
		    fx = 2 * E * cosPhi * sinLambda_2 - position3d[0],
		    fy = E * sinPhi - position3d[1],
		    deltaXLambda = F * (cos2phi * sin2lambda_2 + E * cosPhi * cosLambda_2 * sin2phi),
		    deltaXPhi = F * (.5 * sinLambda * sin_2phi - E * 2 * sinPhi * sinLambda_2),
		    deltaYLambda = F * .25 * (sin_2phi * sinLambda_2 - E * sinPhi * cos2phi * sinLambda),
		    deltaYPhi = F * (sin2phi * cosLambda_2 + E * sin2lambda_2 * cosPhi),
		    denominator = deltaXPhi * deltaYLambda - deltaYPhi * deltaXLambda;
		if (!denominator) break;
			var deltaLambda = (fy * deltaXPhi - fx * deltaYPhi) / denominator,
			    deltaPhi = (fx * deltaYLambda - fy * deltaXLambda) / denominator;
			lambda -= deltaLambda, phi -= deltaPhi;
	} while ((Math.abs(deltaLambda) > epsilon || Math.abs(deltaPhi) > epsilon) && --i > 0);

	dest[0] = lambda * 180/Math.PI;
	dest[1] = phi * 180/Math.PI;
	dest[2] = 0.;
	return dest;
};

/**************************************************************************************************************/

/**
 *  From Aitoff to 3D
 */
AitoffCoordinateSystem.prototype.fromGeoTo3D = function(geoPos, dest) {
	if (!dest) { dest = new Array(3); }

	var lambda = geoPos[0] * Math.PI/180; // longitude
 	var phi = geoPos[1] * Math.PI/180;  // latitude

 	var cosPhi = Math.cos(phi);
 	var sinciAlpha = _sinci(Math.acos(cosPhi * Math.cos(lambda /= 2)));

	dest[0] = 2 * cosPhi * Math.sin(lambda) * sinciAlpha;
	dest[1] = Math.sin(phi) * sinciAlpha;
	dest[2] = 0;

	// Triple winkel: mode
	// TODO: inverse
	// dest[0] = (dest[0] + lambda / Math.PI/2) / 2;
    // dest[1] = (dest[1] + phi) / 2;

    return dest;
};

/**************************************************************************************************************/

return AitoffCoordinateSystem;

});