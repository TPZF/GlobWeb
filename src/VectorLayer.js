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
 
define(['./Utils', './BaseLayer', './FeatureStyle'], 
	function(Utils, BaseLayer, FeatureStyle) {

/**************************************************************************************************************/

/** @name VectorLayer
	@class
	Create a layer to display vector data in GeoJSON format.
	@augments BaseLayer
	@param options Configuration properties for VectorLayer. See {@link BaseLayer} for base properties :
		<ul>
			<li>style : the style to use. See {@link FeatureStyle}</li>
			<li>minLevel : minimum rendering level depending on tile level</li>
			<li>maxLevel : maximum rendering level depending on tile level</li>
		</ul>
 */
var VectorLayer = function( options )
{
	BaseLayer.prototype.constructor.call( this, options );
	
	// Set style
	if ( options && options['style'] )
		this.style = options['style'];
	else
		this.style = new FeatureStyle();
	
	this.minLevel = options && options.hasOwnProperty('minLevel') ? options['minLevel'] : 0.0;
	this.maxLevel = options && options.hasOwnProperty('maxLevel') ? options['maxLevel'] : 15.0;

	this.features = [];
}

/**************************************************************************************************************/

Utils.inherits( BaseLayer,VectorLayer );

/**************************************************************************************************************/

/** 
  Attach the vector layer to the globe
 */
VectorLayer.prototype._attach = function( g )
{
	BaseLayer.prototype._attach.call( this, g );
	
	// Add the feature to renderers
	for ( var i=0; i < this.features.length; i++ )
	{
		this._addFeatureToRenderers( this.features[i] );
	}
}

/**************************************************************************************************************/

/** 
  Detach the vector layer from the globe
 */
VectorLayer.prototype._detach = function()
{
	// Remove feature from renderers
	for ( var i=0; i < this.features.length; i++ )
	{
		this._removeFeatureFromRenderers( this.features[i] );
	}
	
	BaseLayer.prototype._detach.call(this);
}

/**************************************************************************************************************/

/** @export
  Adds a feature collection, in GeoJSON format
 */
VectorLayer.prototype.addFeatureCollection = function( featureCollection )
{
	// Note : use property defined as ['']  to avoid renaming when compiled in advanced mode with the closure compiler
	var features = featureCollection['features'];
	if ( features )
	{
		for ( var i = 0; i < features.length; i++)
		{
			this.addFeature( features[i] );
		}
	}
}

/**************************************************************************************************************/

/** @export
  Removes a feature collection, in GeoJSON format
*/
VectorLayer.prototype.removeFeatureCollection = function( featureCollection )
{
	// Note : use property defined as ['']  to avoid renaming when compiled in advanced mode with the closure compiler
	var features = featureCollection['features'];
	if ( features )
	{
		for ( var i = 0; i < features.length; i++)
		{
			this.removeFeature( features[i] );
		}
	}
}

/**************************************************************************************************************/

/** 
  Add a feature to renderers
*/
VectorLayer.prototype._addFeatureToRenderers = function( feature )
{
	var geometry = feature['geometry']
	
	// Manage style, if undefined try with properties, otherwise use defaultStyle
	var style = this.style;
	var props = feature['properties'];
	if ( props && props['style'] )
	{
		style = props['style'];
	}

	// Manage geometry collection
	if ( geometry.type == "GeometryCollection" )
	{
		var geoms = geometry["geometries"];
		for ( var i = 0; i < geoms.length; i++ )
		{
			this.globe.vectorRendererManager.addGeometry( this, geoms[i], style );
		}
	}
	else
	{
		// Add geometry to renderers
		this.globe.vectorRendererManager.addGeometry( this, geometry, style );
	}
}

/**************************************************************************************************************/

/** 
  Remove a feature from renderers
*/
VectorLayer.prototype._removeFeatureFromRenderers = function( feature )
{
	var geometry = feature['geometry']
	
	// Manage geometry collection
	if ( geometry.type == "GeometryCollection" )
	{
		var geoms = geometry["geometries"];
		var res = false;
		for ( var i = 0; i < geoms.length; i++ )
		{
			res = this.globe.vectorRendererManager.removeGeometry( geoms[i], this );
		}
		return res;
	}
	else
	{
		return this.globe.vectorRendererManager.removeGeometry( geometry, this );
	}
}

/**************************************************************************************************************/

/** @export
  Add a feature to the layer
*/
VectorLayer.prototype.addFeature = function( feature )
{
	// Check feature geometry : only add valid feature
	var geometry = feature['geometry'];
	if ( !geometry || !geometry.type )
		return;
	this.features.push( feature );
	
	// Add features to renderer if layer is attached to globe
	if ( this.globe )
	{			
		this._addFeatureToRenderers(feature);
		if (this._visible) this.globe.renderContext.requestFrame();
	}
}

/**************************************************************************************************************/

/** @export
  Remove a feature from the layer
*/
VectorLayer.prototype.removeFeature = function( feature )
{
	var index = this.features.indexOf( feature );
	this.features.splice( index, 1 );
	if ( this.globe )
	{
		this._removeFeatureFromRenderers( feature );
		if (this._visible) this.globe.renderContext.requestFrame();
	}
}

/**************************************************************************************************************/

/** @export
  Remove all feature from the layer
*/
VectorLayer.prototype.removeAllFeatures = function()
{
	// Remove feature from renderers
	if ( this.globe )
	{
		for ( var i = 0; i < this.features.length; i++ )
		{
			this._removeFeatureFromRenderers( this.features[i] );
		}
	}
	this.features.length = 0;
	
	// Refresh rendering if needed
	if ( this.globe && this._visible )
	{
		this.globe.renderContext.requestFrame();
	}
}

/**************************************************************************************************************/

/** @export
  Modify feature style
*/
VectorLayer.prototype.modifyFeatureStyle = function( feature, style )
{
	if ( this._removeFeatureFromRenderers( feature ) ) {
		feature.properties.style = style;
		this._addFeatureToRenderers( feature );
	}
}

/**************************************************************************************************************/

/** @export
  Modify the vector layer style
*/
VectorLayer.prototype.modifyStyle = function(style)
{
	for ( var i=0; i<this.features.length; i++ )
	{
		this._removeFeatureFromRenderers( this.features[i] );
	}
	
	this.style = style;
	
	for ( var i=0; i<this.features.length; i++ )
	{
		this._addFeatureToRenderers( this.features[i] );
	}
}

/**************************************************************************************************************/

return VectorLayer;

});

