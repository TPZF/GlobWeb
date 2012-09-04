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

/**************************************************************************************************************/

var Numeric = {};

/**************************************************************************************************************/

/*
  Linear interpolation between [a, b], t must be [0, 1]
*/
Numeric.lerp = function(t, a, b)
{
    return a + ((b - a) * t);
}

/**************************************************************************************************************/

/*
 Cubic interpolation between [a, b], t must be [0, 1]
*/
Numeric.cubicInterpolation = function(t, startPos, startVel, endPos, endVel)
{
	var t2 = t * t;
	var t3 = t2 * t; 
	
	// Evaluate the position
	
	var M00 = 2 * startPos[0] - 2 * endPos[0] + startVel[0] + endVel[0];
	var M10 = 2 * startPos[1] - 2 * endPos[1] + startVel[1] + endVel[1];
	var M20 = 2 * startPos[2] - 2 * endPos[2] + startVel[2] + endVel[2];

	var M01 = -3 * startPos[0] + 3 * endPos[0] - 2 * startVel[0] - endVel[0];
	var M11 = -3 * startPos[1] + 3 * endPos[1] - 2 * startVel[1] - endVel[1];
	var M21 = -3 * startPos[2] + 3 * endPos[2] - 2 * startVel[2] - endVel[2];
	
	var position = vec3.create();
	position[0] = M00 * t3 + M01 * t2 + startVel[0] * t + startPos[0];
	position[1] = M10 * t3 + M11 * t2 + startVel[1] * t + startPos[1];
	position[2] = M20 * t3 + M21 * t2 + startVel[2] * t + startPos[2];
	
	return position;
}

/**************************************************************************************************************/

/*
 Cubic interpolation between [a, b], t must be [0, 1]
*/
Numeric.cubicInterpolationDerivative = function(t, startPos, startVel, endPos, endVel)
{
	var t2 = t * t;
	
	// Evaluates the direction

	var M01 = 6 * startPos[0] - 6 * endPos[0] + 3 * startVel[0] + 3 * endVel[0];
	var M11 = 6 * startPos[1] - 6 * endPos[1] + 3 * startVel[1] + 3 * endVel[1];
	var M21 = 6 * startPos[2] - 6 * endPos[2] + 3 * startVel[2] + 3 * endVel[2];

	var M02 = -6 * startPos[0] + 6 * endPos[0] - 4 * startVel[0] - 2 * endVel[0];
	var M12 = -6 * startPos[1] + 6 * endPos[1] - 4 * startVel[1] - 2 * endVel[1];
	var M22 = -6 * startPos[2] + 6 * endPos[2] - 4 * startVel[2] - 2 * endVel[2];

	var direction = vec3.create();
	direction[0] = M01 * t2 + M02 * t + startVel[0];
	direction[1] = M11 * t2 + M12 * t + startVel[1];
	direction[2] = M21 * t2 + M22 * t + startVel[2];
	
	return direction;
}

/**************************************************************************************************************/

/*
  Map x between [xMin, xMax] to [0, 1]
*/
Numeric.map01 = function(x, xMin, xMax)
{
    return (xMin != xMax) ? (x - xMin) / (xMax - xMin) : 0;
}

/**************************************************************************************************************/

/*
  Map x between [xMin, xMax] to [outMin, outMax]
*/
Numeric.mapLinear = function(x, xMin, xMax, outMin, outMax)
{
    return Numeric.lerp(Numeric.map01(x, xMin, xMax), outMin, outMax);
}

/**************************************************************************************************************/

Numeric.easeInQuad = function(t)
{
    return t*t;
}

/**************************************************************************************************************/

Numeric.easeOutQuad = function(t)
{
    // use 1-(t^2) with input [-1, 0]
    var v = t - 1; // map [0 1] to [-1 0]
    return 1.0-(v*v);
}

/**************************************************************************************************************/

/*
  Remap input t ([0, 1]) to a curve starting slowly
  and accelerating till 0.5 an decelerating till 1
*/
Numeric.easeInOutQuad = function(t)
{
    var out = t;
    if (out < 0.5)
    {
        // use (0.5*t^2) with input [0, 1]
        out = out+out; // map [0 0.5] outo [0 1]
        out = 0.5*(out*out);
    }
    else
    {
        // use (0.5*(1-t)^2) with input [-1, 0]
        out = (out+out) - 2.0; // map [0.5 1] to [-1 0]
        out = 0.5*(1.0-(out*out));
        out = 0.5 + out;
    }
    return out;
}

