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

define(['./LODNode'], function(LODNode) {
 
/**************************************************************************************************************/

/**
 *	Parse a LOD node in the LODTree parser
 */
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

/**************************************************************************************************************/

/**
 *	Parse a LODTree
 */
var parseLODTree = function(doc)
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

/**************************************************************************************************************/

var loadLODTree = function( path, callback )
{
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function(e)
	{
		if ( xhr.readyState == 4 && xhr.status == 200)
		{
			var node = parseLODTree( xhr.responseXML );
							
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

return loadLODTree;

});
