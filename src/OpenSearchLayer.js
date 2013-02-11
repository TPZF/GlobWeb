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
	this.freeRequests = [];
	
	// Build the request objects
	for ( var i =0; i < 2; i++ )
	{
		var xhr = new XMLHttpRequest();		
		this.freeRequests.push( xhr );
	}
	
	// For rendering
	this.pointBucket = null;
	this.polygonBucket = null;
	this.polygonRenderer = null;
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
	this.pointBucket = null;
	this.polygonRenderer = null;
	this.polygonBucket = null;
	
	GlobWeb.BaseLayer.prototype._detach.call(this);
}

/**************************************************************************************************************/

/**
 * 	Launch request to the OpenSearch service
 */
GlobWeb.OpenSearchLayer.prototype.launchRequest = function(tile)
{
	var tileData = tile.extension[this.extId];
	var index = null;
	
	if ( this.freeRequests.length == 0 )
	{
		return;
	}

	// Set that the tile is loading its data for OpenSearch
	tileData.state = GlobWeb.OpenSearchLayer.TileState.LOADING;
	
	var xhr = this.freeRequests.pop();
	
	
	// Build URL
	var url = this.serviceUrl + "/search?order=" + tile.order + "&healpix=" + tile.pixelIndex;
	// TODO : optimize it, not needed to rebuild it for each request
	for (var key in this.requestProperties)
	{
		url+='&'+key+'="'+this.requestProperties[key]+'"';
	}
	
	this.globe.publish("startLoad",this.id);
	
	var self = this;
	xhr.onreadystatechange = function(e)
	{
		if ( xhr.readyState == 4 ) 
		{
			if ( xhr.status == 200 )
			{
				var response = JSON.parse(xhr.response);
				tileData.complete = (response.totalResults == response.features.length);
				self.recomputeFeaturesGeometry(response.features);
				
				for ( var i=0; i < response.features.length; i++ )
				{
					self.addFeature( response.features[i], tile );
				}
			}
			else if ( xhr.status >= 400 )
			{
				console.error( xhr.responseText );
			}
			
			tileData.state = GlobWeb.OpenSearchLayer.TileState.LOADED;
			self.freeRequests.push( xhr );
			self.globe.publish("endLoad",self.id);
		}
	};
	xhr.open("GET", url );
	xhr.send();
}

/**************************************************************************************************************/

/**
 *	Add feature to the layer and to the tile extension
 */
GlobWeb.OpenSearchLayer.prototype.addFeature = function( feature, tile )
{
	var tileData = tile.extension[this.extId];
	var featureData;
	
	// Add feature if it doesn't exist
	if ( !this.featuresSet.hasOwnProperty(feature.properties.identifier) )
	{
		this.features.push( feature );
		featureData = { counter: 1, 
			index: this.features.length-1, 
			tiles: [tile]
		};
		this.featuresSet[feature.properties.identifier] = featureData;
	}
	else
	{
		featureData = this.featuresSet[feature.properties.identifier];
		// Increment the counter for current feature
		featureData.counter++;
		// Store the tile
		featureData.tiles.push(tile);
	}

	
	// Add feature id
	tileData.featureIds.push( feature.properties.identifier );
	
	// Add to renderer
	if ( feature.geometry['type'] == "Point" )
	{
		if (!this.pointRenderer) 
		{
			this.pointRenderer = this.globe.vectorRendererManager.getRenderer("PointSprite"); 
			this.pointBucket = this.pointRenderer.getOrCreateBucket( this, this.style );
		}
		this.pointRenderer.addGeometryToTile( this.pointBucket, feature.geometry, tile );
	} 
	else if ( feature.geometry['type'] == "Polygon" )
	{
		if (!this.polygonRenderer) 
		{
			this.polygonRenderer = this.globe.vectorRendererManager.getRenderer("ConvexPolygon"); 
			this.polygonBucket = this.polygonRenderer.getOrCreateBucket( this, this.style );
		}
		this.polygonRenderer.addGeometryToTile( this.polygonBucket, feature.geometry, tile );
	}
}

