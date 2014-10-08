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

var AugustCoordinateSystem = function(options)
{
	CoordinateSystem.prototype.constructor.call( this, options );
    this.isFlat = true;
};

/**************************************************************************************************************/

Utils.inherits( CoordinateSystem, AugustCoordinateSystem );

/**************************************************************************************************************/

/**
 *	From 3D to Mercator
 */
AugustCoordinateSystem.prototype.from3DToGeo = function(position3d, dest) {
    // TODO
};

/**************************************************************************************************************/

/**
 *  From Mercator to 3D
 */
AugustCoordinateSystem.prototype.fromGeoTo3D = function(geoPos, dest) {
	if (!dest) { dest = new Array(3); }

    var lambda = geoPos[0] * Math.PI / 180; // longitude
    var phi = geoPos[1] * Math.PI / 180; // latitude

    var tanPhi = Math.tan(phi / 2),
        k = Math.sqrt(1 - tanPhi * tanPhi),
        c = 1 + k * Math.cos(lambda /= 2),
        x = Math.sin(lambda) * k / c,
        y = tanPhi / c,
        x2 = x * x,
        y2 = y * y;

    dest[0] = 4 / 3 * x * (3 + x2 - 3 * y2);
    dest[1] = 4 / 3 * y * (3 + 3 * x2 - y2);
    dest[2] = 0;
    return dest;
};

/**************************************************************************************************************/

return AugustCoordinateSystem;

});