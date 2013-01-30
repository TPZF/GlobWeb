/**************************************
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

/**	@constructor
 * 	@class
 * 	OpenSearch dynamic layer
 * 	
 * 	@param options Configuration options
 * 		<ul>
			<li>serviceUrl : Url of OpenSearch description XML file(necessary option)</li>
			<li>minOrder : Starting order for OpenSearch requests</li>
			<li>displayProperties : Properties which will be shown in priority</li>
			<li>proxyUrl : Url of proxy for external pages(ex: "/sitools/proxy?external_url=")</li>
		</ul>
*/
GlobWeb.OpenSearchLayer = function(options){
	GlobWeb.BaseLayer.prototype.constructor.call( this, options );
	
	this.serviceUrl = options.serviceUrl;
	this.minOrder = options.minOrder || 5;
	this.proxyUrl = options.proxyUrl || "";

	// Set style
	if ( options && options['style'] )
	{
		this.style = options['style'];
	}
	else
	{
		this.style = new GlobWeb.FeatureStyle();
	}
	
	// TODO "os" is overriden by BaseLayer id when attached by globe
	this.extId = "os";

	// Used for picking management
	this.features = [];
	// Counter set, indicates how many times the feature has been requested
	this.featuresSet = {};

	// Maximum two requests for now
	this.requests = [ null, null ];
	
	// For rendering
	this.bucket = null;
	this.lineRenderer = null;
	this.pointRenderer = null;
}

/**************************************************************************************************************/

GlobWeb.inherits( GlobWeb.BaseLayer, GlobWeb.OpenSearchLayer );

/**************************************************************************************************************/

/**
 * 	Attach the layer to the globe
 * 
 * 	@param g The globe
 */
GlobWeb.OpenSearchLayer.prototype._attach = function( g )
{
	GlobWeb.BaseLayer.prototype._attach.call( this, g );

	this.extId += this.id;
	
	this.pointRenderer = new GlobWeb.PointRenderer( g.tileManager );
	this.lineRenderer = new GlobWeb.SimpleLineRenderer( g.tileManager );
	this.polygonRenderer = new GlobWeb.SimplePolygonRenderer( g.tileManager );
	this.bucket = this.pointRenderer.getOrCreateBucket( this, this.style );
	g.tileManager.addPostRenderer(this);
}

/**************************************************************************************************************/

/** 
  Detach the layer from the globe
 */
GlobWeb.OpenSearchLayer.prototype._detach = function()
{
	this.globe.tileManager.removePostRenderer(this);
	this.pointRenderer = null;
	this.bucket = null;
	
	GlobWeb.BaseLayer.prototype._detach.call(this);
}

/**************************************************************************************************************/

/**
 * 	Launch request to the OpenSearch service
 */
GlobWeb.OpenSearchLayer.prototype.launchRequest = function(tile)
{
	var index = null;

	for ( var i = 0; i < this.requests.length; i++ )
	{
		if ( !this.requests[i] )
		{
			this.requests[i] = tile;
			index = i;
			break;
		}
	}
	
	var self = this;
	if (index)
	{	
		var url = self.serviceUrl + "/search?order=" + tile.order + "&healpix=" + tile.pixelIndex;
		for (var key in this.requestProperties)
		{
			url+='&'+key+'="'+this.requestProperties[key]+'"';
		}
		var requestProperties = this.requestProperties;
		self.globe.publish("startLoad",self.id);
		$.ajax({
			type: "GET",
			url: url,
			success: function(response){
				// Request properties didn't change
				tile.extension[self.extId] = new GlobWeb.OpenSearchLayer.OSData(self);
				tile.extension[self.extId].complete = (response.totalResults == response.features.length);

				self.recomputeFeaturesGeometry(response.features);
				
				for ( var i=0; i<response.features.length; i++ )
				{
					self.addFeature( response.features[i], tile );
				}
			},
			error: function (xhr, ajaxOptions, thrownError) {
				console.error( xhr.responseText );
			},
			complete: function(xhr) {
				self.requests[index] = null;
				self.globe.publish("endLoad",self.id);
			}
		});
	}
}

