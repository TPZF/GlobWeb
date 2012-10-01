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
	Function constructor for VectorLayer
 */
GlobWeb.VectorLayer = function( options )
{
	GlobWeb.BaseLayer.prototype.constructor.call( this, options );
	
	// Set style
	if ( options && options['style'] )
		this.style = options['style'];
	else
		this.style = new GlobWeb.FeatureStyle();
	
	this.style.opacity = this._opacity;
	this.features = [];
	this.type = "Vector";
}

/**************************************************************************************************************/

GlobWeb.inherits( GlobWeb.BaseLayer,GlobWeb.VectorLayer );

/**************************************************************************************************************/

/** 
  Attach the vector layer to the globe
 */
GlobWeb.VectorLayer.prototype._attach = function( g )
{
	GlobWeb.BaseLayer.prototype._attach.call( this, g );
	
	if ( this.attribution )
	{
		this.globe.attributionHandler.addAttribution(this);
	}
	
	if ( this._visible )
	{
		for ( var i=0; i < this.features.length; i++ )
		{
			this._addFeatureToRenderers( this.features[i] );
		}
	}
	
}

/**************************************************************************************************************/

/** @export
  Adds a feature collection, in GeoJSON format
 */
GlobWeb.VectorLayer.prototype.addFeatureCollection = function( featureCollection )
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
GlobWeb.VectorLayer.prototype.removeFeatureCollection = function( featureCollection )
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
GlobWeb.VectorLayer.prototype._addFeatureToRenderers = function( feature )
{
	var geometry = feature['geometry']
	
	// Manage style, if undefined try with properties, otherwise use defaultStyle
	var style = this.style;
	var props = feature['properties'];
	if ( props && props['style'] )
	{
		style = props['style'];
		style.opacity = this._opacity;
	}
	
	// DateLine crossing fix
	// TODO : should be put in another place
	if ( geometry.type == "LineString" )
	{
		if ( this._crossDateLine(geometry) )
		{
			feature['_crossDateLine'] = true;
				
			var coords = geometry['coordinates'][0];
			for ( var n = 0; n < coords.length; n++) {
				if ( coords[n][0] < 0 ) {
					coords[n][0] += 360;
				}
			}
			
			var negCoords = [];
			for ( var n = 0; n < coords.length; n++) {
				negCoords[n] = [ coords[n][0] - 360, coords[n][1] ];
			}
			
			geometry['_negCoordinates'] = [ negCoords ];
		}
	}

	// Manage geometry collection
	if ( geometry.type == "GeometryCollection" )
	{
		var geoms = geometry["geometries"];
		for ( var i = 0; i < geoms.length; i++ )
		{
			this.globe.vectorRendererManager.addGeometry( geoms[i], style );
		}
	}
	else
	{
		// Add geometry to renderers
		this.globe.vectorRendererManager.addGeometry( geometry, style );
	}
}

/**************************************************************************************************************/

/** 
  Remove a feature from renderers
*/
GlobWeb.VectorLayer.prototype._removeFeatureFromRenderers = function( feature )
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
			this.globe.vectorRendererManager.removeGeometry( geoms[i], style );
		}
	}
	else
	{
		this.globe.vectorRendererManager.removeGeometry( geometry, style );
	}
}

/**************************************************************************************************************/

/** @export
  Add a feature to the layer
*/
GlobWeb.VectorLayer.prototype.addFeature = function( feature )
{
	// Check feature geometry : only add valid feature
	var geometry = feature['geometry'];
	if ( !geometry || !geometry.type )
		return;
	this.features.push( feature );
	
	// Add features to renderer if attached to globe and visible
	if ( this.globe && this._visible )
	{			
		this._addFeatureToRenderers(feature);
		this.globe.renderContext.requestFrame();
	}
}

/**************************************************************************************************************/

/** @export
  Remove a feature from the layer
*/
GlobWeb.VectorLayer.prototype.removeFeature = function( feature )
{
	var index = this.features.indexOf( feature );
	this.features.splice( index, 1 );
	if ( this.globe )
	{
		this._removeFeatureFromRenderers( feature );
		this.globe.renderContext.requestFrame();
	}
}

/**************************************************************************************************************/

/** @export
  Modify feature style
*/
GlobWeb.VectorLayer.prototype.modifyFeatureStyle = function( feature, style )
{
	this._removeFeatureFromRenderers( feature );
	feature['properties']['style'] = style;
	this._addFeatureToRenderers( feature );
}

/**************************************************************************************************************/

/** 
  Check if a geometry crosses the date line
*/
GlobWeb.VectorLayer.prototype._crossDateLine = function(geometry) 
{
	var coords = geometry['coordinates'][0];
	var startLon = coords[0][0];
	for ( var i = 1; i < coords.length; i++) {
		var deltaLon = Math.abs( coords[i][0] - startLon );
		if ( deltaLon > 180 ) {
			// DayLine!
			return true;
		}
		coord = coords[i];
	}
	
	return false;
};

/**************************************************************************************************************/

/**
  Set the layer visible
 */
GlobWeb.VectorLayer.prototype.visible = function( arg )
{
	if ( this._visible != arg ){
		this._visible = arg;
		if ( arg ){
			for ( var i=0; i < this.features.length; i++ )
			{
				this._addFeatureToRenderers( this.features[i] );
			}
		}
		else
		{
			for ( var i=0; i < this.features.length; i++ )
			{
				this._removeFeatureFromRenderers( this.features[i] );
			}
		}
	}
}

/**************************************************************************************************************/

/**
  Set the opacity of the vector layer
  @param arg Argument of opacity defined in the interval [0, 1]
 */
GlobWeb.VectorLayer.prototype.opacity = function( arg )
{
	this._opacity = arg;
	this.style.opacity = arg;
	for ( var i=0; i<this.features.length; i++ )
	{
		var style = this.features[i].['properties'].style || new GlobWeb.FeatureStyle();
		style.opacity = arg;
		this.modifyFeatureStyle( this.features[i], style );
	}
}