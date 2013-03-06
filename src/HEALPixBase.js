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

/** 
 *	Module which contains all the maths stuff
 */
define(['./HEALPixTables','./Long'], function(HealPixTables,Long) {

/**************************************************************************************************************/

var HALF_PI = 3.14159265/2;

var lonLat2ang = function(lon, lat)
{
	if ( lon < 0 )
		lon += 360;

	var phi = lon * Math.PI / 180.;
	
	var theta = ( -lat + 90. ) * Math.PI / 180.;
	return [phi, theta];
}

/**************************************************************************************************************/

/** Returns the remainder of the division {@code v1/v2}.
  The result is non-negative.
  @param v1 dividend; can be positive or negative
  @param v2 divisor; must be positive
  @return Remainder of the division; positive and smaller than {@code v2} */
var fmodulo = function(v1, v2)
{
	if (v1>=0.)
		return (v1<v2) ? v1 : v1%v2;
	var tmp=v1%v2+v2;
	return (tmp==v2) ? 0. : tmp;
}

/**************************************************************************************************************/

var spread_bits = function(v)
{
	return (HealPixTables.utab[ v      &0xff])      | ((HealPixTables.utab[(v>>> 8)&0xff])<<16)
		| ((HealPixTables.utab[(v>>>16)&0xff])<<32) | ((HealPixTables.utab[(v>>>24)&0xff])<<48);
}

/**************************************************************************************************************/

var xyf2nest = function(ix, iy, face_num, order)
{
    return ((face_num)<<(2*order)) +
     		 spread_bits(ix) + (spread_bits(iy)<<1);
}

/**************************************************************************************************************/

var loc2pix = function(order, phi, theta)
{
	var nside = Math.pow(2, order);
	var z = Math.cos(theta);
	var phi = phi;

	var loc = {
		phi: phi,
		theta: theta,
		z: z
	}
	if (Math.abs(z)>(9./10.))
	{
	  loc.sth = Math.sin(theta);
	  loc.have_sth=true;
	}

	var inv_halfpi = 2./Math.PI;
	var tt = fmodulo((phi*inv_halfpi),4.0);// in [0,4)

	var za = Math.abs(z);
	if (za<=2./3.) // Equatorial region
	{
		var temp1 = nside*(0.5+tt);
        var temp2 = nside*(z*0.75);

        var jp = Long.fromNumber(temp1 - temp2);
        var jm = Long.fromNumber(temp1 + temp2);
        var ifp = jp.shiftRightUnsigned(order);
        var ifm = jm.shiftRightUnsigned(order);
        var face_num;
        if ( ifp.equals(ifm) )
        {
        	face_num = ifp.or(Long.fromInt(4));
        }
        else
        {
        	if ( ifp.lessThan(ifm) )
        	{
        		face_num = ifp;
        	}
        	else
        	{
        		face_num = ifm.add(Long.fromInt(8));
        	}
        }

        var nSideMinusOne = Long.fromNumber(nside-1);
        var ix = jm.and( nSideMinusOne );
        var iy = nSideMinusOne.subtract( jp.and(nSideMinusOne) );

        return xyf2nest(ix.toInt(),iy.toInt(),face_num.toInt(), order);

	}
		else // polar region, za > 2/3
	{
		var ntt = parseInt( Math.min( 3, parseInt(tt) ) );
		var tp = tt-ntt;
		var tmp = ( (za < (9./10.)) || (!loc.have_sth) ) ?
						nside*Math.sqrt(3*(1-za)) :
						nside*loc.sth/Math.sqrt((1.+za)/3.);

		var jp = Long.fromNumber(tp*tmp);
		var jm = Long.fromNumber((1.0-tp)*tmp);
		var lNside = Long.fromNumber(nside);
		var nSideMinusOne = Long.fromNumber(nside-1.);
		var lOne = Long.fromInt(1);
		if ( jp.greaterThanOrEqual(lNside) )
			jp = nSideMinusOne;
		if ( jm.greaterThanOrEqual(lNside) )
			jm = nSideMinusOne;

		if (z>=0)
		{
			return xyf2nest( lNside.subtract(jm).subtract(lOne).toInt(), lNside.subtract(jp).subtract(lOne).toInt(), ntt, order );
		}
		else
		{
			return xyf2nest( jp.toInt(), jm.toInt(), ntt+8, order );
		}
	}
}

/**************************************************************************************************************/

var HEALPixBase = {
	compress_bits: function(v){
		//  raw  = v & 0x5555555555555 in place of raw = v & 0x5555555555555555
		//		--> still not resolved, dunno why
		//
		
		// in Java implementation mask == 0x5555555555555555
		// var raw = v & 0x5555555555555; // v & 101010101010101010101010101010101010101010101010101010101010101
										  // // raw>>>15 = 0101010101010101010101010101010101010101010101010
		// var dec = raw>>>15;
		// raw |= dec;				  // 101010101010101111111111111111111111111111111111111111111111111
		// var raw1 = (raw&0xffff);
		// var dec2 = raw>>>31;
		// var raw2 = (dec2&0xffff);
		
		var longV = Long.fromNumber(v);
		var longMask = Long.fromNumber(0x5555555555555);
		var raw = longV.and(longMask);
		var dec = raw.shiftRightUnsigned(15);
		raw = raw.or(dec);
		var raw1 = (raw.and(Long.fromNumber(0xffff))).toInt();
		var dec2 = raw.shiftRightUnsigned(32);
		var raw2 = (dec2.and(Long.fromNumber(0xffff))).toInt();
		
		return HealPixTables.ctab[raw1&0xff] | (HealPixTables.ctab[raw1>>>8]<< 4)
			| (HealPixTables.ctab[raw2&0xff]<<16) | (HealPixTables.ctab[raw2>>>8]<<20);
	},

	/**
	 *	Function describing a location on the sphere
	 */
	fxyf: function(_fx,_fy,_face){	
		var jr = HealPixTables.jrll[_face] - _fx - _fy;
		var z = 0;
		var phi = 0;
		var sth = 0;
		var have_sth = false;

		var nr;
		if (jr<1){
			nr = jr;
			var tmp = nr*nr/3.;
			z = 1 - tmp;
			if (z>0.99) { sth=Math.sqrt(tmp*(2.-tmp)); have_sth=true; }
		} else if (jr>3){
			nr = 4-jr;
			var tmp = nr*nr/3.;
			z = tmp - 1;
			if (z<-0.99) {
				sth=Math.sqrt(tmp*(2.-tmp)); 
				have_sth=true;
			}
		} else {
			nr = 1;
			z = (2-jr)*2./3.;
		}

		var tmp=HealPixTables.jpll[_face]*nr+_fx-_fy;
		if (tmp<0) tmp+=8;
		if (tmp>=8) tmp-=8;
		
		phi = (nr<1e-15) ? 0 : (0.5*HALF_PI*tmp)/nr;
		
		var st = (have_sth) ? sth : Math.sqrt((1.0-z)*(1.0+z));
		return [st*Math.cos(phi), st*Math.sin(phi), z];
	},

	/**
	 *	Static function
	 *	Convert nside to order
	 *	(ilog2(nside))
	 */
	nside2order: function(arg){
		var res=0;
		while (arg > 0x0000FFFF) { res+=16; arg>>>=16; }
		if (arg > 0x000000FF) { res|=8; arg>>>=8; }
		if (arg > 0x0000000F) { res|=4; arg>>>=4; }
		if (arg > 0x00000003) { res|=2; arg>>>=2; }
		if (arg > 0x00000001) { res|=1; }
		return res;
	},

	/**
	 *	Returns pixel index of point on sphere
	 *
	 *	@param order Tile order
	 *	@param lon Longitude
	 *	@param lat Latitude
	 */
	lonLat2pix: function(order, lon, lat){
		var loc = lonLat2ang( lon, lat );
		return loc2pix( order, loc[0], loc[1] );
	}
};

/**************************************************************************************************************/

return HEALPixBase;

});