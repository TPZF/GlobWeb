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
			<li>proxyUrl : Url of proxy for external pages</li>
			<li>useCluster : Boolean indicating if cluster information is used</li>
		</ul>
*/
GlobWeb.OpenSearchLayer = function(options){
	GlobWeb.BaseLayer.prototype.constructor.call( this, options );
	
	this.serviceUrl = options.serviceUrl;
	this.minOrder = options.minOrder || 5;
	this.proxyUrl = options.proxyUrl || "";
	this.useCluster = options.useCluster || false;
	this.requestProperties = "";

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

	if ( this.useCluster )
	{
		// Configure cluster service options
		this.treshold = options.treshold || 5;
		this.maxOrder = options.maxOrder || 10;
		this.orderDepth = options.orderDepth || 6;
		this.maxClusterOrder = options.maxClusterOrder || 8;

		// Handle distributions
		this.distributions;
		this.clusterServiceUrl;

		this.handleClusterService();

		this.clusterStyle = new GlobWeb.FeatureStyle(this.style);
		this.clusterStyle.iconUrl = options.clusterIconUrl || "css/images/cluster.png";
		this.clusterBucket = null;
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
 *	Get cluster service url from OpenSearch description XML file
 */
GlobWeb.OpenSearchLayer.prototype.handleClusterService = function()
{
	var xhr = new XMLHttpRequest();
	var self = this;
	xhr.onreadystatechange = function(e)
	{
		if ( xhr.readyState == 4 ) 
		{
			if ( xhr.status == 200 )
			{
				var urls = xhr.responseXML.getElementsByTagName("Url");
				// Find rel=clusterdesc url
				for ( var i=0; i<urls.length; i++ )
				{
					if ( urls[i].attributes.getNamedItem("rel") && urls[i].attributes.getNamedItem("rel").nodeValue == "clusterdesc" )
					{
						// Get clusterdesc template
						var describeUrl = urls[i].attributes.getNamedItem("template").nodeValue;
						
						if ( describeUrl )
						{
							// Cut inused data
							var splitIndex = describeUrl.indexOf( "q=" );
							if ( splitIndex != -1 )
							{
								self.clusterServiceUrl = describeUrl.substring( 0, splitIndex );
							}
							else
							{
								self.clusterServiceUrl =  describeUrl;
							}
							self.updateDistributions();
						}
						break;
					}
				}
				if ( i == urls.length )
				{
					// Cluster description doesn't exist
					self.useCluster = false;
				}
			}
		}
	};
	xhr.open("GET", this.serviceUrl );
	xhr.send();
}

/**************************************************************************************************************/

/**
 *	Update cluster distribution
 */
GlobWeb.OpenSearchLayer.prototype.updateDistributions = function()
{
	var xhr = new XMLHttpRequest();
	var url = this.clusterServiceUrl + this.requestProperties;
	var self = this;
	xhr.onreadystatechange = function(e)
	{
		if ( xhr.readyState == 4 ) 
		{
			if ( xhr.status == 200 )
			{
				var response = JSON.parse(xhr.response);
				self.handleDistribution(response);
			}
		}
	};
	xhr.open("GET", url );
	xhr.send();
}

/**************************************************************************************************************/

/**
 *	Handle SOLR distribution response
 *
 *	@param response SOLR response
 *	@param distributions Distributions ClusterManager variable
 */
GlobWeb.OpenSearchLayer.prototype.handleDistribution = function(response)
{
	var distributions = {};
	var facet_fields = response.facet_counts.facet_fields;
	var order = 3;
	for (var key in facet_fields)
	{
		distributions[order] = {};
		for (var i=0; i<facet_fields[key].length; i+=2)
		{
			distributions[order][facet_fields[key][i]] = facet_fields[key][i+1];
		}
		order++;
	}
	this.distributions = distributions;
}

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
	if ( this.useCluster )
	{
		this.clusterBucket = null;
	}
	this.polygonRenderer = null;
	this.polygonBucket = null;
	
	GlobWeb.BaseLayer.prototype._detach.call(this);
}

/**************************************************************************************************************/

/**
 *	Adding cluster geometry to renderer
 *
 *	@param pixelIndex Pixel index
 *	@param order Pixel order
 *	@param face Face of pixel
 *	@param pixelDistribution Number of features in cluster
 */
GlobWeb.OpenSearchLayer.prototype.addCluster = function(pixelIndex, order, face, pixelDistribution, tile)
{
	
	// Create geometry
	var nside = Math.pow(2, order);
	var pix=pixelIndex&(nside*nside-1);
	var ix = GlobWeb.HEALPixBase.compress_bits(pix);
	var iy = GlobWeb.HEALPixBase.compress_bits(pix>>>1);
	var center = GlobWeb.HEALPixBase.fxyf((ix+0.5)/nside, (iy+0.5)/nside, face);

	var geo = GlobWeb.CoordinateSystem.from3DToGeo( center );
	var pos3d = center;
	var vertical = vec3.create();
	vec3.normalize(pos3d, vertical);
	
	var geometry = {
		coordinates: geo,
		type: "Point"
	};

	// Create renderable
	var identifier = order+"_"+pixelIndex;
	var feature = {
		geometry: geometry,
		properties: {
			featureNum: pixelDistribution,
			identifier: identifier,
			title: "Cluster("+pixelDistribution+")",
			order: order,
			pixelIndex: pixelIndex,
			style: new GlobWeb.FeatureStyle(this.clusterStyle)
		},
		cluster : true
	};
	tile.extension[this.extId].containsCluster = true;
	this.addFeature( feature, tile );
}

/**************************************************************************************************************/

/**
 *	Compute clusters and launch request for point features if needed
 */
GlobWeb.OpenSearchLayer.prototype.computeClusters = function(tile)
{
	var pixelIndicesToRequest = [];
	
	if ( tile.order < this.maxClusterOrder )
	{
		var orderDepth = this.maxOrder - tile.order;
		var childOrder = this.maxOrder;

		if( this.distributions && this.distributions[childOrder] )
		{
			// Distribution exists
			var numSubTiles = Math.pow(4,orderDepth); // Number of subtiles depending on order
			var firstSubTileIndex = tile.pixelIndex * numSubTiles;

			for ( var j=firstSubTileIndex; j<firstSubTileIndex+numSubTiles; j++ )
			{
				var pixelDistribution = this.distributions[childOrder][j];
				if ( pixelDistribution > this.treshold )
				{
					// Cluster child
					this.addCluster(j, this.maxOrder, tile.face, pixelDistribution, tile);
				}
				else if ( pixelDistribution > 0 )
				{
					// Feature containing child
					pixelIndicesToRequest.push(j);
				}
			}
		}

		if ( pixelIndicesToRequest.length > 0 )
		{
			this.launchRequest( tile, childOrder, pixelIndicesToRequest );
		}
		else 
		{
			if ( !tile.extension[this.extId].containsCluster )
			{
				// Empty tile
				tile.extension[this.extId].complete = true;
				// HACK to avoid multiple rendering of parent features
				tile.extension.pointSprite = new GlobWeb.PointSpriteRenderer.TileData();
			}
			tile.extension[this.extId].state = GlobWeb.OpenSearchLayer.TileState.LOADED;
		}
	}
	else
	{
		this.launchRequest(tile, tile.order, [tile.pixelIndex]);
	}
}

/**************************************************************************************************************/

/**
 *	Update children state as inherited from parent
 */
GlobWeb.OpenSearchLayer.prototype.updateChildrenState = function(tile)
{
	if ( tile.children )
	{
		// Dispose children resources, and then delete its children
		for (var i = 0; i < 4; i++)
		{
			if ( tile.children[i].extension[this.extId] )
				tile.children[i].extension[this.extId].state = GlobWeb.OpenSearchLayer.TileState.INHERIT_PARENT;
			this.updateChildrenState(tile.children[i]);
		}
	}
}

/**************************************************************************************************************/

/**
 * 	Launch request to the OpenSearch service
 */
GlobWeb.OpenSearchLayer.prototype.launchRequest = function(tile, childOrder, pixelIndicesToRequest)
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
	var url;
	if ( this.useCluster )
	{
		var indices = "";
		for ( var i=0; i<pixelIndicesToRequest.length-1; i++ )
		{
			indices+=pixelIndicesToRequest[i]+",";
		}
		indices+=pixelIndicesToRequest[i];
		url = this.serviceUrl + "/search?order=" + childOrder + "&healpix=" + indices;
	}
	else
	{
		url = this.serviceUrl + "/search?order=" + tile.order + "&healpix=" + tile.pixelIndex;
	}

	if ( this.requestProperties != "" )
	{
		url += '&' + this.requestProperties;
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

				if ( !tileData.containsCluster )
				{
					tileData.complete = (response.totalResults == response.features.length);
					
					// Update children state
					if ( tileData.complete )
					{
						self.updateChildrenState(tile);
					}
				}

				self.recomputeFeaturesGeometry(response.features);
				
				if ( response.features.length > 0 )
				{
					for ( var i=0; i < response.features.length; i++ )
					{
						self.addFeature( response.features[i], tile );
					}
				}
				else
				{
					// HACK to avoid multiple rendering of parent features
					tile.extension.pointSprite  = new GlobWeb.PointSpriteRenderer.TileData();
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
 * 	Set new request properties
 */
GlobWeb.OpenSearchLayer.prototype.setReqestProperties = function(properties)
{
	// Clean old results
	var self = this;
	this.globe.tileManager.visitTiles( function(tile) {
		if( tile.extension[self.extId] )
		{
			tile.extension[self.extId].dispose();
			delete tile.extension[self.extId];
		}
	});

	// TODO clean renderers

	// Set request properties
	this.requestProperties = "";
	for (var key in properties)
	{
		if ( this.requestProperties != "" )
			this.requestProperties += '&'
		this.requestProperties += key+'="'+properties[key]+'"';
	}

	// Reset distributions
	this.distributions = null;
	this.updateDistributions();
	
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
			if ( this.useCluster )
			{
				this.clusterBucket = this.pointRenderer.getOrCreateBucket( this, this.clusterStyle );
			}
		}
		this.pointRenderer.addGeometryToTile( (feature.cluster ? this.clusterBucket : this.pointBucket), feature.geometry, tile );
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
	NOT_LOADED: 2,
	INHERIT_PARENT: 3
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
		osData.state = parentOSData.complete ? GlobWeb.OpenSearchLayer.TileState.INHERIT_PARENT : GlobWeb.OpenSearchLayer.TileState.NOT_LOADED;
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

				// Skip loading parent
				if ( tile.parent && tile.parent.extension[this.extId].state == GlobWeb.OpenSearchLayer.TileState.LOADING )
					continue;

				if ( this.useCluster )
				{
					this.computeClusters(tile);
				}
				else
				{
					this.launchRequest(tile);
				}
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