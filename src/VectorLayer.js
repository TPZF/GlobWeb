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
	// Set style
	if ( options && options['style'] )
		this.style = options['style'];
	else
		this.style = new GlobWeb.FeatureStyle();
		
	this.features = [];
	this.globe = null;
	this.type = "Vector";
}

/**************************************************************************************************************/

/** 
  Attach the vector layer to the globe
 */
GlobWeb.VectorLayer.prototype._attach = function( g )
{
	this.globe = g;
	for ( var i=0; i < this.features.length; i++ )
	{
		this._addFeatureToRenderers( this.features[i] );
	}
}

/**************************************************************************************************************/

/** 
  Detach the vector layer from the globe
 */
GlobWeb.VectorLayer.prototype._detach = function( g )
{
	for ( var i=0; i < this.features.length; i++ )
	{
		this.globe.vectorRendererManager.removeFeature( this.features[i] );
	}
	this.globe = null;
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

/** @export
  Add a feature to the layer
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
	}
	
	// DateLine crossing fix
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

	// Manage geometry collection : not optimized for the moment
	if ( geometry.type == "GeometryCollection" )
	{
		var geoms = geometry["geometries"];
		for ( var i = 0; i < geoms.length; i++ )
		{
			var dumfeature = {
				'type': 'Feature',
				'properties': feature['properties'],
				'geometry': geoms[i]
			};
			dumfeature['properties']['style'] = style;
			this.globe.vectorRendererManager.addFeature( dumfeature, style );
		}
	}
	else
	{
		// Add feature to renderers
		this.globe.vectorRendererManager.addFeature(feature,style);
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
	
	if ( this.globe )
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
		this.globe.vectorRendererManager.removeFeature( feature );
		this.globe.renderContext.requestFrame();
	}
}

/**************************************************************************************************************/

/** @export
  Modify feature style
*/
GlobWeb.VectorLayer.prototype.modifyFeatureStyle = function( feature, style )
{
	this.globe.vectorRendererManager.removeFeature( feature );
	this.globe.vectorRendererManager.addFeature( feature, style );
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
