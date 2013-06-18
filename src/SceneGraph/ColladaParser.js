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

 define( ['./SceneGraph'], function(SceneGraph) {

/**
 * The scene graph built by the parser
 */
var root = null;

/**
 * The material map
 * Build when parsing library_materials
 */
var materials = {};

/**
 * The geometry map
 * Build when parsing library_geometries
 */
var geometries = {};

/**
 * The node map
 * Build when parsing library_nodes
 */
var nodes = {};

/**
 * The root element of the currently parsed document
 */
var rootElement = null;

/**
 * The baseURI of the document, ie the documentURI without the filename
 * Used to locate images, relative to documentURI
 */
var baseURI = null;

/**
 * Helper method to find an element by its URL
 */
var findElementByUrl = function(root,tag,url)
{
	var selector = tag + "[id='" + url.substring(1) + "']";
	if ( root )
		return root.querySelector(selector);
	else
		return doc.querySelector(selector);
}

/**
 * Helper method to find an element by its tag
 */
var findElementByTag = function(root,tag)
{
	var elements = root.getElementsByTagName(tag);
	return elements && elements.length > 0 ? elements[0] : null;
}

/**
 * Skip asset child
 * A lot of collada elements contains an optionnal asset element, useful to skip it if it exists
 */
var skipAssetChild = function(node)
{
	var child = node.firstElementChild;
	while ( child && child.nodeName == "asset" )
	{
		child = child.nextElementSibling;
	}
	return child;
}

/**
 * Parse the textContent of node that contains an array of float
 */
var parseFloats = function(node)
{
	var array = [];
	var strs = node.textContent.trim().split( /\s+/ );
	for ( var i = 0; i < strs.length; i++ )
	{
		array.push( parseFloat(strs[i]) );
	}
	return array;
}

/**
 * Parse a texture node
 */
var parseTexture = function(effect,node)
{
	var textureId = node.getAttribute("texture");
	var image;
	
	// Texture is a mess in collada : two cases one from Sketchup exporter, the other one from 3DSMax
	var parentSampler = effect.querySelector("newparam[sid='" + node.getAttribute("texture") + "']");
	if ( parentSampler )
	{
		var source = findElementByTag( parentSampler, "source" );
		var surface  = effect.querySelector("newparam[sid='" + source.textContent.trim() + "']");
		var imageId = findElementByTag( surface, "init_from" );
		image = findElementByUrl(rootElement,"image",'#' + imageId.textContent.trim());
	}
	else
	{
		image = findElementByUrl(rootElement,"image",'#' + textureId);
	}
	return new SceneGraph.Texture( baseURI + findElementByTag( image, "init_from" ).textContent.trim() );
}

/**
 * Parse a common shader : blinn, phong, lambert, etc...
 */
var parseShader = function(effect,shader)
{
	var material = new SceneGraph.Material();
	
	var child = shader.firstElementChild;
	while ( child )
	{
		switch ( child.nodeName ) 
		{
		case 'diffuse':
			var colorOrTextureOrParam = child.firstElementChild;
			if ( colorOrTextureOrParam.nodeName == "color" )
				material.diffuse = parseFloats( colorOrTextureOrParam );
			else if ( colorOrTextureOrParam.nodeName == "texture" )
				material.texture = parseTexture( effect, colorOrTextureOrParam );
			break;

		default:
			break;
		}

		child = child.nextElementSibling;
	}
	
	materials[ '#' + effect.getAttribute("id") ] = material;
}

/**
 * Parse an effect
 */
var parseEffect = function(effect)
{
	// Only common profile is supported for the moment
	var commonProfile = findElementByTag(effect,"profile_COMMON");
	if ( commonProfile )
	{
		var technique = findElementByTag(effect,"technique");
		var childTechnique = technique.firstElementChild;
		while ( childTechnique )
		{
			switch ( childTechnique.nodeName ) 
			{
			case 'constant':
			case 'lambert':
			case 'blinn':
			case 'phong':
				parseShader( effect, childTechnique );
				break;

			default:
				break;
			}

			childTechnique = childTechnique.nextElementSibling;
		}
	}
	else
	{
		console.log("ColladaParser : Only effect with profile common is supported.");
	}
}

/**
 * Parse materials library
 */
var parseLibraryMaterials = function(node)
{
	// library_materials :
	//		asset (0 or 1)
	//		material (1..*)
	//		extra (0 or *)
	var material = skipAssetChild(node);
	while ( material &&  material.nodeName == "material" )
	{
		// A material instantiate an effect, retreive the effect, and then parse it
		var instanceEffect = findElementByTag(material,"instance_effect");
		var effect = findElementByUrl(rootElement,"effect",instanceEffect.getAttribute("url"));
		if ( effect )
		{
			parseEffect(effect);
			materials[ '#' + material.getAttribute("id") ] = materials[instanceEffect.getAttribute("url")];
		}
		
		material = material.nextElementSibling;
	}
}

/**
 * Parse source
 */
var parseSource = function(node,colladaGeometry)
{
	colladaGeometry.sources[ '#' + node.getAttribute("id") ] = parseFloats( findElementByTag(node,"float_array") );
}

/**
 * Parse vertices
 */
var parseVertices = function(node,colladaGeometry)
{
	var input = node.firstElementChild;
	colladaGeometry.sources[ '#' + node.getAttribute("id") ] = colladaGeometry.sources[ input.getAttribute("source") ];
}

/**
 * Parse polygons
 * Not the preferred way to handle polygons according to specification
 * But used by Autodesk exporter to Collada.
 * Only supports triangles !!! (Enough to support Autodesk exporter)
 */
var parsePolygons = function(node,colladaGeometry)
{
	var vertices = null;
	var texCoords = null;
	var numberOfInputs = 0;
	var vertexOffset = -1;
	var texCoordOffset = -1;
	
	var meshVerts = null;
	var indexMap = null;
	var indices = null;
	
	var child = node.firstElementChild;
	while ( child )
	{
		switch ( child.nodeName )
		{
		case "input":
			var semantic = child.getAttribute("semantic");
			if ( semantic == "VERTEX" )
			{
				vertices = colladaGeometry.sources[ child.getAttribute("source") ];
				vertexOffset = parseInt( child.getAttribute("offset") ); 
			}
			else if ( semantic == "TEXCOORD" )
			{
				texCoords = colladaGeometry.sources[ child.getAttribute("source") ];
				texCoordOffset = parseInt( child.getAttribute("offset") ); 
			}
			numberOfInputs++;
			break;
		case "p":
			if (!meshVerts)
			{
				meshVerts = texCoords ?  [] : vertices;
				numElements = texCoords ? 5 : 3;
				indexMap = {};
				indices = [];
			}
			
			var colladaIndices = child.textContent.trim().split(/\s+/);
			var numVerts = colladaIndices.length / numberOfInputs;
			if ( numVerts == 3 )
			{
				for ( var i = 0; i < numVerts; i++ )
				{
					var vi = parseInt( colladaIndices[i*numberOfInputs+vertexOffset] );
					
					if ( texCoords )
					{
						var tci = parseInt( colladaIndices[i*numberOfInputs+texCoordOffset] );
						var key = vi + '_' + tci;
						if ( indexMap.hasOwnProperty(key) )
						{
							indices.push( indexMap[key] );
						}
						else
						{
							var index = meshVerts.length / numElements;
							
							meshVerts.push( vertices[ 3*vi ] );
							meshVerts.push( vertices[ 3*vi+1 ] );
							meshVerts.push( vertices[ 3*vi+2 ] );					
							meshVerts.push( texCoords[ 2*tci ] );
							meshVerts.push( texCoords[ 2*tci+1 ] );
							
							indexMap[key] = index;
							
							indices.push( index );
						}
					}
					else
					{
						indices.push( vi );
					}
				}
			}
			else
			{
				console.log("ColladaParser : polygons with more 3 vertices not yet implemented");
			}
			break;
		}
		child = child.nextElementSibling;
	}

	var mesh = new SceneGraph.Mesh();
	mesh.vertices = meshVerts;
	mesh.indices = indices;
	mesh.numElements = numElements;
	colladaGeometry.meshes[ node.getAttribute("material") ] = mesh;
}	
/**
 * Parse triangles
 */
var parseTriangles = function(node,colladaGeometry)
{
	var vertices = null;
	var texCoords = null;
	var numberOfInputs = 0;
	var vertexOffset = -1;
	var texCoordOffset = -1;
	
	var child = node.firstElementChild;
	while ( child )
	{
		switch ( child.nodeName )
		{
		case "input":
			var semantic = child.getAttribute("semantic");
			if ( semantic == "VERTEX" )
			{
				vertices = colladaGeometry.sources[ child.getAttribute("source") ];
				vertexOffset = parseInt( child.getAttribute("offset") ); 
			}
			else if ( semantic == "TEXCOORD" )
			{
				texCoords = colladaGeometry.sources[ child.getAttribute("source") ];
				texCoordOffset = parseInt( child.getAttribute("offset") ); 
			}
			numberOfInputs++;
			break;
		case "p":
		
			var colladaIndices = child.textContent.trim().split(/\s+/);
						
			var indices = [];
			var indexMap = {};
			
			var meshVerts = texCoords ? [] : vertices;
			var numElements = texCoords ? 5 : 3;
			
			for ( var i = 0; i < colladaIndices.length / numberOfInputs; i++ )
			{
				var vi = parseInt( colladaIndices[i*numberOfInputs+vertexOffset] );
				
				if ( texCoords )
				{
					var tci = parseInt( colladaIndices[i*numberOfInputs+texCoordOffset] );
					var key = vi + '_' + tci;
					if ( indexMap.hasOwnProperty(key) )
					{
						indices.push( indexMap[key] );
					}
					else
					{
						var index = meshVerts.length / numElements;
						
						meshVerts.push( vertices[ 3*vi ] );
						meshVerts.push( vertices[ 3*vi+1 ] );
						meshVerts.push( vertices[ 3*vi+2 ] );					
						meshVerts.push( texCoords[ 2*tci ] );
						meshVerts.push( texCoords[ 2*tci+1 ] );
						
						indexMap[key] = index;
						
						indices.push( index );
					}
				}
				else
				{
					indices.push( vi );
				}
			}
			
			var mesh = new SceneGraph.Mesh();
			mesh.vertices = meshVerts;
			mesh.indices = indices;
			mesh.numElements = numElements;
			colladaGeometry.meshes[ node.getAttribute("material") ] = mesh;

			break;
		}
		child = child.nextElementSibling;
	}	
}

/**
 * Parse mesh
 */
var parseMesh = function(node)
{
	var colladaGeometry = {
		sources: {},
		meshes: {}
	};
	
	var child = node.firstElementChild;
	while ( child )
	{
		switch ( child.nodeName )
		{
		case 'source':
			parseSource(child,colladaGeometry);
			break;
		case 'vertices':
			parseVertices(child,colladaGeometry);
			break;
		case 'polylist':			
		case 'lines':
			console.log("ColladaParser : only triangles are implemented for mesh element");
			break;
		case 'polygons':
			parsePolygons(child,colladaGeometry);
			break;
		case "triangles":
			parseTriangles(child,colladaGeometry);
			break;
		}
		child = child.nextElementSibling;
	}	
	
	return colladaGeometry;
}
	
/**
 * Parse geometries library
 */
var parseLibraryGeometries = function(node)
{
	var geometryElt = skipAssetChild(node);
	while ( geometryElt && geometryElt.nodeName == "geometry" )
	{
		var meshElt = findElementByTag( geometryElt, "mesh" );
		
		// Build geometry from a mesh element
		if ( meshElt )
		{
			var geometry = parseMesh( meshElt );
			// Store the geometry
			if ( geometry )
			{
				geometries['#' + geometryElt.getAttribute("id")] = geometry;
			}
		}
		else
		{
			console.log("ColladaParser : only mesh geometry are supported.");
		}
		

		geometryElt = geometryElt.nextElementSibling;
	}
}

/**
 * Parse a node
 */
var parseNode = function(element)
{
	var node = new SceneGraph.Node();
	
	var child = element.firstElementChild;
	while ( child )
	{
		switch (child.nodeName)
		{
		case "node":
			node.children.push( parseNode(child) );
			break;
		case "instance_node":
			if ( nodes.hasOwnProperty( child.getAttribute("url") ) )
			{
				node.children.push( nodes[child.getAttribute("url")] );
			}
			break;
		case "instance_geometry":
			if ( geometries.hasOwnProperty( child.getAttribute("url") ) )
			{
				var colladaGeometry = geometries[child.getAttribute("url")];
				var instance_materials = child.getElementsByTagName("instance_material");
				for ( var i = 0; i < instance_materials.length; i++ )
				{
					var geometry = new SceneGraph.Geometry();
					geometry.mesh = colladaGeometry.meshes[ instance_materials[i].getAttribute("symbol") ];						
					geometry.material = materials[ instance_materials[i].getAttribute("target") ];
					
					node.geometries.push( geometry );
				}
			}
			break;
		case "rotate":
		case "translate":
		case "scale":
		case "skew":
			break;
		case "matrix":
			var data = parseFloats( child );
			
			var mat = mat4.create(data);
			mat4.transpose( mat );
			if ( !node.matrix )
			{
				node.matrix = mat;
			}
			else
			{
				mat4.multiply(node.matrix, mat);
			}
			break;
		}
		
		child = child.nextElementSibling;
	}
	
	return node;
}
 
/**
 * Parse nodes library
 */
var parseLibraryNodes = function(library)
{
	var child = skipAssetChild(library);		
	while ( child && child.nodeName == "node" )
	{
		var node = parseNode(child);
		if ( node )
		{
			nodes[ '#' + child.getAttribute("id") ] = node;
		}

		child = child.nextElementSibling;
	}
}
 
/**
 * Parse visual scene library
 */
var parseLibraryVisualScenes = function(library)
{
	var visual_scene = library.firstElementChild;
	var child = visual_scene.firstElementChild;
	
	root = new SceneGraph.Node();
	
	while ( child )
	{
		switch ( child.nodeName )
		{
			case "node":
			{
				var node = parseNode(child);
				if ( node )
				{
					root.children.push(node);
				}
			}
			break;
		}

		child = child.nextElementSibling;
	}
}

/**
 * Parse a Collada document
 */
var parse = function(doc)
{
	baseURI = doc.documentURI.substr( 0, doc.documentURI.lastIndexOf('/') + 1 );
	rootElement = doc.documentElement;
	
	// First parse materials
	var lib_mat = rootElement.getElementsByTagName('library_materials');
	if ( lib_mat )
	{
		parseLibraryMaterials( lib_mat[0] );
	}
	
	// Then parse geometries
	var lib_geom = rootElement.getElementsByTagName('library_geometries');
	if ( lib_geom )
	{
		parseLibraryGeometries( lib_geom[0] );
	}

	var child = rootElement.firstElementChild;
	while ( child )
	{
		switch ( child.nodeName )
		{
		case "library_effects":
			break;
		case "library_images":
			break;
		case "library_nodes":
			parseLibraryNodes( child );
			break;
		case "library_visual_scenes":
			parseLibraryVisualScenes( child );
			break;
		case "scene":
			break;
		}
		child = child.nextElementSibling;
	}
	
	return root;
}

return { 
	parse: parse 
};

});