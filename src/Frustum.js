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

define( ['./glMatrix'], function() {

/**************************************************************************************************************/

/** @constructor
	Plane constructor
 */
var Plane = function()
{
	this.normal = vec3.create( [0.0, 0.0, 0.0] );
	this.d = 0.0;
}

/**************************************************************************************************************/

/**
	Plane init from 3 points
 */
Plane.prototype.init = function( v1, v2, v3 )
{
	var vu = [];
	var vv = [];
	vec3.subtract( v2, v1, vu );
	vec3.subtract( v3, v1, vv );
	vec3.cross( vu, vv, this.normal );
	vec3.normalize( this.normal );
	this.d = - vec3.dot( v1, this.normal );
}


/**************************************************************************************************************/

/**
	Transform the plane with the given matrix
 */
Plane.prototype.transform = function(matrix)
{
	var vec = [ this.normal[0], this.normal[1], this.normal[2], this.d ];
	mat4.multiplyVec4(matrix,vec);
	this.normal[0] = vec[0];
	this.normal[1] = vec[1];
	this.normal[2] = vec[2];
	this.d = vec[3];
}

/**************************************************************************************************************/

/**
 Intersection test between plane and bounding sphere.
           return 1 if the bs is completely above plane,
            return 0 if the bs intersects the plane,
            return -1 if the bs is completely below the plane.
*/
Plane.prototype.intersectSphere = function( center, radius )
{
	var dist = vec3.dot( center, this.normal ) + this.d;
	if 	(dist > radius) return 1;
	else if ( dist < - radius ) return -1;
	else return 0;
}

/**************************************************************************************************************/

/**
	Return the distance between a point and the plane
*/
Plane.prototype.distance = function( point )
{
	return point[0] * this.normal[0] + point[1] * this.normal[1] + point[2] * this.normal[2] +  this.d
}


/**************************************************************************************************************/

/**
 Intersection test between plane and bounding box.
           return 1 if the bbox is completely above plane,
            return 0 if the bbox intersects the plane,
            return -1 if the bbox is completely below the plane.
*/
Plane.prototype.intersectBoundingBox = function( bbox )
{
	var upperBBCorner = (this.normal[0]>=0.0?1:0) |
                             (this.normal[1]>=0.0?2:0) |
                             (this.normal[2]>=0.0?4:0);
							 
	var lowerBBCorner = (~upperBBCorner)&7;

	// if lowest point above plane than all above.
	if ( this.distance(bbox.getCorner(lowerBBCorner)) > 0.0) return 1;

	// if highest point is below plane then all below.
	if ( this.distance(bbox.getCorner(upperBBCorner)) < 0.0) return -1;

	// d_lower<=0.0f && d_upper>=0.0f
	// therefore must be crossing plane.
	return 0;
}

/**************************************************************************************************************/

/** @constructor
	Frustum constructor
 */
var Frustum = function()
{
	// The frustum does not contains near and far plane, because near and far are computed during rendering.
	// Some tests have been done with a near plane but are not really useful
	this.planes = [ new Plane(), new Plane(), new Plane(), new Plane(), new Plane() ];
	//this.planes = [ new Plane(), new Plane(), new Plane(), new Plane() ];
}

/**************************************************************************************************************/

/**
	Compute the frustum from the given projection matrix
 */
Frustum.prototype.compute = function(projectionMatrix)
{
	var inverseProjectionMatrix = mat4.create();
	mat4.inverse( projectionMatrix, inverseProjectionMatrix )
	
	var bottomleft = mat4.project( inverseProjectionMatrix, [-1.0,-1.0,-1.0,1.0] );
	var topleft = mat4.project( inverseProjectionMatrix, [-1.0,1.0,-1.0,1.0] );
	var topright = mat4.project( inverseProjectionMatrix, [1.0,1.0,-1.0,1.0] );
	var bottomright = mat4.project( inverseProjectionMatrix, [1.0,-1.0,-1.0,1.0] );
	
	this.planes[0].init( [0.0,0.0,0.0], bottomleft, topleft );
	this.planes[1].init( [0.0,0.0,0.0], topleft, topright );
	this.planes[2].init( [0.0,0.0,0.0], topright, bottomright );
	this.planes[3].init( [0.0,0.0,0.0], bottomright, bottomleft );
	
	// A plane for near plane if needed
	this.planes[4].init( bottomleft, topleft, topright );
}

/**************************************************************************************************************/

/**
	Transform the frustum with the given matrix
 */
Frustum.prototype.transform = function(frustum,matrix)
{
	var mat = mat4.create();
	mat4.inverse(matrix,mat);
	this.inverseTransform(frustum,mat);
}

/**************************************************************************************************************/

/**
	Inverse transform the frustum with the given matrix
 */
Frustum.prototype.inverseTransform = function(frustum,matrix)
{
	// Optimized implementation
	for ( var i = 0; i < frustum.planes.length; i++ )
	{
		var plane = frustum.planes[i];
		
		var x = plane.normal[0];
		var y = plane.normal[1];
		var z = plane.normal[2];
		var w = plane.d;

		plane = this.planes[i];
		
		plane.normal[0] = matrix[0]*x + matrix[1]*y + matrix[2]*z + matrix[3]*w;
		plane.normal[1] = matrix[4]*x + matrix[5]*y + matrix[6]*z + matrix[7]*w;
		plane.normal[2] = matrix[8]*x + matrix[9]*y + matrix[10]*z + matrix[11]*w;
		plane.d = matrix[12]*x + matrix[13]*y + matrix[14]*z + matrix[15]*w;
	}
}

/**************************************************************************************************************/

/**
	Intersection test between frustum and bounding sphere.
	   return 1 if the bs is completely inside the frustum,
		return 0 if the bs intersects the frustum,
		return -1 if the bs is completely outside the frustum.
 */
Frustum.prototype.containsSphere = function( center, radius )
{
	var flag = 1;
	
	for (var i = 0; i < this.planes.length; i++)
	{
		var pn = this.planes[i].normal;
		
		// Compute distance between center and plane (inline to be more efficient)
		var dist = center[0]*pn[0] + center[1]*pn[1] + center[2]*pn[2] + this.planes[i].d;
		
		if 	(dist <= radius)
		{
			if ( dist < - radius ) 
				return -1;
			else 
				flag = 0;
		}	
	}
	
	return flag;
}

/**************************************************************************************************************/

/**
	Test if the frustum contains the given bounding box
 */
Frustum.prototype.containsBoundingBox = function( bbox )
{
	// Optimized implementation
	for (var i = 0; i < this.planes.length; i++)
	{
		var plane = this.planes[i];
		
		// Get the closest point on the bbox
		var bbx = plane.normal[0]>=0.0 ? bbox.max[0] : bbox.min[0];
		var bby = plane.normal[1]>=0.0 ? bbox.max[1] : bbox.min[1];
		var bbz = plane.normal[2]>=0.0 ? bbox.max[2] : bbox.min[2];
		
		// Compute the distance
		var distance = bbx * plane.normal[0] + bby * plane.normal[1] + bbz * plane.normal[2] +  plane.d

		// if highest point is below plane then all below.
		if ( distance < 0.0) return false;
	}
	
/*	for (var i = 0; i < 4; i++)
	{
		if ( this.planes[i].intersectBoundingBox( bbox ) < 0 )
		{
			return false;
		}
	}*/
	
	return true;
}

/**************************************************************************************************************/

// Export plane
Frustum.Plane = Plane;

return Frustum;

});