/**************************************************************************************************************/

/*
 */
Numeric.easeOutInQuad = function(t)
{
    var out = t;
    if (out < 0.5)
    {
        // use (0.5*(1-t)^2) with input [-1, 0]
        out = (out+out) - 1.0; // map [0 0.5] to [-1 0]
        out = 0.5*(1.0-(out*out));
    }
    else
    {
        // use (0.5*t^2) with input [0, 1]
        out = (out+out) - 1.0; // map [0.5 1] outo [0 1]
        out = 0.5*(out*out);
        out = 0.5 + out;
    }
    return out;
}

/**************************************************************************************************************/

/*
  Convert the given degree value in radian
*/
Numeric.toRadian = function(degree)
{
    return degree * Math.PI / 180.0;
}

/**************************************************************************************************************/

/*
  Convert the given radian value in degree
*/
Numeric.toDegree = function(radian)
{
    return radian * 180.0 / Math.PI;
}

/**************************************************************************************************************/

/*
  Computes point on a ray
*/
Numeric.pointOnRay = function(rayOrigin, rayDirection, t, dest)
{
    if (!dest) { dest = vec3.create(); }

    vec3.scale(rayDirection, t, dest);
    vec3.add(dest, rayOrigin, dest);

    return dest;
}

/**************************************************************************************************************/

/*
  Line-line intersection
  rayDirection must be normalized.
  Returns t at which intersection occurs or -1 if no intersection.
*/

Numeric.lineIntersection = function( x1, y1, x2, y2, x3, y3, x4, y4 )
{
	var det = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
	if ( det == 0 )
	{
		return [-1,-1];
	}
	
	var ua = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
	var ub = (x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3);
	
	ua /= det;
	ub /= det;
	
	return [ ua, ub ];
	//return ua > 0.0 && ua < 1.0 && ub > 0.0 && ub < 1.0;
}

/**************************************************************************************************************/

/*
  Ray sphere intersection
  rayDirection must be normalized.
  Returns t at which intersection occurs or -1 if no intersection.
*/
Numeric.raySphereIntersection = function(rayOrigin, rayDirection, sphereCenter, sphereRadius)
{
    // cf. http://wiki.cgsociety.org/index.php/Ray_Sphere_Intersection

    var rs = vec3.subtract( rayOrigin, sphereCenter, vec3.create() );
    // rayDirection is normalized so a = 1
    // var a = vec3.dot(rayDirection, rayDirection);
    var b = 2.0 * vec3.dot(rayDirection, rs);
    var c = vec3.dot(rs, rs) - sphereRadius*sphereRadius;

    // as a == 1, discriminant = b^2 - (4*c)
    // var discr = (b*b) - (4*a*c);
    var discr = (b*b) - (4*c);
    if (discr < 0)
        return -1;

    // t0 = (-b - sqrt(discr)) / 2a, t1 = (-b + sqrt(discr)) / 2a, a == 1
    discr = Math.sqrt(discr);
    var tNear = (-b - discr) / 2;
    var tFar  = (-b + discr) / 2;
    if (tNear > tFar) // Swap t values
    {
        var tmp = tNear;
        tNear = tFar;
        tFar = tmp;
    }

    if (tFar < 0) // Hit is beyond ray origin
        return -1;
    
    return tNear < 0 ? tFar : tNear;
}

/**************************************************************************************************************/

// Additions and fixes to the glMatrix lib ...

/**************************************************************************************************************/

/*
  Project a vec3
*/
mat4.project = function(mat, vec, dest)
{
 	if(!dest) { dest = vec }
	mat4.multiplyVec4( mat, vec, dest );
	var iw = 1.0 / dest[3];
	dest[0] *= iw;
	dest[1] *= iw;
	dest[2] *= iw;
	return dest;
}

/*
 * mat4.rotateVec3
 * Rotate a vec3 with the given matrix
 *
 * Params:
 * mat - mat4 to transform the vector with
 * vec - vec3 to transform
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
mat4.rotateVec3 = function(mat, vec, dest) {
	if(!dest) { dest = vec }
	
	var x = vec[0], y = vec[1], z = vec[2];
	
	dest[0] = mat[0]*x + mat[4]*y + mat[8]*z;
	dest[1] = mat[1]*x + mat[5]*y + mat[9]*z;
	dest[2] = mat[2]*x + mat[6]*y + mat[10]*z;
	
	return dest;
};

/**************************************************************************************************************/