/**************************************************************************************************************/

/*
	Create a renderable from the geometry
 */
GlobWeb.OpenSearchLayer.prototype.createRenderable = function(geometry)
{
	if ( geometry['type'] == "Point" )
	{
		var pos3d = GlobWeb.CoordinateSystem.fromGeoTo3D( geometry['coordinates'] );
		var vertical = vec3.create();
		vec3.normalize(pos3d, vertical);
		
		var pointRenderData = {
			geometry: geometry,
			pos3d: pos3d,
			vertical: vertical,
			color: this.style.fillColor
		};
		return pointRenderData;
	} 
	else if ( geometry['type'] == "Polygon" )
	{
		this.lineRenderer.addGeometry(geometry,this,this.style);
		var renderable = this.lineRenderer.renderables[ this.lineRenderer.renderables.length-1 ];
		return {
			line: renderable,
			polygon: null,
			style: renderable.style
		};
	}
}

/**************************************************************************************************************/

/**
 *	Add feature to the layer and to the tile extension
 */
GlobWeb.OpenSearchLayer.prototype.addFeature = function( feature, tile )
{
	var renderable;
	
	// Add feature if it doesn't exist
	if ( !this.featuresSet[feature.properties.identifier] )
	{
		this.features.push( feature );
		renderable = this.createRenderable( feature.geometry );
		this.featuresSet[feature.properties.identifier] =  { counter: 1, renderable: renderable };
	}
	else
	{
		// Increment the number of requests for current feature
		var featureData = this.featuresSet[feature.properties.identifier];
		featureData.counter++;
		renderable = featureData.renderable;
	}

	var tileData = tile.extension[this.extId];
	
	// Add feature id
	tileData.featureIds.push( feature.properties.identifier );
	
	// Add feature renderable
	if ( feature.geometry['type'] == "Point" )
	{
		tileData.points.push( renderable );
	}
	else if ( feature.geometry['type'] == "Polygon" )
	{
		tileData.polygons.push( renderable );
	}
}

/**************************************************************************************************************/

/**
 *	Remove feature from Dynamic OpenSearch layer
 */
GlobWeb.OpenSearchLayer.prototype.removeFeature = function( geometry, identifier )
{
	// BUG ! Children tiles don't dispose their extension resources
	if ( this.featuresSet[identifier].counter == 1 )
	{
		// Last feature
		delete this.featuresSet[identifier];
		for ( var i = 0; i<this.features.length; i++ )
		{
			var currentFeature = this.features[i];
			if ( currentFeature.properties.identifier == identifier){
				this.features.splice(i, 1);
			}
		}
	}
	else
	{
		// Decrease
		this.featuresSet[identifier].counter--;
	}
}

/**************************************************************************************************************/

/**
 *	Modify feature style
 */
GlobWeb.OpenSearchLayer.prototype.modifyFeatureStyle = function( feature, style ) {

	feature.properties.style = style;
	var featureData = this.featuresSet[feature.properties.identifier];
	if ( featureData )
	{
		var renderable = featureData.renderable;
		
		// TODO : a little bit hackish, should try to merge renderable attributes in GlobWeb between PointRenderer and Simple'Line'Renderer
		if ( renderable.color ) {
			renderable.color = style.fillColor;
		}
		else if ( renderable.style ) {
			if ( style.fill ) {
				this.polygonRenderer.addGeometry(feature.geometry,this,style);
				renderable.polygon = this.polygonRenderer.renderables[ this.polygonRenderer.renderables.length-1 ];
			}
			renderable.style = style;
			renderable.line.style = style;
		}
	}
}

/**************************************************************************************************************/


/**
 *	@constructor
 *	DynamicOSLayer.OSData constructor
 *
 *	OpenSearch renderable
 */
GlobWeb.OpenSearchLayer.OSData = function(layer)
{
	this.layer = layer;
	this.featureIds = []; // exclusive parameter to remove from layer
	this.points = [];
	this.polygons = [];
	this.complete = false;
}

