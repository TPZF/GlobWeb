/***************************************
 * Copyright 2011, 2012 GlobWeb contributors.
 *
 * This file is part of 
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
 * along with  If not, see <http://www.gnu.org/licenses/>.
 ***************************************/

 define(['./CoordinateSystem', './RenderContext','./TileManager','./Tile' , './VectorRendererManager', './AttributionHandler' ], 
	function(CoordinateSystem, RenderContext, TileManager, Tile, VectorRendererManager, AttributionHandler) {

/**************************************************************************************************************/

/** 
	@constructor
	@class
	Add a virtual globe in a canvas element.
	The virtual globe data is set using setBaseImage/addLayer methods.
	
	@param options Configuration properties for the Globe :
		<ul>
			<li>canvas : the canvas for WebGL, can be string (id) or a canvas element</li>
			<li>contextAttribs : the attributes when creating WebGL context, see WebGL specification</li>
			<li>backgroundColor : the background color of the canvas (an array of 4 floats)</li>
			<li>shadersPath : the path to shaders file</li>
			<li>continuousRendering: if true rendering is done continuously, otherwise it is done only if needed</li>
		</ul>
	
 */
var Globe = function(options)
{
	this.renderContext = new RenderContext(options);
	this.tileManager = new TileManager( this );
	this.vectorRendererManager = new VectorRendererManager( this );
	this.attributionHandler = new AttributionHandler();
	this.activeAnimations = [];
	this.preRenderers = [];
	this.nbCreatedLayers = 0;
	
	// Event callbacks
	this.callbacks = {};
	
	var glob = this;	
	this.renderContext.frame = function() 
	{		
		// Resest frame requested flag first
		glob.renderContext.frameRequested = false;
				
		// Render the globe
		glob.render();
		
		// Request next frame
		if ( glob.renderContext.continuousRendering )
		{
			glob.renderContext.requestFrame();
		}
		else if ( glob.activeAnimations.length > 0 )
		{
			glob.renderContext.requestFrame();
		}
		
	};
	
	this.renderContext.requestFrame();
}

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
	if ( this.tileManager.imageryProvider )
	{
		this.removeLayer( this.tileManager.imageryProvider );
	}
	this.tileManager.setImageryProvider(layer);
	if ( layer )
	{
		layer.overlay = false;
		this.addLayer(layer);
	}
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
		layer.overlay = false;
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
	anim.globe = this;
}

/**************************************************************************************************************/

/** 
  Remove an animation
  
  @param anim the animation to remove
*/
Globe.prototype.removeAnimation = function(anim)
{
	anim.globe = null;
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
	var tiling = this.tileManager.imageryProvider.tiling;
	var levelZeroTile = this.tileManager.level0Tiles[ tiling.lonlat2LevelZeroIndex(lon,lat) ];
	if ( levelZeroTile.state == Tile.State.LOADED )
		return levelZeroTile.getElevation(lon,lat);
	else
		return 0.0;
}

/**************************************************************************************************************/

/** 
	Get the viewport geo bound
    @return the geo bound of the viewport
*/
Globe.prototype.getViewportGeoBound = function()
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
Globe.prototype.getPixelFromLonLat = function(lon,lat)
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
Globe.prototype.render = function()
{
	var rc = this.renderContext;
	var stats = rc.stats;
	var gl = rc.gl;
		
	if (stats) stats.start("globalRenderTime");
	
	// Update active animations
	if ( this.activeAnimations.length > 0)
	{
		var time = Date.now();
		for (var i = 0; i < this.activeAnimations.length; i++)
		{
			this.activeAnimations[i].update(time);
		}
	}
	
	// Clear the buffer
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	// Check canvas size is valid
	if ( rc.canvas.width == 0 || rc.canvas.height == 0 )
		return;
		
	gl.viewport(0, 0, rc.canvas.width, rc.canvas.height);

	// Update view dependent properties to be used during rendering : view matrix, frustum, projection, etc...
	rc.updateViewDependentProperties();
	
	// Call pre-renderers
	for ( var i = 0 ; i < this.preRenderers.length; i++ )
		this.preRenderers[i].preRender();
		
	// Render tiles
	this.tileManager.render();
	
	if ( this.tileManager.tilesToRender.length == 0 )
		return;
		
	if (stats) stats.end("globalRenderTime");
}

/**************************************************************************************************************/

/** 
	Subscribe to an event
	
	@param name Event name
		<ul>
			<li>startNavigation : called when navigation is started (by the user or through animation)</li>
			<li>endNavigation : called when navigation is ended (by the user or through animation)t</li>
			<li>baseLayersReady : called when the base layers are ready to be displayed</li>
			<li>baseLayersError : called when the base layers are not valid, or not accessible, in that case nothing is displayed so this event is useful to provide an error message to the user</li>
		</ul>
	@param callback Callback function
*/
Globe.prototype.subscribe = function(name,callback)
{
	if( !this.callbacks[name] ) {
		this.callbacks[name] = [ callback ];
	} else {
		this.callbacks[name].push( callback );
	}
}

/**************************************************************************************************************/

/** 
	Unsubscribe to an event 
	
	@param name Event name {@link Globe#subscribe}
	@param callback Callback function
*/
Globe.prototype.unsubscribe = function(name,callback)
{
	if( this.callbacks[name] ) {
		var i = this.callbacks[name].indexOf( callback );
		if ( i != -1 ) {
			this.callbacks[name].splice(i,1);
		}
	}
}

/**************************************************************************************************************/

/**
	Publish an event
	
	@param name Event name
	@param context Context
	
	@private
*/
Globe.prototype.publish = function(name,context)
{
	if ( this.callbacks[name] ) {
		var cbs = this.callbacks[name];
		for ( var i = 0; i < cbs.length; i++ ) {
			cbs[i](context);
		}
	}
}

return Globe;

});
