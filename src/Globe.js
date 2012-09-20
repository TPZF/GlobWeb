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

/** 
	@constructor
	@class
	Add a virtual globe in a canvas element.
	The virtual globe data must be set using setBaseImage/addLayer methods.
	
	@param options Configuration properties for the Globe :
		<ul>
			<li>canvas : the canvas for WebGL, can be string (id) or a canvas element</li>
			<li>contextAttribs : the attributes when creating WebGL context, see WebGL specification</li>
			<li>atmosphere : if true use an atmosphere</li>
			<li>backgroundColor : the background color of the canvas (an array of 4 floats)</li>
			<li>showWireframe : if true wireframe is shown when rendering terrain (for debug purposes)</li>
			<li>shadersPath : the path to shaders file</li>
			<li>continuousRendering: if true rendering is done continuously, otherwise it is done only if needed</li>
		</ul>
	
 */
GlobWeb.Globe = function(options)
{
	this.renderContext = new GlobWeb.RenderContext(options);
	this.tileManager = new GlobWeb.TileManager( this.renderContext );
	this.tileManager.showWireframe = options['showWireframe'];
	this.vectorRendererManager = new GlobWeb.VectorRendererManager( this );
	this.attributionHandler = new GlobWeb.AttributionHandler();
	this.activeAnimations = [];
	
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
	
	if ( options['atmosphere'] )
	{
		this.atmosphere = new GlobWeb.Atmosphere(this.renderContext);
	}
}

/**************************************************************************************************************/

/** 
	Dispose the globe and all its ressources
 */
GlobWeb.Globe.prototype.dispose = function()
{	
	this.tileManager.tilePool.disposeAll();
	this.tileManager.reset();
}

/**************************************************************************************************************/

/** 
	Modify an option, not all options can be modified after creation.
	The modifiable options are :
		<ul>
			<li>atmosphere</li>
			<li>showWireframe</li>
		</ul>
	@param name the name of the option
	@param value the value of the option
 */
GlobWeb.Globe.prototype.setOption = function(name,value)
{	
	switch ( name )
	{
	case "atmosphere":
		if ( value )
		{
			if ( !this.atmosphere )
			{
				this.atmosphere = new GlobWeb.Atmosphere(this.renderContext);
			}
		}
		else
		{
			if ( this.atmosphere )
			{
				this.atmosphere = null;
			}
		}
		break;
	case "showWireframe":
		this.tileManager.showWireframe = value;
		break;
	}
}

/**************************************************************************************************************/

/** 
  Refresh rendering, must be called when canvas size is modified
 */
GlobWeb.Globe.prototype.refresh = function()
{
	this.renderContext.requestFrame();
}

/**************************************************************************************************************/

/** 
  Set the base imagery layer for the globe
  
  @param {GlobWeb.RasterLayer} layer the layer to use, must be an imagery RasterLayer
*/
GlobWeb.Globe.prototype.setBaseImagery = function(layer)
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
  
  @param {GlobWeb.RasterLayer} layer the layer to use, must be an elevation RasterLayer
*/
GlobWeb.Globe.prototype.setBaseElevation = function(layer)
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
GlobWeb.Globe.prototype.addLayer = function(layer)
{	
	if ( layer.attribution )
	{
		this.attributionHandler.addAttribution(layer);
	}
	layer._attach(this);
	this.renderContext.requestFrame();
}

/**************************************************************************************************************/

/** 
  Remove a layer
  
  @param layer the layer to remove
*/
GlobWeb.Globe.prototype.removeLayer = function(layer)
{
	if ( layer.attribution )
	{
		this.attributionHandler.removeAttribution(layer);
	}
	layer._detach();
	this.renderContext.requestFrame();
}

/**************************************************************************************************************/

/** 
  Add an animation
  
  @param anim the animation to add
*/
GlobWeb.Globe.prototype.addAnimation = function(anim)
{
	anim.globe = this;
}

/**************************************************************************************************************/

/** 
  Remove an animation
  
  @param anim the animation to remove
*/
GlobWeb.Globe.prototype.removeAnimation = function(anim)
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
GlobWeb.Globe.prototype.getElevation = function(lon,lat)
{
	var tiling = this.tileManager.imageryProvider.tiling;
	var levelZeroTile = this.tileManager.level0Tiles[ tiling.lonlat2LevelZeroIndex(lon,lat) ];
	if ( levelZeroTile.state == GlobWeb.Tile.State.LOADED )
		return levelZeroTile.getElevation(lon,lat);
	else
		return 0.0;
}

/**************************************************************************************************************/

/** 
	Get the viewport geo bound
    @return the geo bound of the viewport
*/
GlobWeb.Globe.prototype.getViewportGeoBound = function()
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
		
		var t = Numeric.raySphereIntersection( eye, points[i], earthCenter, GlobWeb.CoordinateSystem.radius);
		if ( t < 0.0 )
			return null;
			
		points[i] = GlobWeb.CoordinateSystem.from3DToGeo( Numeric.pointOnRay(eye, points[i], t, tmpPt) );
	}

	var geoBound = new GlobWeb.GeoBound();
	geoBound.computeFromCoordinates( points );

	return geoBound;
}

/**************************************************************************************************************/

/** 
	Get the lon-lat from a pixel
 */
GlobWeb.Globe.prototype.getLonLatFromPixel = function(x,y)
{	
	var pos3d = this.renderContext.get3DFromPixel(x,y);
	if( pos3d == null )
	{
		return null;
	}
	else
	{
		var geoPick = [];
		GlobWeb.CoordinateSystem.from3DToGeo(pos3d, geoPick);
		return geoPick;
	}
}

/**************************************************************************************************************/

/**
	Render the globe
	@private
 */
GlobWeb.Globe.prototype.render = function()
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
	
	// 	Pre render atmosphere
	if ( this.atmosphere )
		this.atmosphere.preRender( this.tileManager );
	
	// Render tiles
	this.tileManager.render();
	
	if ( this.tileManager.tilesToRender.length == 0 )
		return;
	
	// Render the atmosphere
	if ( this.atmosphere )
		this.atmosphere.render();
		
	if (stats) stats.end("globalRenderTime");
}

/**************************************************************************************************************/