/*
  Update a matrix with the given position, attitude parameters
*/
mat4.fromPositionAttitude = function(position, attitude, dest)
{
    if (!dest) { dest = mat4.create(); }

    // This sets the translation part to 0
    quat4.trueToMat4(attitude, dest);
    // Update translation
    dest[12] = position[0];
    dest[13] = position[1];
    dest[14] = position[2];

    return dest;
}

/**************************************************************************************************************/

/*
  Create a rotation quaternion from the given rotation matrix
*/
mat3.toQuat4 = function(mat, dest)
{
    if (!dest) { dest = quat4.create(); }

    var trace = mat[0] + mat[4] + mat[8];
    if (trace > 0) { 
        var S = Math.sqrt(trace + 1.0) * 2; // S=4*qw 
        dest[3] = 0.25 * S;
        dest[0] = (mat[5] - mat[7]) / S;
        dest[1] = (mat[6] - mat[2]) / S;
        dest[2] = (mat[1] - mat[3]) / S;
    } else if ((mat[0] > mat[4]) && (mat[0] > mat[8])) { 
        var S = Math.sqrt(1.0 + mat[0] - mat[4] - mat[8]) * 2; // S=4*qx 
        dest[3] = (mat[5] - mat[7]) / S;
        dest[0] = 0.25 * S;
        dest[1] = (mat[3] + mat[1]) / S; 
        dest[2] = (mat[6] + mat[2]) / S; 
    } else if (mat[4] > mat[8]) { 
        var S = Math.sqrt(1.0 + mat[4] - mat[0] - mat[8]) * 2; // S=4*qy
        dest[3] = (mat[6] - mat[2]) / S;
        dest[0] = (mat[3] + mat[1]) / S; 
        dest[1] = 0.25 * S;
        dest[2] = (mat[7] + mat[5]) / S; 
    } else { 
        var S = Math.sqrt(1.0 + mat[8] - mat[0] - mat[4]) * 2; // S=4*qz
        dest[3] = (mat[1] - mat[3]) / S;
        dest[0] = (mat[6] + mat[2]) / S;
        dest[1] = (mat[7] + mat[5]) / S;
        dest[2] = 0.25 * S;
    }

    return dest;
}

/**************************************************************************************************************/

/*
  Create a rotation quaternion from the upper 3x3 elements of the given matrix
*/
mat4.toQuat4 = function(mat, dest)
{
    if (!dest) { dest = quat4.create(); }

    var trace = mat[0] + mat[5] + mat[10];
    if (trace > 0) { 
        var S = Math.sqrt(trace + 1.0) * 2; // S=4*qw 
        dest[3] = 0.25 * S;
        dest[0] = (mat[6] - mat[9]) / S;
        dest[1] = (mat[8] - mat[2]) / S;
        dest[2] = (mat[1] - mat[4]) / S;
    } else if ((mat[0] > mat[5]) && (mat[0] > mat[10])) { 
        var S = Math.sqrt(1.0 + mat[0] - mat[5] - mat[10]) * 2; // S=4*qx 
        dest[3] = (mat[6] - mat[9]) / S;
        dest[0] = 0.25 * S;
        dest[1] = (mat[4] + mat[1]) / S; 
        dest[2] = (mat[8] + mat[2]) / S; 
    } else if (mat[5] > mat[10]) { 
        var S = Math.sqrt(1.0 + mat[5] - mat[0] - mat[10]) * 2; // S=4*qy
        dest[3] = (mat[8] - mat[2]) / S;
        dest[0] = (mat[4] + mat[1]) / S; 
        dest[1] = 0.25 * S;
        dest[2] = (mat[9] + mat[6]) / S; 
    } else { 
        var S = Math.sqrt(1.0 + mat[10] - mat[0] - mat[5]) * 2; // S=4*qz
        dest[3] = (mat[1] - mat[4]) / S;
        dest[0] = (mat[8] + mat[2]) / S;
        dest[1] = (mat[9] + mat[6]) / S;
        dest[2] = 0.25 * S;
    }

    return dest;
}

/**************************************************************************************************************/

