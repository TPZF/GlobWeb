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
 
 define( function() {
 
 /**
  Triangulator code taken from http://www.flipcode.com/archives/Efficient_Polygon_Triangulation.shtml
  Does not manage holes
  Seems to be O(n^3)!
 */
var EPSILON = 0.0000000001;

/*
 Compute the signed area of a polygon
*/
var Area = function(contour)
{
	var n = contour.length;
	var A=0.0;
	for(var p=n-1,q=0; q<n; p=q++)
	{
		A+= contour[p][0]*contour[q][1] - contour[q][0]*contour[p][1];
	}
	return A*0.5;
}

/*
 InsideTriangle decides if a point P is Inside of the triangle
 defined by A, B, C.
*/
var InsideTriangle = function(Ax, Ay,
					  Bx, By,
					  Cx, Cy,
					  Px, Py)

{
  var ax, ay, bx, by, cx, cy, apx, apy, bpx, bpy, cpx, cpy;
  var cCROSSap, bCROSScp, aCROSSbp;

  ax = Cx - Bx;  ay = Cy - By;
  bx = Ax - Cx;  by = Ay - Cy;
  cx = Bx - Ax;  cy = By - Ay;
  apx= Px - Ax;  apy= Py - Ay;
  bpx= Px - Bx;  bpy= Py - By;
  cpx= Px - Cx;  cpy= Py - Cy;

  aCROSSbp = ax*bpy - ay*bpx;
  cCROSSap = cx*apy - cy*apx;
  bCROSScp = bx*cpy - by*cpx;

  return ((aCROSSbp >= 0.0) && (bCROSScp >= 0.0) && (cCROSSap >= 0.0));
};

/*
 Check if the giben triangle (u,v,w) is a ear : not other vertex inside
*/
var Snip = function(contour, u, v, w, n, V)
{
  var p;
  var Ax, Ay, Bx, By, Cx, Cy, Px, Py;

  Ax = contour[V[u]][0];
  Ay = contour[V[u]][1];

  Bx = contour[V[v]][0];
  By = contour[V[v]][1];

  Cx = contour[V[w]][0];
  Cy = contour[V[w]][1];

  if ( EPSILON > (((Bx-Ax)*(Cy-Ay)) - ((By-Ay)*(Cx-Ax))) ) return false;

  for (p=0;p<n;p++)
  {
	if( (p == u) || (p == v) || (p == w) ) continue;
	Px = contour[V[p]][0];
	Py = contour[V[p]][1];
	if (InsideTriangle(Ax,Ay,Bx,By,Cx,Cy,Px,Py)) return false;
  }

  return true;
}
			
/*
 Process triangulation on the given contour
*/
var Process = function( contour )
{
  /* allocate and initialize list of Vertices in polygon */

  var n = contour.length; 
  if ( contour[0][0] == contour[n-1][0] && contour[0][1] == contour[n-1][1] )
	n--;
	
  if ( n < 3 ) return null;

  var V = new Array(n);

  /* we want a counter-clockwise polygon in V */

  if ( 0.0 < Area(contour) )
	for (var v=0; v<n; v++) V[v] = v;
  else
	for(var v=0; v<n; v++) V[v] = (n-1)-v;

  var nv = n;
  
  var results = [];

  /*  remove nv-2 Vertices, creating 1 triangle every time */
  var count = 2*nv;   /* error detection */

  for (var m=0, v=nv-1; nv>2; )
  {
	/* if we loop, it is probably a non-simple polygon */
	if (0 >= (count--))
	{
	  //** Triangulate: ERROR - probable bad polygon!
	  return null;
	}

	/* three consecutive vertices in current polygon, <u,v,w> */
	var u = v  ; if (nv <= u) u = 0;     /* previous */
	v = u+1; if (nv <= v) v = 0;     /* new v    */
	var w = v+1; if (nv <= w) w = 0;     /* next     */

	if ( Snip(contour,u,v,w,nv,V) )
	{
	  var a,b,c,s,t;

	  /* true names of the vertices */
	  a = V[u]; b = V[v]; c = V[w];

	  /* output Triangle */
	  results.push( a );
	  results.push( b );
	  results.push( c );
	  
	  m++;

	  /* remove v from remaining polygon */
	  for(s=v,t=v+1;t<nv;s++,t++) V[s] = V[t]; nv--;

	  /* resest error detection counter */
	  count = 2*nv;
	}
  }

  return results;
}
	
var Triangulator = 	{
	process: Process
};

return Triangulator;

});
