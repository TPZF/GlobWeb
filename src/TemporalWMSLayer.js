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
 
define(['./Utils', './BaseLayer', './RasterLayer', './GeoTiling', './TemporalRasterOverlayRenderer'], 
	function(Utils, BaseLayer, RasterLayer, GeoTiling, TemporalRasterOverlayRenderer) {

/**************************************************************************************************************/


/** @name TemporalWMSLayer
	@class
	A layer to display WMS (Web Map Service) data.
	@augments RasterLayer
	@param options Configuration properties for the TemporalWMSLayer. See {@link RasterLayer} for base properties :
		<ul>
			<li>baseUrl : the base Url to access the WMS server</li>
			<li>layers : the list of layers to request (WMS parameter)</li>
			<li>srs : the spatial system reference to use, default is EPSG:4326 (WMS parameter)</li>
			<li>format : the file format to request, default is image/jpeg (WMS parameter)</li>
		</ul>
 */
var TemporalWMSLayer = function( options )
{
	RasterLayer.prototype.constructor.call( this, options );
	
	//this.baseUrl = options['baseUrl'];
	this.baseUrls = options['baseUrls'];
	this.tilePixelSize = options['tilePixelSize'] || 256;
	this.tiling = new GeoTiling( 4, 2 );
	this.numberOfLevels = options['numberOfLevels'] || 21;
	this.currentIndex = 0; // Index of 
	
	// Build the base GetMap URL
	var url = "";
	url += 'service=wms';
	url += "&version="
	url += options.hasOwnProperty('version') ? options['version'] : '1.1.1';
	url += "&request=GetMap";
	//url += "&layers=" + options['layers'];
	url += "&styles=";
	if ( options.hasOwnProperty('styles') )
	{
		url += options.styles;
	}
	url += "&format=";
	url += options.hasOwnProperty('format') ? options['format'] : 'image/jpeg';
	if ( options.hasOwnProperty('transparent') )
	{
		url += "&transparent=" + options.transparent;
	}
	url += "&width=";
	url += this.tilePixelSize;
	url += "&height=";
	url += this.tilePixelSize;
	if ( options.hasOwnProperty('time') )
	{
		url += "&time=" + options.time;
	}
	this.time = 0.;

	this.options = url;
	
	this.getMapBaseUrl = url;

	this.isPaused = false;
	var self = this;
	this.animationUnpaused = function() {
		if ( self.isPaused )
		{
			console.log("Unpaused !");
			// console.log("unsubscribe 'animation:unpaused'");
			self.unsubscribe("animation:unpaused", self.animationUnpaused);
			self.isPaused = false;

			// Finish paused animation
			if ( self.animation.onstopCallback )
				self.animation.onstopCallback();
		}
	}

	this.animationPaused = function() {
		if ( !self.isPaused )
		{
			console.log("Paused !");
			self.isPaused = true;
			// console.log("subscribe 'animation:unpaused'");
			self.subscribe("animation:unpaused", self.animationUnpaused);
		}
	}


}

/**************************************************************************************************************/

Utils.inherits(RasterLayer,TemporalWMSLayer);

/**************************************************************************************************************/

TemporalWMSLayer.prototype._attach = function(g)
{
	if ( !this._overlay )
	{
		// Override id of background layer because of unicity of background not overlayed layer
		this.id = 0;
	}

	BaseLayer.prototype._attach.call( this, g );
	
	if ( this._overlay )
	{
		// Create the renderer if needed
		if ( !g.temporalRasterOverlayRenderer )
		{
			var renderer = new TemporalRasterOverlayRenderer(g);
			g.vectorRendererManager.renderers.push( renderer );
			g.temporalRasterOverlayRenderer = renderer;
		}
		g.temporalRasterOverlayRenderer.addOverlay(this);
	}
}

/**************************************************************************************************************/

/**
 *	Start animation
 */
TemporalWMSLayer.prototype.start = function()
{
	var self = this;
	var relaunchAnimtion = function() {
		self.next(relaunchAnimtion);
	}
	this.next(relaunchAnimtion);
}

/**************************************************************************************************************/

/**
 *	Stop animation
 */
TemporalWMSLayer.prototype.stop = function()
{
	this.isPaused = false;
	this.animation.onstopCallback = null;
	this.unsubscribe("animation:unpaused", this.animationUnpaused);
	this.unsubscribe("animation:paused", this.animationPaused);
}

/**************************************************************************************************************/

/**
 *	Animation to next base imagery
 */
TemporalWMSLayer.prototype.next = function(onstop)
{
	// console.log("subscribe 'animation:paused'");
	this.subscribe("animation:paused", this.animationPaused);

	var self = this;
	this.animation = new GlobWeb.SegmentedAnimation(
		200,
		// Value setter
		function(value) {
			self.time = value;
		}
	);

	if ( onstop )
		this.animation.onstopCallback = onstop;

	this.animation.addSegment(
		0., this.time,
		1.0, 1.,
		function(t, a, b) {
			return GlobWeb.Numeric.lerp(t, a, b);
		}
	);
	this.globe.addAnimation(this.animation);
	this.animation.onstop = function(){
		self.currentIndex++;

		// Time changing could provoke the animation paused, depending
		// on requests which 
		self.publish("time:changed");
		self.time = 0;
		// console.log("unsubscribe 'animation:paused'");
		self.unsubscribe("animation:paused", self.animationPaused);
		if ( !self.isPaused && self.animation.onstopCallback )
		{
			self.animation.onstopCallback();
		}
	};
	this.animation.start();
}

/**************************************************************************************************************/

/**
	Get an url for the given tile
 */
TemporalWMSLayer.prototype.getUrl = function(tile, baseIndex)
{
	var base = this.baseUrls[(this.currentIndex + baseIndex)%this.baseUrls.length];
	//console.log(this.currentIndex + " + " + baseIndex + " = " + base.baseUrl);
	// Just add the bounding box to the GetMap URL
	var bound = tile.bound;
	var url = base.baseUrl;
	if ( url.indexOf('?',0) == -1 )
	{
		url += '?';
	}
	else
	{
		url += '&';
	}
	url += this.options;
	url += "&layers=" + base.layers;
	url += "&srs=" + tile.config.srs;
	url += "&bbox=";
	
	url += bound.west;
	url += ",";
	url += bound.south;
	url += ",";
	url += bound.east;
	url += ",";
	url += bound.north;

//	console.log(url);
	
	return url;
}

/**************************************************************************************************************/

return TemporalWMSLayer;

});

