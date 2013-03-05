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
		</ul>
*/
GlobWeb.OpenSearchLayer = function(options){
	GlobWeb.BaseLayer.prototype.constructor.call( this, options );
	
	this.serviceUrl = options.serviceUrl;
	this.minOrder = options.minOrder || 5;
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
 *	Update children state as inherited from parent
 */
GlobWeb.OpenSearchLayer.prototype.updateChildrenState = function(tile)
{
	if ( tile.children )
	{
		for (var i = 0; i < 4; i++)
		{
			if ( tile.children[i].extension[this.extId] )
			{
				tile.children[i].extension[this.extId].state = GlobWeb.OpenSearchLayer.TileState.INHERIT_PARENT;
				tile.children[i].extension[this.extId].complete = true;
			}
			this.updateChildrenState(tile.children[i]);
		}
	}
}

/**************************************************************************************************************/

/**
 * 	Launch request to the OpenSearch service
 */
GlobWeb.OpenSearchLayer.prototype.launchRequest = function(tile, url)
{
	var tileData = tile.extension[this.extId];
	var index = null;
	
	if ( this.freeRequests.length == 0 )
	{
		return;
	}
	
	// Set that the tile is loading its data for OpenSearch
	tileData.state = GlobWeb.OpenSearchLayer.TileState.LOADING;

	// Add request properties to length
	if ( this.requestProperties != "" )
	{
		url += '&' + this.requestProperties;
	}
		
	var xhr = this.freeRequests.pop();
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
					
				// Update children state
				if ( tileData.complete )
				{
					self.updateChildrenState(tile);
				}

				self.updateFeatures(response.features);
				
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
					tile.extension.pointSprite  = new GlobWeb.RendererTileData();
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
GlobWeb.OpenSearchLayer.prototype.setRequestProperties = function(properties)
{
	// clean renderers
	for ( var x in this.featuresSet )
	{
		var featureData = this.featuresSet[x];
		for ( var i=0; i<featureData.tiles.length; i++ )
		{
			var tile = featureData.tiles[i];
			var feature = this.features[featureData.index];
			this.removeFeatureFromRenderer( feature, tile );
		}
	}

	// Clean old results
	var self = this;
	this.globe.tileManager.visitTiles( function(tile) {
		if( tile.extension[self.extId] )
		{
			tile.extension[self.extId].dispose();
			tile.extension[self.extId].featureIds = []; // exclusive parameter to remove from layer
			tile.extension[self.extId].state = GlobWeb.OpenSearchLayer.TileState.NOT_LOADED;
			tile.extension[self.extId].complete = false;
		}
	});
	this.featuresSet = {};
	this.features = [];

	// Set request properties
	this.requestProperties = "";
	for (var key in properties)
	{
		if ( this.requestProperties != "" )
			this.requestProperties += '&'
		this.requestProperties += key+'='+properties[key];
	}
	
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
		featureData = { index: this.features.length-1, 
			tiles: [tile]
		};
		this.featuresSet[feature.properties.identifier] = featureData;
	}
	else
	{
		featureData = this.featuresSet[feature.properties.identifier];
		
		// Always use the base feature to manage geometry indices
		feature = this.features[ featureData.index ];
		
		// DEBUG : check tile is only present one time
		var isTileExists = false;
		for ( var i = 0; i < featureData.tiles.length; i++ )
		{
			if ( tile.order == featureData.tiles[i].order
			&& tile.pixelIndex == featureData.tiles[i].pixelIndex  )
			{
				isTileExists = true;
				console.log('OpenSearchLayer internal error : tile already there! ' + tile.order + ' ' + tile.pixelIndex  );
			}
		}
		
		if (!isTileExists)
		{
			// Store the tile
			featureData.tiles.push(tile);
		}
	}
	
	// Add feature id
	tileData.featureIds.push( feature.properties.identifier );
	
	// Set the identifier on the geometry
	feature.geometry.gid = feature.properties.identifier;

	// Add to renderer
	this.addFeatureToRenderer(feature, tile);
}

/**************************************************************************************************************/

/**
 *	Add feature to renderer
 */
GlobWeb.OpenSearchLayer.prototype.addFeatureToRenderer = function( feature, tile )
{
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
 *	Remove feature from renderer
 */
GlobWeb.OpenSearchLayer.prototype.removeFeatureFromRenderer = function( feature, tile )
{
	if ( feature.geometry['type'] == "Point" )
	{
		this.pointRenderer.removeGeometryFromTile( feature.geometry, tile );
	} 
	else if ( feature.geometry['type'] == "Polygon" )
	{
		this.polygonRenderer.removeGeometryFromTile( feature.geometry, tile );
	}
}

/**************************************************************************************************************/

/**
 *	Remove feature from Dynamic OpenSearch layer
 */
GlobWeb.OpenSearchLayer.prototype.removeFeature = function( identifier, tile )
{
	var featureIt = this.featuresSet[identifier];
	
	if (!featureIt) {
		return;
	}
	
	// Remove tile from array
	var tileIndex = featureIt.tiles.indexOf(tile);
	if ( tileIndex >= 0 )
	{
		featureIt.tiles.splice(tileIndex,1);
	}
	else
	{
		console.log('OpenSearchLayer internal error : tile not found when removing feature');
	}
	
	if ( featureIt.tiles.length == 0 )
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
	// Create data for the layer
	// Check that it has not been created before (it can happen with level 0 tile)
	var osData = tile.extension[this.extId];
	if ( !osData )
	{
		if ( tile.parent )
		{	
			var parentOSData = tile.parent.extension[this.extId];
			osData = new GlobWeb.OpenSearchLayer.OSData(this,tile);
			osData.state = parentOSData.complete ? GlobWeb.OpenSearchLayer.TileState.INHERIT_PARENT : GlobWeb.OpenSearchLayer.TileState.NOT_LOADED;
			osData.complete = parentOSData.complete;
		}
		else
		{
			osData = new GlobWeb.OpenSearchLayer.OSData(this,tile);
		}
		
		// Store in on the tile
		tile.extension[this.extId] = osData;
	}
	
};

/**************************************************************************************************************/


/**
 *	@constructor
 *	DynamicOSLayer.OSData constructor
 *
 *	OpenSearch renderable
 */
GlobWeb.OpenSearchLayer.OSData = function(layer,tile)
{
	this.layer = layer;
	this.tile = tile;
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
	for( var i = 0; i < this.featureIds.length; i++ )
	{
		this.layer.removeFeature( this.featureIds[i], this.tile );
	}
	this.tile = null;
}

/**************************************************************************************************************/

/**
 *	Build request url
 */
GlobWeb.OpenSearchLayer.prototype.buildUrl = function( tile )
{
	return url = this.serviceUrl + "/search?order=" + tile.order + "&healpix=" + tile.pixelIndex;
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
			if ( !osData || osData.state == GlobWeb.OpenSearchLayer.TileState.NOT_LOADED ) 
			{
				// Check if the parent is loaded or not, in that case load the parent first
				while ( tile.parent 
					&& tile.parent.order >= this.minOrder 
					&& tile.parent.extension[this.extId]
					&& tile.parent.extension[this.extId].state == GlobWeb.OpenSearchLayer.TileState.NOT_LOADED )
				{
					tile = tile.parent;
				}
				
				if ( tile.extension[this.extId] && tile.extension[this.extId].state == GlobWeb.OpenSearchLayer.TileState.NOT_LOADED )
				{
					// Skip loading parent
					if ( tile.parent && tile.parent.extension[this.extId].state == GlobWeb.OpenSearchLayer.TileState.LOADING )
						continue;

					var url = this.buildUrl(tile);
					if ( url )
					{
						this.launchRequest(tile, url);
					}
				}
			}
		}
	}
}

/**************************************************************************************************************/

/**
 * 	Update features
 */
GlobWeb.OpenSearchLayer.prototype.updateFeatures = function( features )
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
				break;
			default:
				break;
		}
	}
}

/*************************************************************************************************************/