/**************************************************************************************************************/

/**
 *	Remove feature from Dynamic OpenSearch layer
 */
GlobWeb.OpenSearchLayer.prototype.removeFeature = function( identifier )
{
	var featureIt = this.featuresSet[identifier];
	
	if (!featureIt) {
		return;
	}
	
	if ( featureIt.counter == 1 )
	{
		// Remove it from the set		
		delete this.featuresSet[identifier];
		
		// Remove it from the array by swapping it with the last feature to optimize removal.
		var lastFeature = this.features.pop();
		if ( featureIt.index < this.features.length ) 
		{
			// Set the last feature at the position of the removed feature
			this.features[ featureIt.index ] = lastFeature;
			// Update its index in the Set.
			this.featuresSet[ lastFeature.properties.identifier ].index = featureIt.index;
		}
	}
	else
	{
		// Just decrease the counter
		featureIt.counter--;
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
		var renderer;
		if ( feature.geometry.type == "Point" ) {
			renderer = this.pointRenderer;
		}
		else if ( feature.geometry.type == "Polygon" ) {
			renderer = this.polygonRenderer;
		}
		
		var newBucket = renderer.getOrCreateBucket(this,style);
		for ( var i = 0; i < featureData.tiles.length; i++ )
		{
			renderer.removeGeometryFromTile(feature.geometry,featureData.tiles[i]);
			renderer.addGeometryToTile(newBucket,feature.geometry,featureData.tiles[i]);
		}
		
	}
}

GlobWeb.OpenSearchLayer.TileState = {
	LOADING: 0,
	LOADED: 1,
	NOT_LOADED: 2
};


/**************************************************************************************************************/

/**
 *	Generate the tile data
 */
GlobWeb.OpenSearchLayer.prototype.generate = function(tile) 
{
	var osData;
	if ( tile.parent )
	{	
		var parentOSData = tile.parent.extension[this.extId];
		osData = new GlobWeb.OpenSearchLayer.OSData(this);
		osData.state = parentOSData.complete ? GlobWeb.OpenSearchLayer.TileState.LOADED : GlobWeb.OpenSearchLayer.TileState.NOT_LOADED;
		osData.complete = parentOSData.complete;
	}
	else
	{
		osData = new GlobWeb.OpenSearchLayer.OSData(this);
	}
	
	// Store in on the tile
	tile.extension[this.extId] = osData;
	
};

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
	this.state = GlobWeb.OpenSearchLayer.TileState.NOT_LOADED;
	this.complete = false;
}

/**************************************************************************************************************/

/**
 * 	Dispose renderable data from tile
 */
GlobWeb.OpenSearchLayer.OSData.prototype.dispose = function( renderContext, tilePool )
{	
	for( var i=0; i<this.featureIds.length; i++ )
	{
		this.layer.removeFeature( this.featureIds[i] );
	}
}

/**************************************************************************************************************/

/**
	Render function
	
	@param tiles The array of tiles to render
 */
GlobWeb.OpenSearchLayer.prototype.render = function( tiles )
{
	if (!this._visible)
		return;
		
	// Load data for the tiles if needed
	for ( var i = 0; i < tiles.length && this.freeRequests.length > 0; i++ )
	{
		var tile = tiles[i];
		if ( tile.order >= this.minOrder )
		{
			var osData = tile.extension[this.extId];
			if ( osData && osData.state == GlobWeb.OpenSearchLayer.TileState.NOT_LOADED ) 
			{
				// Check if the parent is loaded or not, in that case load the parent first
				while ( tile.parent 
					&& tile.parent.order >= this.minOrder 
					&& tile.parent.extension[this.extId].state == GlobWeb.OpenSearchLayer.TileState.NOT_LOADED )
				{
					tile = tile.parent;
				}
				this.launchRequest(tile);
			}
		}
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