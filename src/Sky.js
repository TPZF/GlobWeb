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

 define(['./CoordinateSystem', './RenderContext', './TileManager', './TilePool', './Tile', './VectorRendererManager', './Numeric', './GeoBound', './Event', './Utils' ], 
	function(CoordinateSystem, RenderContext, TileManager, TilePool, Tile, VectorRendererManager, Numeric, GeoBound, Event, Utils) {

/**************************************************************************************************************/

/** 
	@name Sky
	@class
	Create a virtual sky in a HTML canvas element, passed in options parameter.
	The virtual sky data is set using setBaseImage/addLayer methods.
	
	@param options Configuration properties for the Sky :
		<ul>
			<li>canvas : the canvas for WebGL, can be string (id) or a canvas element</li>
			<li>backgroundColor : the background color of the canvas (an array of 4 floats)</li>
			<li>shadersPath : the path to shaders file</li>
			<li>continuousRendering: if true rendering is done continuously, otherwise it is done only if needed</li>
		</ul>
	
 */
var Sky = function(options)
{
	Event.prototype.constructor.call( this );

	this.renderContext = new RenderContext(options);
	this.tilePool =  new TilePool(this.renderContext);
	this.tileManagers = {
		'EQ': new TileManager( this ),
		'GAL': new TileManager( this )
	};
	// Default tile manager is in equatorial coord sys
	this.tileManager = this.tileManagers['EQ'];
	this.vectorRendererManager = new VectorRendererManager( this );
	this.attributionHandler = null;
	this.baseImagery = null;
	this.nbCreatedLayers = 0;
	
	this.tileManager.addPostRenderer( this.vectorRendererManager );
	
	this.renderContext.renderer = this;
	this.renderContext.requestFrame();
}

/**************************************************************************************************************/

Utils.inherits( Event, Sky );


/**************************************************************************************************************/

/** 
  Refresh rendering, must be called when canvas size is modified
 */
Sky.prototype.refresh = function()
{
	this.renderContext.requestFrame();
}

/**************************************************************************************************************/

/** 
  Set the base imagery layer for the sky
  
  @param {RasterLayer} layer the layer to use, must be an imagery RasterLayer
*/
Sky.prototype.setBaseImagery = function(layer)
{
	if ( this.baseImagery == layer )
		return;
		
	if ( this.baseImagery ) 
	{
		this.removeLayer( this.baseImagery );	
		this.tileManagers[ this.baseImagery.coordSystem ].setImageryProvider(null);
		this.baseImagery = null;		
	}
	
	// Attach the layer to the globe 
	if ( layer )
	{
		layer._overlay = false;
		this.addLayer(layer);
		
		// Modify the tile manager after the layer has been attached
		this.tileManagers[ layer.coordSystem ].setImageryProvider( layer );
		this.baseImagery = layer;
	}
	
}

/**************************************************************************************************************/

/** 
  Add a layer to the globe.
  A layer must be added to be visualized on the globe.
  
  @param layer the layer to add
*/
Sky.prototype.addLayer = function(layer)
{
	layer.id = this.nbCreatedLayers;
	layer._attach(this);
	this.renderContext.requestFrame();
	this.nbCreatedLayers++;
}

/**************************************************************************************************************/

/** 
  Remove a layer
  
  @param layer the layer to remove
*/
Sky.prototype.removeLayer = function(layer)
{
	layer._detach();
	this.renderContext.requestFrame();
}

/**************************************************************************************************************/

/** 
  Add an animation
  
  @param anim the animation to add
*/
Sky.prototype.addAnimation = function(anim)
{
	anim.renderContext = this.renderContext;
}

/**************************************************************************************************************/

/** 
  Remove an animation
  
  @param anim the animation to remove
*/
Sky.prototype.removeAnimation = function(anim)
{
	anim.renderContext = null;
}

/**************************************************************************************************************/

/** 
	Get the viewport geo bound

	@param transformCallback
		Callback transforming the frustum/globe intersection coordinates if needed

    @return the geo bound of the viewport
*/
Sky.prototype.getViewportGeoBound = function(transformCallback)
{
	var rc = this.renderContext;
	var tmpMat = mat4.create();
	
	// Compute eye in world space
	mat4.inverse(rc.viewMatrix, tmpMat);
	var eye = [tmpMat[12], tmpMat[13], tmpMat[14]];
	
	// Compute the inverse of view/proj matrix
	mat4.multiply(rc.projectionMatrix, rc.viewMatrix, tmpMat);
	mat4.inverse(tmpMat);
	
	// Transform the four corners of the frustum into world space
	// and then for each corner compute the intersection of ray starting from the eye with the earth
	var points = [ [ -1, -1, 1, 1 ], [ 1, -1, 1, 1 ], [ -1, 1, 1, 1 ], [ 1, 1, 1, 1 ] ];
	var tmpPt = vec3.create();
	var earthCenter = [ 0, 0, 0 ];
	for ( var i = 0; i < 4; i++ )
	{
		mat4.multiplyVec4( tmpMat, points[i] );
		vec3.scale( points[i], 1.0 / points[i][3] );
		vec3.subtract(points[i], eye, points[i]);
		vec3.normalize( points[i] );
		
		var t = Numeric.raySphereIntersection( eye, points[i], earthCenter, CoordinateSystem.radius);
		if ( t < 0.0 )
			return null;
			
		points[i] = CoordinateSystem.from3DToGeo( Numeric.pointOnRay(eye, points[i], t, tmpPt) );
		if (transformCallback) 
		{
			points[i] = transformCallback(points[i]);
		}
	}

	var geoBound = new GeoBound();
	geoBound.computeFromCoordinates( points );

	return geoBound;
}

/**************************************************************************************************************/

/** 
	Get the lon-lat from a pixel.
	The pixel is expressed in the canvas frame, i.e. (0,0) corresponds to the lower-left corner of the pixel
	
	@param 	x the pixel x coordinate
	@param 	y the pixel y coordinate
	@return	an array of two numbers [lon,lat] or null if the pixel is not on the globe
 */
Sky.prototype.getLonLatFromPixel = function(x,y)
{	
	var pos3d = this.renderContext.get3DFromPixel(x,y);
	if ( pos3d )
	{
		return CoordinateSystem.from3DToGeo(pos3d);
	}
	else
	{
		return null;
	}
}

/**************************************************************************************************************/

/** 
	Get pixel from lon-lat
	The pixel is expressed in the canvas frame, i.e. (0,0) corresponds to the lower-left corner of the pixel
	
	@param lon	the longitude
	@param lat	the latitude
	@return	an array of two numbers [x,y] or null if the pixel is not on the globe
 */
Sky.prototype.getPixelFromLonLat = function(lon,lat)
{	
	var pos3d = vec3.create();
	CoordinateSystem.fromGeoTo3D([lon,lat], pos3d);
	var pixel = this.renderContext.getPixelFrom3D(pos3d[0],pos3d[1],pos3d[2]);
	return pixel
}

/**************************************************************************************************************/

/**
	Render the globe
	TODO : private for now because it is automatically called in requestAnimationFrame.
	@private
 */
Sky.prototype.render = function()
{		
	// Render tiles manager
	this.tileManagers['GAL'].render();
	this.tileManagers['EQ'].render();
}

/**************************************************************************************************************/

/**
	Display some render statistics
	@private
 */
Sky.prototype.getRenderStats = function()
{
	return "# rendered tiles : " + this.tileManager.tilesToRender.length;
}

/**************************************************************************************************************/

return Sky;

});