/**************************************************************************************************************/

/**
 * 	Dispose renderable data from tile
 *	
 */
GlobWeb.OpenSearchLayer.OSData.prototype.dispose = function( renderContext, tilePool )
{	
	for( var i=0; i<this.points.length; i++ )
	{
		this.layer.removeFeature(this.points[i].geometry, this.featureIds[i] );
	}
		
	this.points.length = 0;
}

/**************************************************************************************************************/

/*
	Render function
	
	@param tiles The array of tiles to render
 */
GlobWeb.OpenSearchLayer.prototype.render = function( tiles )
{
	if (!this._visible)
		return;
		
	// Traverse the tiles to find all available data, and request data for needed tiles
	
	var points = [];
	var lines = [];
	var polygons = [];
	var visitedTiles = {};
	
	for ( var i = 0; i < tiles.length; i++ )
	{
		var tile = tiles[i];
		if ( tile.order >= this.minOrder )
		{
			var tileData = tile.extension[this.extId];
			if( !tileData )
			{				
				// Search for available data on tile parent
				var completeDataFound = false;
				var prevVisitTile = tile;
				var visitTile = tile.parent;
				while ( visitTile && visitTile.order >= this.minOrder )
				{
					tileData = visitTile.extension[this.extId];
					if ( tileData )
					{
						completeDataFound = tileData.complete;
						var key = visitTile.order + "_" + visitTile.pixelIndex;
						if ( visitedTiles.hasOwnProperty(key) )	
						{
							tileData = null;
						}
						else 
						{
							visitedTiles[key] = true;
						}
						visitTile = null;
						
					}
					else 
					{
						prevVisitTile = visitTile;
						visitTile = visitTile.parent;
					}
				}
				
				// Only request the file if needed, ie if a parent does not already contains all data
				if ( !completeDataFound && (prevVisitTile.state != GlobWeb.Tile.State.NONE) )
				{
					this.launchRequest(prevVisitTile);
				}
			}
			
			// We have found some available tile data, add it to the current renderables
			if ( tileData )
			{
				if ( tileData.points.length > 0 )
					points = points.concat( tileData.points );
					
				for ( var n = 0; n < tileData.polygons.length; n++ ) {
					lines.push( tileData.polygons[n].line );
					if ( tileData.polygons[n].style.fill ) {
						polygons.push( tileData.polygons[n].polygon );							
					}
				}
			}
		}
	}
	
	
	// Render the points
	if ( points.length > 0 )
	{
		this.bucket.points = points;
		this.pointRenderer.render();
	}
	
	// Render the lines
	if ( lines.length > 0 )
	{
		this.lineRenderer.renderables = lines;
		this.lineRenderer.render();
	}
	
	// Render the polygons
	if ( polygons.length > 0 )
	{
		this.polygonRenderer.renderables = polygons;
		this.polygonRenderer.render();
	}
}

/**************************************************************************************************************/

/**
 * 	Recompute geometry from equatorial coordinates to geo for each feature
 */
GlobWeb.OpenSearchLayer.prototype.recomputeFeaturesGeometry = function( features )
{
	for ( var i=0; i<features.length; i++ )
	{
		var currentFeature = features[i];
		
		switch ( currentFeature.geometry.type )
		{
			case "Point":
				if ( currentFeature.geometry.coordinates[0] > 180 )
					currentFeature.geometry.coordinates[0] -= 360;
				break;
			case "Polygon":
				var ring = currentFeature.geometry.coordinates[0];
				for ( var j = 0; j < ring.length; j++ )
				{
					if ( ring[j][0] > 180 )
						ring[j][0] -= 360;
				}
				// Add proxy url to quicklook url if not local
				if ( this.proxyUrl && currentFeature.properties.quicklook && currentFeature.properties.quicklook.substring(0,4) == 'http' )
					currentFeature.properties.quicklook = this.proxyUrl+currentFeature.properties.quicklook;
				break;
			default:
				break;
		}
	}
}

/*************************************************************************************************************/