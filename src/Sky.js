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

 define(['./Globe', './EquatorialCoordinateSystem', './TileManager', './TilePool', './Utils' ], 
	function(Globe, EquatorialCoordinateSystem, TileManager, TilePool, Utils) {

/**************************************************************************************************************/

/** 
	@name Sky
	@class
	Create a virtual sky in a HTML canvas element, passed in options parameter.
	The virtual sky data is set using setBaseImage/addLayer methods.
	
	@param options Configuration properties for the Sky :
		<ul>
			<li>canvas : the canvas for WebGL, can be string (id) or a canvas element</li>
			<li>renderContext : <RenderContext> object to use the existing render context</li>
			<li>backgroundColor : the background color of the canvas (an array of 4 floats)</li>
			<li>shadersPath : the path to shaders file</li>
			<li>continuousRendering: if true rendering is done continuously, otherwise it is done only if needed</li>
		</ul>
	
 */
var Sky = function(options)
{
	options.coordinateSystem = new EquatorialCoordinateSystem(options);
	Globe.prototype.constructor.call( this, options );

	this.isSky = true;
	this.tilePool =  new TilePool(this.renderContext);
	this.tileManagers = {
		'EQ': this.tileManager,
		'GAL': new TileManager( this, options )
	};

	this.renderContext.requestFrame();
}

/**************************************************************************************************************/

Utils.inherits( Globe, Sky );

/**************************************************************************************************************/

/** 
	Dispose the sky and all its ressources
 */
Sky.prototype.dispose = function()
{	
	for ( var x in this.tileManagers )
	{
		this.tileManagers[x].tilePool.disposeAll();	
		this.tileManagers[x].reset();
	}
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
		//this.tileManager = this.tileManagers[layer.coordSystem];
		this.tileManagers[ layer.coordSystem ].setImageryProvider( layer );
		this.baseImagery = layer;
	}
	
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

return Sky;

});