/*
  Fixed quaternion to rotation matrix function
*/
quat4.trueToMat4 = function(quat, dest) {
        if(!dest) { dest = mat4.create(); }
        
        var x = quat[0], y = quat[1], z = quat[2], w = quat[3];

        var x2 = x + x;
        var y2 = y + y;
        var z2 = z + z;

        var xx = x*x2;
        var xy = x*y2;
        var xz = x*z2;

        var yy = y*y2;
        var yz = y*z2;
        var zz = z*z2;

        var wx = w*x2;
        var wy = w*y2;
        var wz = w*z2;

        dest[0] = 1 - (yy + zz);
        dest[1] = xy + wz;
        dest[2] = xz - wy;
        dest[3] = 0;

        dest[4] = xy - wz;
        dest[5] = 1 - (xx + zz);
        dest[6] = yz + wx;
        dest[7] = 0;

        dest[8] = xz + wy;
        dest[9] = yz - wx;
        dest[10] = 1 - (xx + yy);
        dest[11] = 0;

        dest[12] = 0;
        dest[13] = 0;
        dest[14] = 0;
        dest[15] = 1;
        
        return dest;
}

/**************************************************************************************************************/

/*
  Fixed quaternion to rotation matrix function
*/
quat4.trueToMat3 = function(quat, dest) {
        if(!dest) { dest = mat3.create(); }
        
        var x = quat[0], y = quat[1], z = quat[2], w = quat[3];

        var x2 = x + x;
        var y2 = y + y;
        var z2 = z + z;

        var xx = x*x2;
        var xy = x*y2;
        var xz = x*z2;

        var yy = y*y2;
        var yz = y*z2;
        var zz = z*z2;

        var wx = w*x2;
        var wy = w*y2;
        var wz = w*z2;

        dest[0] = 1 - (yy + zz);
        dest[1] = xy + wz;
        dest[2] = xz - wy;

        dest[3] = xy - wz;
        dest[4] = 1 - (xx + zz);
        dest[5] = yz + wx;

        dest[6] = xz + wy;
        dest[7] = yz - wx;
        dest[8] = 1 - (xx + yy);
        
        return dest;
}

/**************************************************************************************************************/

/*
  Fixed slerp quaternion function (taken from Ogre3D sources)
*/
quat4.trueSlerp = function(q1, q2, t, dest)
{
    var cosAngle = q1[0]*q2[0] + q1[1]*q2[1] + q1[2]*q2[2] + q1[3]*q2[3];
    if (!dest) { dest = quat4.create(); }

    // Do we need to invert rotation to use the shortest path ?
    if (cosAngle < 0.0)
    {
        cosAngle = -cosAngle;
        dest[0] = -q2[0];
        dest[1] = -q2[1];
        dest[2] = -q2[2];
        dest[3] = -q2[3];
    }
    else
    {
        dest[0] = q2[0];
        dest[1] = q2[1];
        dest[2] = q2[2];
        dest[3] = q2[3];
    }

    if (Math.abs(cosAngle) < (1 - 0.0001)) // epsilon
    {
        // Standard case (slerp)
        var sinAngle = Math.sqrt(1 - cosAngle*cosAngle);
        var angle = Math.atan2(sinAngle, cosAngle);
        var c0 = Math.sin((1 - t) * angle) / sinAngle;
        var c1 = Math.sin(t * angle) / sinAngle;

        dest[0] = q1[0]*c0 + c1*dest[0];
        dest[1] = q1[1]*c0 + c1*dest[1];
        dest[2] = q1[2]*c0 + c1*dest[2];
        dest[3] = q1[3]*c0 + c1*dest[3];
    }
    else
    {
        // There are two situations:
        // 1. "q1" and "q2" are very close (cosAngle ~= +1), so we can do a linear
        //    interpolation safely.
        // 2. "q1" and "q2" are almost inverse of each other (cosAngle ~= -1), there
        //    are an infinite number of possibilities interpolation. but we haven't
        //    have method to fix this case, so just use linear interpolation here.
        dest[0] = Numeric.lerp(t, q1[0], q2[0]);
        dest[1] = Numeric.lerp(t, q1[1], q2[1]);
        dest[2] = Numeric.lerp(t, q1[2], q2[2]);
        dest[3] = Numeric.lerp(t, q1[3], q2[3]);
        // taking the complement requires renormalisation
        quat4.normalize(dest);
    }    

    return dest;
}
