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

/**************************************************************************************************************/

/** @constructor
	BoundingBox constructor
 */
var BoundingBox = function(min,max)
{
	if (min)
	{
		this.min = vec3.create( min );
	}
	if (max)
	{
		this.max = vec3.create( max );
	}
}

/**************************************************************************************************************/

/**
	Extent the bounding box with the given point
 */
BoundingBox.prototype.extend = function( x, y, z)
{
	if (!this.min)
	{
		this.min = vec3.create();
		this.max = vec3.create();
		
		this.min[0] = x;
		this.min[1] = y;
		this.min[2] = z;
		this.max[0] = x;
		this.max[1] = y;
		this.max[2] = z;
	}
	else
	{
		if ( x < this.min[0] )
		{
			this.min[0] = x;
		}
		if ( y < this.min[1] )
		{
			this.min[1] = y;
		}
		if ( z < this.min[2] )
		{
			this.min[2] = z;
		}
		if ( x > this.max[0] )
		{
			this.max[0] = x;
		}
		if ( y > this.max[1] )
		{
			this.max[1] = y;
		}
		if ( z > this.max[2] )
		{
			this.max[2] = z;
		}
	}
}
/**************************************************************************************************************/

/**
	Compute the bounding box from an array of vertices
 */
BoundingBox.prototype.compute = function(vertices,length,stride)
{
	if (!this.min)
	{
		this.min = vec3.create();
		this.max = vec3.create();
	}
	
	this.min[0] = vertices[0];
	this.min[1] = vertices[1];
	this.min[2] = vertices[2];
	this.max[0] = vertices[0];
	this.max[1] = vertices[1];
	this.max[2] = vertices[2];
	
	var st = stride || 3;
	var ll = length || vertices.length;
	
	for (var i=st; i < ll; i += st)
	{
		for (var j=0; j < 3; j++)
		{
			if ( vertices[i+j] < this.min[j] )
			{
				this.min[j] = vertices[i+j];
			}
			if ( vertices[i+j] > this.max[j] )
			{
				this.max[j] = vertices[i+j];
			}
		}
	}
}

/**************************************************************************************************************/

/**
	Get the corner of a bounding box
 */
BoundingBox.prototype.getCorner = function(pos)
{
	return [ pos&1 ? this.max[0] : this.min[0],
			pos&2 ? this.max[1] : this.min[1],
			pos&4 ? this.max[2] : this.min[2]	];
}

/**************************************************************************************************************/

/**
	Get the center of a bounding box
 */
BoundingBox.prototype.getCenter = function()
{
	return [ (this.max[0] + this.min[0]) * 0.5,
			(this.max[1] + this.min[1]) * 0.5,
			(this.max[2] + this.min[2]) * 0.5	];
}

/**************************************************************************************************************/

/**
	Get the radius of a bounding box
 */
BoundingBox.prototype.getRadius = function()
{
	var vec = vec3.create();
	vec3.subtract( this.max, this.min, vec)
	return 0.5 * vec3.length(vec);
}

/**************************************************************************************************************/

return BoundingBox;

});
