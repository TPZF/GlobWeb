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

define( ['./CoordinateSystem', './Utils', './glMatrix'],
	function(CoordinateSystem, Utils) {

/**************************************************************************************************************/

/**
 *  Mercator coordinate system
 *
 *  @param options
 *      <li>lambda0 : is the longitude of an arbitrary central meridian usually(but not always) Greenwich, in degrees</li>
 */
var MercatorCoordinateSystem = function(options)
{
	CoordinateSystem.prototype.constructor.call( this, options );
    this.isFlat = true;
    this.lambda0 = options && options.lambda0 ? options.lambda0 : 0.; // Greenwich (i.e., zero)
};

/**************************************************************************************************************/

Utils.inherits( CoordinateSystem, MercatorCoordinateSystem );

/**************************************************************************************************************/

/**
 *  Hyperbolic sine
 */
var _sinh = function(x)
{
    var expY = Math.exp(x);
    return (expY - 1/expY) / 2;
}

/**************************************************************************************************************/

/**
 *	From 3D to Mercator
 */
MercatorCoordinateSystem.prototype.from3DToGeo = function(position3d, dest) {
    if (!dest) { dest = new Array(3) };

    dest[0] = this.lambda0 + position3d[0] * 180 / Math.PI;    
    dest[1] = Math.atan( _sinh(position3d[1]) ) * 180 / Math.PI;
    dest[2] = 0.;
    return dest;
};

/**************************************************************************************************************/

/**
 *  From Mercator to 3D
 */
MercatorCoordinateSystem.prototype.fromGeoTo3D = function(geoPos, dest) {
	if (!dest) { dest = new Array(3); }

    // Clamp latitude values, since mercator converges to infinity at poles
    if ( geoPos[1] > 85.05 )
        geoPos[1] = 85.05;
    if ( geoPos[1] < -85.05 )
        geoPos[1] = -85.05;

	var longInRad = geoPos[0] * Math.PI/180; // longitude
    var latInRad = geoPos[1] * Math.PI/180;  // latitude

    var x = longInRad - (this.lambda0 * Math.PI/180);
    var y = Math.log(Math.tan(latInRad) + 1/Math.cos(latInRad));

    dest[0] = x;
    dest[1] = y;
    dest[2] = 0;
    return dest;
};

/**************************************************************************************************************/

return MercatorCoordinateSystem;

});