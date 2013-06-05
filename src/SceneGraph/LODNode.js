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

define(['./ColladaParser','../BoundingBox'], function(ColladaParser,BoundingBox) {
 
/**************************************************************************************************************/

/**
 *	@constructor LODNode
 */
var LODNode = function()
{
	this.modelPath = "";
	this.center = null;
	this.radius = 0.0;
	this.minRange = 0.0;
	
	this.geometries = [];
	this.children = [];
	
	this.loaded = false;
	this.loading = false;
	this.imagesToLoad = 0;
	this.childToLoad = 0;
}

/**************************************************************************************************************/

// Function to collect geometries from the COLLADA nodes
var findGeometry = function( geometries, node)
{
	for ( var i = 0; i < node.geometries.length; i++ )
	{
		geometries.push( node.geometries[i] );
	}
	
	for ( var i = 0; i < node.children.length; i++ )
	{
		findGeometry( geometries, node.children[i] );
	}
}

/**
 * The singleton loader
 */
LODNode.Loader = {
	freeRequests : [ new XMLHttpRequest(), new XMLHttpRequest() ],
	nodesToLoad : [],
	numRendered: 0,
	numFrames: 0
};

/**
 * Function called at the end of each frame
 */
LODNode.Loader.postFrame = function() {
	this.nodesToLoad.sort( function(a,b) {
		return b.pixelSize - a.pixelSize;
	});
	for ( var i = 0; i < this.nodesToLoad.length; i++ ) {
		this.load( this.nodesToLoad[i].node, this.nodesToLoad[i].parent );
	}
	this.nodesToLoad.length = 0;
	
	this.numFrames++;
	if ( this.numFrames > 60 )
	{
		console.log('# render ' + this.numRendered );
		this.numFrames = 0;
	}
	this.numRendered = 0;
};

LODNode.Loader.push = function(n,p,s) {

	if ( n.loading || n.loaded )
		return;	
		
	this.nodesToLoad.push({
		node: n,
		parent: p,
		pixelSize: s
	});
};


var onImageLoad = function(node,parent)
{
	node.imagesToLoad--;
	if ( node.imagesToLoad == 0 )
	{
		node.loading = false;
		node.loaded = true;
		if (parent)
		{
			parent.childToLoad--;
		}
	}
};

LODNode.Loader.loadImages = function(node,parent) {
	node.imagesToLoad = node.geometries.length; 
	for ( var i=0; i < node.geometries.length; i++ )
	{
		var image = node.geometries[i].material.texture.image;
		if ( image.complete )
		{
			onImageLoad(node,parent);
		}
		else
		{
			image.onload = function() { 
				onImageLoad(node,parent); 
			};
		}
	}
};

var optimizeGeometries = function( geoms )
{
	for ( var i = 0; i < geoms.length; i++ )
	{
		var mat = geoms[i].material;
		var mesh = geoms[i].mesh; 
		
		var j = i+1;
		while ( j < geoms.length )
		{
			if ( geoms[j].material == mat )
			{
				mesh.vertices = mesh.vertices.concat( geoms[j].mesh.vertices );
				mesh.tcoords = mesh.tcoords.concat( geoms[j].mesh.tcoords );
				geoms.splice(j,1);
			}
			else
			{
				j++;
			}
		}
	}
};

LODNode.Loader.load = function(node,parent) {
		
	if ( node.loading || node.loaded )
		return;		
		
	var self = this;
	var xhr = this.freeRequests.pop();
	if ( xhr )
	{
		xhr.onreadystatechange = function(e)
		{
			if ( xhr.readyState == 4  && xhr.status == 200)
			{
				//console.log("Load " + node.modelPath);
				var root = ColladaParser.parse( xhr.responseXML );
				
				findGeometry( node.geometries, root );
				
				optimizeGeometries( node.geometries );
				
				node.childToLoad = node.children.length;
				
				self.loadImages(node,parent);
				
				/*node.loading = false;
				node.loaded = true;
				node.childToLoad = node.children.length;
				if (parent)
				{
					parent.childToLoad--;
				}*/
/*				var bbox = node.computeBBox();
				console.log("Sphere Center " + node.center[0] + " " + node.center[1] + " " + node.center[2] );
				console.log("BBox Center " + bbox.getCenter()[0] + " " + bbox.getCenter()[1] + " " + bbox.getCenter()[2] );
				node.bbox = bbox;*/
				self.freeRequests.push(xhr);
			}
		};
		
		node.loading = true;
		xhr.open("GET", node.modelPath);
		xhr.send();
	}
};
/**************************************************************************************************************/

/**
 * Compute the BBox of a node
 */
LODNode.prototype.computeBBox = function()
{
	this.bbox = new BoundingBox();
	
	for ( var i = 0; i < this.geometries.length; i++ )
	{
		var bbox = new BoundingBox();
		bbox.compute( this.geometries[i].mesh.vertices );
		this.bbox.merge(bbox);
	}
	
	for ( var i = 0; i < this.children.length; i++ )
	{
		this.bbox.merge( this.children[i].computeBBox() );
	}
	
	if (this.matrix)
		this.bbox.transform(this.matrix);
	
	return this.bbox;
}

/**************************************************************************************************************/

/**
 *	Intersect a node with a ray
 */
LODNode.prototype.intersectWith = function(ray,intersects)
{
	return ray.lodNodeIntersect(this,intersects);
}

/**************************************************************************************************************/

/**
 *	Recursive method to render node
 */
LODNode.prototype.render = function(renderer)
{	
	if ( renderer.renderContext.worldFrustum.containsSphere( this.center, this.radius ) < 0 )
	{
		return;
	}

	if (!this.loaded)
	{
		LODNode.Loader.load(this);
	}
	else
	{
		var pixelSizeVector = renderer.renderContext.pixelSizeVector;
		var pixelSize = 0.25 * Math.abs( this.radius / ( this.center[0] * pixelSizeVector[0] + this.center[1] * pixelSizeVector[1]
							+ this.center[2] * pixelSizeVector[2] + pixelSizeVector[3] ) );
		
		if ( pixelSize > this.minRange && this.children.length != 0  )
		{
			if ( this.childToLoad > 0 )
			{
				for (var i=0; i < this.children.length; i++)
				{
					LODNode.Loader.push(this.children[i],this,pixelSize);
				}
			}
			else
			{
				for (var i=0; i < this.children.length; i++)
				{
					renderer.renderNode( this.children[i] );
				}
			}
		}
		
		if ( pixelSize < this.minRange || this.childToLoad > 0 || this.children.length == 0 )
		{
			var rc = renderer.renderContext;
			var gl = rc.gl;
			
			gl.uniformMatrix4fv( renderer.program.uniforms["modelViewMatrix"], false, renderer.matrixStack[ renderer.matrixStack.length-1 ] );
			
			for (var i=0; i < this.geometries.length; i++)
			{
				var geom = this.geometries[i];
				geom.material.bind(gl,renderer.program);			
				geom.mesh.render(gl,renderer.program);
			}
			
			LODNode.Loader.numRendered++;
		}
	}
}

var parseLODNode = function(elt, baseURI)
{
	var node = new LODNode();
	
	var child = elt.firstElementChild;
	while ( child )
	{
		switch ( child.nodeName )
		{
		case "ModelPath":
			node.modelPath = baseURI + child.textContent;
			break;
		case "Center":
			node.center = [ parseFloat(child.getAttribute('x')), parseFloat(child.getAttribute('y')), parseFloat(child.getAttribute('z')) ];
			break;
		case "Radius":
			node.radius = parseFloat( child.textContent );
			break;
		case "MinRange":
			node.minRange = parseFloat( child.textContent );
			break;
		case "Node":
			node.children.push( parseLODNode( child, baseURI ) );
			break;
		}
		child = child.nextElementSibling;
	}
	
	return node;
};

var parseLOD = function(doc)
{
	var rootElement = doc.documentElement;
	var baseURI = doc.documentURI.substr( 0, doc.documentURI.lastIndexOf('/') + 1 );
	
	// First parse tile
	var node = rootElement.getElementsByTagName('Node');
	if ( node )
	{
		return parseLODNode( node[0], baseURI  );
	}
	
	return null;
};

LODNode.load = function( path, callback )
{
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function(e)
	{
		if ( xhr.readyState == 4 && xhr.status == 200)
		{
			var node = parseLOD( xhr.responseXML );
							
			if ( callback )
			{
				callback( node );
			}
		}
	};
	
	xhr.open("GET", path);
	xhr.send();
};

/**************************************************************************************************************/

return LODNode;

});
