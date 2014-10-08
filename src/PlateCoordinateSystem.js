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
 *  Plate Carré coordinate system
 */
var PlateCoordinateSystem = function(options)
{
	CoordinateSystem.prototype.constructor.call( this, options );
    this.isFlat = true;
};

/**************************************************************************************************************/

Utils.inherits( CoordinateSystem, PlateCoordinateSystem );

/**************************************************************************************************************/

/**
 *	From 3D to Plate Carré
 */
PlateCoordinateSystem.prototype.from3DToGeo = function(position3d, dest) {
    if (!dest) { dest = new Array(3); }
    dest[0] = position3d[0] * 180/Math.PI;
    dest[1] = position3d[1] * 180/Math.PI;
    dest[2] = 0.;
    return dest;
};

/**************************************************************************************************************/

/**
 *  From Plate Carré to 3D
 */
PlateCoordinateSystem.prototype.fromGeoTo3D = function(geoPos, dest) {
	if (!dest) { dest = new Array(3); }
    dest[0] = geoPos[0] * Math.PI/180;
    dest[1] = geoPos[1] * Math.PI/180;
    dest[2] = 0.;
    return dest;
};

/**************************************************************************************************************/

return PlateCoordinateSystem;

});