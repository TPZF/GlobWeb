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

 define(['./CoordinateSystem', './RenderContext', './TileManager', './Tile', './VectorRendererManager', './Ray', './GeoBound', './Event', './Utils' ], 
	function(CoordinateSystem, RenderContext, TileManager, Tile, VectorRendererManager, Ray, GeoBound, Event, Utils) {

/**************************************************************************************************************/

/** 
	@name Globe
	@class
	Create a virtual globe in a HTML canvas element, passed in options parameter.
	The virtual globe data is set using setBaseImage/addLayer methods.
	
	@param options Configuration properties for the Globe :
		<ul>
			<li>canvas : the canvas for WebGL, can be string (id) or a canvas element</li>
			<li>renderContext : <RenderContext> object to use the existing render context</li>
			<li>backgroundColor : the background color of the canvas (an array of 4 floats)</li>
			<li>shadersPath : the path to shaders file</li>
			<li>continuousRendering: if true rendering is done continuously, otherwise it is done only if needed</li>
			<li>defaultColor : Texture color without imagery provider</li>
		</ul>
	
 */
var Globe = function(options)
{
	Event.prototype.constructor.call( this );
	
	if ( options.coordinateSystem )
	{
		this.coordinateSystem = options.coordinateSystem;
	}
	else
	{
		this.coordinateSystem = new CoordinateSystem();
	}

	if ( !options.renderContext )
	{
		this.renderContext = new RenderContext(options);
	}
	else
	{
		this.renderContext = options.renderContext;
	}
	this.tileManager = new TileManager( this, options );
	this.vectorRendererManager = new VectorRendererManager( this );
	this.attributionHandler = null;
	this.baseImagery = null;
	this.preRenderers = [];
	this.nbCreatedLayers = 0;
	
	this.tileManager.addPostRenderer( this.vectorRendererManager );

	this.renderContext.renderers.push(this);
	this.renderContext.requestFrame();
}

/**************************************************************************************************************/

Utils.inherits( Event, Globe );

/**************************************************************************************************************/

/** 
	Dispose the globe and all its ressources
 */
Globe.prototype.dispose = function()
{	
	this.tileManager.tilePool.disposeAll();
	this.tileManager.reset();
}

/**************************************************************************************************************/

/**
 	Destroy globe
 */
 Globe.prototype.destroy = function()
 {
 	this.dispose();
 	this.tileManager.removePostRenderer( this.vectorRendererManager );
 	this.renderContext.renderers.splice( this.renderContext.renderers.indexOf(this.globe), 1 );
 }


/**************************************************************************************************************/

/** 
  Refresh rendering, must be called when canvas size is modified
 */
Globe.prototype.refresh = function()
{
	this.renderContext.requestFrame();
}

/**************************************************************************************************************/

/** 
  Set the base imagery layer for the globe
  
  @param {RasterLayer} layer the layer to use, must be an imagery RasterLayer
*/
Globe.prototype.setBaseImagery = function(layer)
{
	if ( this.baseImagery == layer )
		return;

	if ( this.baseImagery )
	{
		this.removeLayer( this.baseImagery );
		this.baseImagery = null;
	}
	// Attach the layer to the globe 
	if ( layer )
	{
		layer._overlay = false;
		this.addLayer(layer);
		this.baseImagery = layer;
	}
	// Modify the tile manager after the layer has been attached
	this.tileManager.setImageryProvider(layer);
}

/**************************************************************************************************************/

/** 
  Set the base elevation layer for the globe
  
  @param {RasterLayer} layer the layer to use, must be an elevation RasterLayer
*/
Globe.prototype.setBaseElevation = function(layer)
{
	if ( this.tileManager.elevationProvider )
	{
		this.removeLayer( this.tileManager.elevationProvider );
	}
	this.tileManager.setElevationProvider(layer);
	if ( layer )
	{
		layer._overlay = false;
		this.addLayer(layer);
	}
}


/**************************************************************************************************************/

/** 
  Add a layer to the globe.
  A layer must be added to be visualized on the globe.
  
  @param layer the layer to add
*/
Globe.prototype.addLayer = function(layer)
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
Globe.prototype.removeLayer = function(layer)
{
	layer._detach();
	this.renderContext.requestFrame();
}

/**************************************************************************************************************/

/** 
  Add an animation
  
  @param anim the animation to add
*/
Globe.prototype.addAnimation = function(anim)
{
	anim.renderContext = this.renderContext;
}

/**************************************************************************************************************/

/** 
  Remove an animation
  
  @param anim the animation to remove
*/
Globe.prototype.removeAnimation = function(anim)
{
	anim.renderContext = null;
}

/**************************************************************************************************************/

/** 
  Get the elevation at a geo position
  
  @param lon the longitude in degree
  @param lat  the latitude in degree
  @return the elevation in meter at the position [lon,lat]
*/
Globe.prototype.getElevation = function(lon,lat)
{
	// Use imagery provider tiling if defined, otherwise use globe default one
	var tiling = this.tileManager.tiling;
	if ( this.baseImagery ) {
		var tiling = this.baseImagery.tiling;
	}
	var levelZeroTile = this.tileManager.level0Tiles[ tiling.lonlat2LevelZeroIndex(lon,lat) ];
	if ( levelZeroTile.state == Tile.State.LOADED )
		return levelZeroTile.getElevation(lon,lat);
	else
		return 0.0;
}

/**************************************************************************************************************/

/** 
	Get the viewport geo bound

	@param transformCallback
		Callback transforming the frustum/globe intersection coordinates if needed

    @return the geo bound of the viewport
*/
Globe.prototype.getViewportGeoBound = function(transformCallback)
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
	var earthCenter = [ 0, 0, 0 ];
	for ( var i = 0; i < 4; i++ )
	{
		mat4.multiplyVec4( tmpMat, points[i] );
		vec3.scale( points[i], 1.0 / points[i][3] );
		vec3.subtract(points[i], eye, points[i]);
		vec3.normalize( points[i] );

		var ray = new Ray( eye, points[i] );
		var t = ray.sphereIntersect( earthCenter, this.coordinateSystem.radius );
		if ( t < 0.0 )
			return null;
		var pos3d = ray.computePoint(t);
		points[i] = this.coordinateSystem.from3DToGeo( pos3d );
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
Globe.prototype.getLonLatFromPixel = function(x,y)
{	
	var ray = Ray.createFromPixel(this.renderContext, x, y);
	var intersection;
	if ( this.coordinateSystem.isFlat )
	{
		intersection =  ray.planeIntersect( [0,0,0], [0,0,1] );
	}
	else
	{
		intersection = ray.sphereIntersect( [0,0,0], this.coordinateSystem.radius );
	}
	
	if ( intersection >= 0 )
	{
		return this.coordinateSystem.from3DToGeo( ray.computePoint(intersection) );
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
Globe.prototype.getPixelFromLonLat = function(lon,lat)
{	
	var pos3d = vec3.create();
	this.coordinateSystem.fromGeoTo3D([lon,lat], pos3d);
	var pixel = this.renderContext.getPixelFrom3D(pos3d[0],pos3d[1],pos3d[2]);
	return pixel
}

/**************************************************************************************************************/

/**
	Render the globe
	TODO : private for now because it is automatically called in requestAnimationFrame.
	@private
 */
Globe.prototype.render = function()
{
	// Call pre-renderers
	for ( var i = 0 ; i < this.preRenderers.length; i++ )
		this.preRenderers[i].preRender();
		
	// Render tiles
	this.tileManager.render();
}

/**************************************************************************************************************/

/**
	Set coordinate system
 */
Globe.prototype.setCoordinateSystem = function(coordinateSystem)
{
	this.coordinateSystem = coordinateSystem;
	this.tileManager.tileConfig.coordinateSystem = coordinateSystem;
	this.dispose();
	this.tileManager.level0Tiles = this.tileManager.tiling.generateLevelZeroTiles(this.tileManager.tileConfig,this.tileManager.tilePool);
}

/**************************************************************************************************************/

/**
	Display some render statistics
	@private
 */
Globe.prototype.getRenderStats = function()
{
	return "# rendered tiles : " + this.tileManager.tilesToRender.length;
}

/**************************************************************************************************************/

return Globe;

});
