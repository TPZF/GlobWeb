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

 define(['./BoundingBox','./glMatrix'], 
	function(BoundingBox) {

/**************************************************************************************************************/

/** @constructor
	Tile constructor
 */
var Tile = function()
{
	// Parent/child relationship
	this.parent = null;
	this.parentIndex = -1;
	this.children = null;
	
	// Graphics data to render the tile
	this.vertices = null;
	this.texture = null;
	this.vertexBuffer = null;
	this.texTransform = [1., 1., 0., 0.];
	
	// Tile spatial data
	this.matrix = null;
	this.inverseMatrix = null;
	this.bbox = new BoundingBox();
	
	// For culling
	this.radius = 0.0;	
	this.distance = 0.0;
	this.closestPointToEye = [ 0.0, 0.0, 0.0 ];
	
	// Specific object to store extension from renderers
	this.extension = {};
	
	// For debug
	//this.color = [ Math.random(), Math.random(), Math.random() ];
	
	this.state = Tile.State.NONE;
	
	// Tile configuration given by tile manager : contains if the tile uses skirt, the tesselation, etc...
	this.config = null;
	this.imageSize = 256;
}

/**************************************************************************************************************/

/**
 *	Tile state enumerations
 */
Tile.State = 
{
	ERROR : -10,
	NONE : 0,
	REQUESTED : 1,
	LOADING : 2,
	LOADED : 3
};


/**************************************************************************************************************/

/**
 * Compute position on the tile using normalized coordinate between [0,size-1]
 */
Tile.prototype.computePosition = function(u,v)
{
	var size = this.config.tesselation;
	u = Math.min( size-1, Math.max( 0, u ) );
	v = Math.min( size-1, Math.max( 0, v ) );
	
	var vFloor = Math.floor( v );
	var vFrac = v - vFloor;
	var uFloor = Math.floor( u );
	var uFrac = u - uFloor;
	var vertexSize = this.config.vertexSize;
	var vertexOffset = vertexSize*( vFloor*size + uFloor );
	var vec = [ 0.0, 0.0, 0.0 ];
	for ( var i=0; i < 3; i++)
	{
		vec[i] = (1.0 - vFrac) * (1.0 - uFrac) * this.vertices[ vertexOffset + i ]
		+ vFrac * (1.0 - uFrac) * this.vertices[ vertexOffset + vertexSize*size + i ]
		+ vFrac * uFrac * this.vertices[ vertexOffset + vertexSize*size + vertexSize + i ]
		+ (1.0 - vFrac) * uFrac * this.vertices[ vertexOffset + vertexSize + i ];
	}
	
	return vec;
}


/**************************************************************************************************************/

/**
 *	Initialize the tile from its parent
 */
Tile.prototype.initFromParent = function(parent,i,j)
{
	this.parent = parent;
	this.parentIndex = j*2 + i;
	this.matrix  = parent.matrix;
	this.inverseMatrix  = parent.inverseMatrix;
	this.texture = parent.texture;
	this.config = parent.config;
	
	this.vertexBuffer = parent.vertexBuffer;
	
	// Recompute the bounding box
	// Very fast and coarse version but it does not work with HEALPix tiling
	//var w = 0.5 * (parent.bbox.max[0] - parent.bbox.min[0]);
	//var h = -0.5 * (parent.bbox.max[1] - parent.bbox.min[1]);
	//var min = [  parent.bbox.min[0] + i * w, parent.bbox.max[1] + (j+1) * h, parent.bbox.min[2] ];
	//var max = [  parent.bbox.min[0] + (i+1) * w, parent.bbox.max[1] + j * h, parent.bbox.max[2] ];
	
	var size = this.config.tesselation;
	var halfTesselation = (size-1)/2;
	for (var n = 0; n <= halfTesselation; n++)
	{
		var offset = this.config.vertexSize * ( (n+j*halfTesselation)*size + i*halfTesselation );
		for (var k = 0; k <= halfTesselation; k++)
		{
			this.bbox.extend( parent.vertices[offset], parent.vertices[offset+1], parent.vertices[offset+2] );
			offset += this.config.vertexSize;
		}
	}
	
	// Compute the bounding box
	this.radius = this.bbox.getRadius();
	
	// Init extension
	for ( var x in parent.extension ) 
	{
		var e = parent.extension[x];
		if ( e.initChild )
		{
			e.initChild(this,i,j);
		}
	}

}

/**************************************************************************************************************/

/**
 *	Test if the tile needs to be refined
 */
Tile.prototype.needsToBeRefined = function(renderContext)
{
	if ( this.distance < this.radius )
		return true;

	// Approximate the radius of one texel : the radius of the tile divided by the image size
	// The radius is taken as the average of the bbox width and length, rather than the actual radius because at the pole, there is a large difference betwen width and length
	// and the radius (ie maximum width/length) is too pessimistic
	var radius = 0.25 * ( (this.bbox.max[0] - this.bbox.min[0]) + (this.bbox.max[1] - this.bbox.min[1]) )  / this.imageSize; 
	
	// Transform the closest point from the eye in world coordinates
	var mat = this.matrix;
	var c = this.closestPointToEye;
	var px = mat[0]*c[0] + mat[4]*c[1] + mat[8]*c[2] + mat[12];
	var py = mat[1]*c[0] + mat[5]*c[1] + mat[9]*c[2] + mat[13];
	var pz = mat[2]*c[0] + mat[6]*c[1] + mat[10]*c[2] + mat[14];
	
	// Compute the pixel size of the radius texel
	var pixelSizeVector = renderContext.pixelSizeVector;
	var pixelSize = radius / ( px * pixelSizeVector[0] + py * pixelSizeVector[1]
						+ pz * pixelSizeVector[2] + pixelSizeVector[3] );
	
	// Check if pixel radius of a texel is superior to the treshold
	// The pixel size can be negative when the closest point is close to the near plane, so take absolute value
	return Math.abs(pixelSize) > renderContext.tileErrorTreshold;
}

/**************************************************************************************************************/

/**
 *	Test if the tile is culled given the current view parameters
 */
Tile.prototype.isCulled = function(renderContext)
{	
	// Compute the eye in tile local space
	var mat = this.inverseMatrix;
	var c = renderContext.eyePosition;
	var ex = mat[0]*c[0] + mat[4]*c[1] + mat[8]*c[2] + mat[12];
	var ey = mat[1]*c[0] + mat[5]*c[1] + mat[9]*c[2] + mat[13];
	var ez = mat[2]*c[0] + mat[6]*c[1] + mat[10]*c[2] + mat[14];
			
	// If the eye is in the radius of the tile, consider the tile is not culled
	this.distance = Math.sqrt( ex * ex + ey * ey + ez * ez );
	if ( this.distance < this.radius )
	{
		this.distance = 0.0;
		return false;
	}
	else
	{
		var pt = this.closestPointToEye;
		
		// Compute closest point to eye with the bbox of the tile
		pt[0] = Math.min( Math.max( ex, this.bbox.min[0] ), this.bbox.max[0] );
		pt[1] = Math.min( Math.max( ey, this.bbox.min[1] ), this.bbox.max[1] );
		pt[2] = Math.min( Math.max( ez, this.bbox.min[2] ), this.bbox.max[2] );
		
		// Compute horizontal culling only if the eye is "behind" the tile
		// and the coordinate system is not a plane(no need to compute horizon culling on plane)
		if ( ez < 0.0 && !this.config.coordinateSystem.isFlat )
		{
			// Compute vertical at the closest point. The earth center is [0, 0, -radius] in tile local space.
			var vx = pt[0];
			var vy = pt[1];
			var vz = pt[2] + this.config.coordinateSystem.radius;
			var vl = Math.sqrt( vx * vx + vy * vy + vz * vz );
			vx /= vl; vy /= vl; vz /= vl;
			
			// Compute eye direction at the closest point (clampled on earth to avoid problem with mountains)
			// The position clamp to earth is Vertical * Radius + EarthCenter. The EarthCenter being 0,0,-radius a lot of simplification is done.
			var edx = ex - vx * this.config.coordinateSystem.radius;
			var edy = ey - vy * this.config.coordinateSystem.radius;
			var edz = ez - (vz - 1.0) * this.config.coordinateSystem.radius;
			
			// Compute dot product between eye direction and the vertical at the point
			var el = Math.sqrt( edx * edx + edy * edy  + edz * edz );
			var eDv = (edx * vx + edy * vy  + edz * vz) / el;
						
			eDv *= this.config.cullSign;
			
			if ( eDv < -0.05 )
			{
				return true;
			}
		}
		
		// Compute local frustum
		var localFrustum = renderContext.localFrustum;
		localFrustum.inverseTransform( renderContext.worldFrustum, this.matrix );
		
		// Check if the tile is inside the frustum
		return !localFrustum.containsBoundingBox(this.bbox);
	}
}

/**************************************************************************************************************/

/**
 *	Dispose the tile
 */
Tile.prototype.dispose = function(renderContext,tilePool)
{		
	// Dispose extension even if tile isn't loaded because it can be culled
	for ( var x in this.extension )
	{
		if ( this.extension[x].dispose )
			this.extension[x].dispose(renderContext,tilePool);
	}

	if ( this.state == Tile.State.LOADED  )
	{
		tilePool.disposeGLBuffer(this.vertexBuffer);
		if (this.texture) tilePool.disposeGLTexture(this.texture);
		
		this.vertexBuffer = null;
		this.texture = null;
		this.parent = null;
		
		this.state = Tile.State.NONE;
	}
}

/**************************************************************************************************************/

/**
 *	Delete the children
 */
Tile.prototype.deleteChildren = function(renderContext,tilePool)
{
	if ( this.children )
	{
		for (var i = 0; i < 4; i++)
		{
			// Recursively delete its children
			this.children[i].deleteChildren(renderContext,tilePool);
			// Dispose its ressources (WebGL)
			this.children[i].dispose(renderContext,tilePool);
		}
		
		// Cleanup the tile
		this.children = null;
	}
}

/**************************************************************************************************************/

/**
 *	Build skirt vertices
 */
Tile.prototype.buildSkirtVertices = function(center,srcOffset,srcStep,dstOffset)
{
	var vertices = this.vertices;
	var skirtHeight = this.radius * 0.05;
	
	var size = this.config.tesselation;
	for ( var i = 0; i < size; i++)
	{
/*		//Not optimized version of skirt computation
		var srcPos = [ vertices[srcOffset], vertices[srcOffset+1], vertices[srcOffset+2] ];
		var dir = vec3.subtract( srcPos, center, vec3.create() );
		vec3.normalize(dir);
		vec3.scale( dir, skirtHeight );
		vec3.subtract( srcPos, dir );*/
		
		// Optimized version of skirt computation
		var x = vertices[srcOffset] - center[0];
		var y = vertices[srcOffset+1] - center[1];
		var z = vertices[srcOffset+2] - center[2];
		var scale = skirtHeight / Math.sqrt( x*x + y*y + z*z );
		x *= scale;
		y *= scale;
		z *= scale;
		
		vertices[ dstOffset ] = vertices[srcOffset] - x;
		vertices[ dstOffset+1 ] = vertices[srcOffset+1] - y;
		vertices[ dstOffset+2 ] = vertices[srcOffset+2] - z;
		
		for (var n = 3; n < this.config.vertexSize; n++)
		{
			vertices[ dstOffset+n ] = vertices[srcOffset+n];
		}
		
		dstOffset += this.config.vertexSize;
		srcOffset += srcStep;
	}	
}

/**************************************************************************************************************/

/**
 *	Generate normals for a tile
 */
Tile.prototype.generateNormals = function()
{	
	var size = this.config.tesselation;
	var vertexSize = this.config.vertexSize;
	var lineSize = vertexSize*size;
	
	var vo = 0;
	for ( var j=0; j < size; j++ )
	{
		var vp1 = j == size-1 ? 0 : lineSize;
		var vm1 = j == 0 ? 0 : -lineSize;
		for ( var i=0; i < size; i++ )
		{
			var up1 = i == size-1 ? 0 : vertexSize;
			var um1 = i == 0 ? 0 : -vertexSize;
			var u = [
				this.vertices[vo+up1] - this.vertices[vo+um1],
				this.vertices[vo+up1+1] - this.vertices[vo+um1+1],
				this.vertices[vo+up1+2] - this.vertices[vo+um1+2],
			];
			var v = [
				this.vertices[vo+vp1] - this.vertices[vo+vm1],
				this.vertices[vo+vp1+1] - this.vertices[vo+vm1+1],
				this.vertices[vo+vp1+2] - this.vertices[vo+vm1+2],
			];
			
			var normal = vec3.cross( u, v, [] );
			vec3.normalize(normal);
			this.vertices[vo+3] = normal[0];
			this.vertices[vo+4] = normal[1];
			this.vertices[vo+5] = normal[2];
			
			vo += vertexSize;
		}
	}
}

/**************************************************************************************************************/

/**
 *	Generate the tile
 */
Tile.prototype.generate = function(tilePool,image,elevations)
{
	// Generate the vertices
	this.vertices = this.generateVertices(elevations);
		
	// Compute the bounding box
	var size = this.config.tesselation;
	var vertexSize = this.config.vertexSize;
	this.bbox.compute(this.vertices,vertexSize*size*size,vertexSize);
	this.radius = this.bbox.getRadius();
	
	// Compute normals if needed
	if (this.config.normals)
	{
		this.generateNormals();
	}
		
	// Compute skirt from vertices
	if (this.config.skirt)
	{
		// Compute local earth center, used to generate skirts
		var localEarthCenter = [ 0.0, 0.0, 0.0 ];
		mat4.multiplyVec3( this.inverseMatrix, localEarthCenter );
		
		// Skirts
		var dstOffset = vertexSize * (size * size); // TOP
		this.buildSkirtVertices( localEarthCenter, 0, vertexSize, dstOffset );
		dstOffset += vertexSize * size; // BOTTOM
		this.buildSkirtVertices( localEarthCenter, vertexSize * (size * (size-1)), vertexSize, dstOffset );
		dstOffset += vertexSize * size; // LEFT
		this.buildSkirtVertices( localEarthCenter, 0, vertexSize * size, dstOffset );
		dstOffset += vertexSize * size; // RIGHT
		this.buildSkirtVertices( localEarthCenter, vertexSize * (size-1), vertexSize * size, dstOffset );
		
		// These skirts are only used by children tile
		dstOffset += vertexSize * size; // CENTER
		this.buildSkirtVertices( localEarthCenter, vertexSize * ( size * (size-1)/2 ), vertexSize, dstOffset );
		dstOffset += vertexSize * size; // MIDDLE
		this.buildSkirtVertices( localEarthCenter, vertexSize * ( (size-1)/2 ), vertexSize * size, dstOffset );
	}	
	
	// Avoid double creation of vertex buffer for level0Tiles generation
	if (this.vertexBuffer != null && this.parent == null)
	{
		tilePool.disposeGLBuffer(this.vertexBuffer);
	}
	this.vertexBuffer = tilePool.createGLBuffer(this.vertices);

	// Create texture
	if (image)
	{
		this.texture = tilePool.createGLTexture(image);
		this.imageSize = this.config.imageSize;
	}
	
	this.state = Tile.State.LOADED;
}

/**************************************************************************************************************/

return Tile;

});