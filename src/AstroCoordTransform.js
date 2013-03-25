/***************************************
 * Copyright 2011, 2012 GlobWeb contributors.
 *
 * This file is part of GlobWeb.
 *  Ported from HEALPix Java code supported by the Gaia project.
 * 	Copyright (C) 2006-2011 Gaia Data Processing and Analysis Consortium
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

define(function() {

/**************************************************************************************************************/

/** The Constant twoPi. */
var twoPi=2.*Math.PI;

/** The Constant fourPi. */
var fourPi=4.*Math.PI;

/** The Constant degToRad. */
var degToRad=180.0/Math.PI;

/** The Constant psi. */
var psi = [
	[0.57595865315,4.92619181360,0.00000000000,0.00000000000,0.11129056012,4.70053728340],
	[0.57477043300,4.93682924650,0.00000000000,0.00000000000,0.11142137093,4.71279419371]
];

/** The Constant stheta. */
var stheta = [
	[0.88781538514,-0.88781538514, 0.39788119938,-0.39788119938, 0.86766174755,-0.86766174755],
	[0.88998808748,-0.88998808748, 0.39777715593,-0.39777715593, 0.86766622025,-0.86766622025]
];

/** The Constant ctheta. */
var ctheta = [
	[0.46019978478,0.46019978478,0.91743694670,0.91743694670,0.49715499774,0.49715499774],
	[0.45598377618,0.45598377618,0.91748206207,0.91748206207,0.49714719172,0.49714719172]
];

/** The Constant phi. */
var phi = [
	[4.92619181360,0.57595865315,0.00000000000,0.00000000000,4.70053728340,0.11129056012],
	[4.93682924650,0.57477043300,0.00000000000,0.00000000000,4.71279419371,0.11142137093]
];

var AstroCoordTransform = {

	/**Transforms an angular position in radians in a given coordinate system to a position
	   in an other coordinate system, also in radians. RA-Dec position are intended in 
	   Equinox J2000
	   
	   @param {Float[]} pos Angular position [phi, theta]
	   @param trType Transform type
	 */
    transform: function(pos, trType) 
	{
		var ao,bo,a,b,sb,cb,cbsa;
		var J2000 = 1;
		//by setting J2000 = 0, RA-Dec are intended in Equinox 1950.

		a= pos[0] - phi[J2000][trType];
		b= pos[1];
		sb=Math.sin(b);
		cb=Math.cos(b);
		cbsa=cb*Math.sin(a);
		b=-stheta[J2000][trType] * cbsa + ctheta[J2000][trType]*sb;
		b=Math.max(-1.0,Math.min(b,1.0));
		bo=Math.asin(b);
		
		a=Math.atan2(ctheta[J2000][trType] * cbsa+ stheta[J2000][trType]*sb,cb*Math.cos(a));
		ao=(a+psi[J2000][trType]+fourPi)%twoPi;

		return [ao, bo]; // phi, theta
    },

    /**Transforms an angular position in degrees in a given coordinate system to a position
       in an other coordinate systems, also in degrees. RA-Dec position are intended in 
       Equinox J2000

       @param {Float[]} pos Angular position [phi, theta]
       @param trType Transform type
       */
    transformInDeg: function(pos, trType) 
	{
		var ao,bo,a,b,sb,cb,cbsa;
		var J2000 = 1;
		//by setting J2000 = 0, RA-Dec are intended in Equinox 1950.

		a= pos[0]/degToRad - phi[J2000][trType];
		b= pos[1]/degToRad;
		sb=Math.sin(b);
		cb=Math.cos(b);
		cbsa=cb*Math.sin(a);
		b=-stheta[J2000][trType] * cbsa + ctheta[J2000][trType]*sb;
		b=Math.max(-1.0,Math.min(b,1.0));
		bo=Math.asin(b)*degToRad;
		
		a=Math.atan2(ctheta[J2000][trType] * cbsa+ stheta[J2000][trType]*sb,cb*Math.cos(a));
		ao= ((a+psi[J2000][trType]+fourPi)%twoPi)*degToRad;

		return [ao, bo];		      
    }
};

/**
 *	Transform type enumerations
 */
AstroCoordTransform.Type = 
{
	EQ2GAL: 0,		//RA-Dec (2000) -> Galactic
	GAL2EQ: 1,		//Galactic      -> RA-Dec
	EQ2ECL: 2,		//RA-Dec        -> Ecliptic
	ECL2EQ: 3,		//Ecliptic      -> RA-Dec
	ECL2GAL: 4,		//Ecliptic      -> Galactic
	GAL2ECL: 5 		//Galactic      -> Ecliptic
};

/**************************************************************************************************************/

return AstroCoordTransform;

});
