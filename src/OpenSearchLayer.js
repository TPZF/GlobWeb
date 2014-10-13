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

 define(['./FeatureStyle','./VectorRendererManager','./Utils','./BaseLayer','./RendererTileData', './Tile'],
	function(FeatureStyle,VectorRendererManager,Utils,BaseLayer,RendererTileData, Tile) {

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
			<li>invertY : a boolean, if set all the image data of current layer is flipped along the vertical axis</li>
		</ul>
*/
var OpenSearchLayer = function(options){
	BaseLayer.prototype.constructor.call( this, options );
	
	this.serviceUrl = options.serviceUrl;
	this.minOrder = options.minOrder || 5;
	this.maxRequests = options.maxRequests || 2;
	this.requestProperties = "";
	this.invertY = options.invertY || false;
	this.coordSystemRequired = options.hasOwnProperty('coordSystemRequired') ? options.coordSystemRequired : true;

	// Set style
	if ( options && options['style'] )
	{
		this.style = options['style'];
	}
	else
	{
		this.style = new FeatureStyle();
	}
	
	this.extId = "os";

	// Used for picking management
	this.features = [];
	// Counter set, indicates how many times the feature has been requested
	this.featuresSet = {};

	// Maximum two requests for now
	this.freeRequests = [];
	this.tilesToLoad = [];
	
	// Build the request objects
	for ( var i =0; i < this.maxRequests; i++ )
	{
		var xhr = new XMLHttpRequest();
		this.freeRequests.push( xhr );
	}
}

/**************************************************************************************************************/

Utils.inherits( BaseLayer, OpenSearchLayer );

/**************************************************************************************************************/

/**
 * 	Attach the layer to the globe
 * 
 * 	@param g The globe
 */
OpenSearchLayer.prototype._attach = function( g )
{
	BaseLayer.prototype._attach.call( this, g );
	this.extId += this.id;
	g.tileManager.addPostRenderer(this);
}

/**************************************************************************************************************/

/** 
  Detach the layer from the globe
 */
OpenSearchLayer.prototype._detach = function()
{
	this.globe.tileManager.removePostRenderer(this);	
	BaseLayer.prototype._detach.call(this);
}

/**************************************************************************************************************/

/**
 * 	Launch request to the OpenSearch service
 */
OpenSearchLayer.prototype.launchRequest = function(tile, url)
{
	var tileData = tile.extension[this.extId];
	var index = null;
	
	if ( this.freeRequests.length == 0 )
	{
		return;
	}
	
	// Set that the tile is loading its data for OpenSearch
	tileData.state = OpenSearchLayer.TileState.LOADING;

	// Add request properties to length
	if ( this.requestProperties != "" )
	{
		url += '&' + this.requestProperties;
	}
		
	// Pusblish the start load event, only if there is no pending requests
	if ( this.maxRequests == this.freeRequests.length )
	{
		this.globe.publish("startLoad",this);
	}
	
	var xhr = this.freeRequests.pop();
	var self = this;
	xhr.onreadystatechange = function(e)
	{
		if ( xhr.readyState == 4 ) 
		{
			if ( xhr.status == 200 )
			{

				var response = JSON.parse(xhr.response);

				tileData.complete = (response.totalResults == response.features.length);
					
				self.updateFeatures(response.features);
				
				for ( var i=response.features.length-1; i >= 0; i-- )
				{
					var feature = response.features[i];
					// Eliminate already added features from response
					var alreadyAdded = self.featuresSet.hasOwnProperty(feature.properties.identifier);
					if ( alreadyAdded )
						response.features.splice(i, 1);

					self.addFeature( feature, tile );
				}
				self.globe.refresh();
			}
			else if ( xhr.status >= 400 )
			{
				tileData.complete = true;
				console.error( xhr.responseText );
			}
			
			tileData.state = OpenSearchLayer.TileState.LOADED;
			self.freeRequests.push( xhr );
			
			// Publish event that layer have received new features
			if ( response.features.length > 0 )
			{
				self.publish("features:added", {layer: self, features: response.features});
			}

			// Publish the end load event, only if there is no pending requests
			if ( self.maxRequests == self.freeRequests.length )
			{
				self.globe.publish("endLoad",self);
			}
		}
	};
	xhr.open("GET", url );
	xhr.send();
}

/**************************************************************************************************************/

/**
 * 	Set new request properties
 */
OpenSearchLayer.prototype.setRequestProperties = function(properties)
{
	// clean renderers
	for ( var x in this.featuresSet )
	{
		var featureData = this.featuresSet[x];
		for ( var i=0; i<featureData.tiles.length; i++ )
		{
			var tile = featureData.tiles[i];
			var feature = this.features[featureData.index];
			this.globe.vectorRendererManager.removeGeometryFromTile(this,feature.geometry,tile);
		}
	}

	// Clean old results
	var self = this;
	this.globe.tileManager.visitTiles( function(tile) {
		if( tile.extension[self.extId] )
		{
			tile.extension[self.extId].dispose();
			tile.extension[self.extId].featureIds = []; // exclusive parameter to remove from layer
			tile.extension[self.extId].state = OpenSearchLayer.TileState.NOT_LOADED;
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
OpenSearchLayer.prototype.addFeature = function( feature, tile )
{
	var tileData = tile.extension[this.extId];
	var featureData;
	
	// Add feature if it doesn't exist
	if ( !this.featuresSet.hasOwnProperty(feature.properties.identifier) )
	{
		this.features.push( feature );
		featureData = {
			index: this.features.length-1, 
			tiles: [tile]
		};
		this.featuresSet[feature.properties.identifier] = featureData;
	}
	else
	{
		featureData = this.featuresSet[feature.properties.identifier];
		
		// Store the tile
		featureData.tiles.push(tile);

		// Always use the base feature to manage geometry indices
		feature = this.features[ featureData.index ];
	}
	
	// Add feature id
	tileData.featureIds.push( feature.properties.identifier );
	
	// Set the identifier on the geometry
	feature.geometry.gid = feature.properties.identifier;

	// Add to renderer
	//this.addFeatureToRenderer(feature, tile);
	
	// MS: Feature could be added from ClusterOpenSearch which have features with different styles
	var style = feature.properties.style ? feature.properties.style : this.style;

	this.globe.vectorRendererManager.addGeometryToTile(this, feature.geometry, style, tile);
}


/**************************************************************************************************************/

/**
 *	Remove feature from Dynamic OpenSearch layer
 */
OpenSearchLayer.prototype.removeFeature = function( identifier, tile )
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
OpenSearchLayer.prototype.modifyFeatureStyle = function( feature, style )
{
	feature.properties.style = style;
	var featureData = this.featuresSet[feature.properties.identifier];
	if ( featureData )
	{
		for ( var i = 0; i < featureData.tiles.length; i++ )
		{
			var tile = featureData.tiles[i];
			this.globe.vectorRendererManager.removeGeometryFromTile(feature.geometry,tile);
			this.globe.vectorRendererManager.addGeometryToTile(this,feature.geometry,style,tile);
		}
		
	}
}

OpenSearchLayer.TileState = {
	LOADING: 0,
	LOADED: 1,
	NOT_LOADED: 2,
	INHERIT_PARENT: 3
};


/**************************************************************************************************************/

/**
 *	Generate the tile data
 */
OpenSearchLayer.prototype.generate = function(tile) 
{
	if ( tile.order == this.minOrder )
	{
		tile.extension[this.extId] = new OSData(this,tile,null);
	}
	
};

/**************************************************************************************************************/

/**
 *	OpenSearch renderable
 */

var OSData = function(layer,tile,p)
{
	this.layer = layer;
	this.parent = p;
	this.tile = tile;
	this.featureIds = []; // exclusive parameter to remove from layer
	this.state = OpenSearchLayer.TileState.NOT_LOADED;
	this.complete = false;
	this.childrenCreated = false;
}

/**************************************************************************************************************/

/**
 * Traverse 
 */
OSData.prototype.traverse = function( tile )
{
	if (!this.layer._visible)
		return;
		
	if (tile.state != Tile.State.LOADED)
		return;

	// Check if the tile need to be loaded
	if ( this.state == OpenSearchLayer.TileState.NOT_LOADED )
	{
		this.layer.tilesToLoad.push( this );
	}
	
	// Create children if needed
	if ( this.state == OpenSearchLayer.TileState.LOADED && !this.complete
			&&  tile.state == Tile.State.LOADED && tile.children && !this.childrenCreated )
	{
		for ( var i = 0; i < 4; i++ )
		{
			if (!tile.children[i].extension[this.layer.extId])
				tile.children[i].extension[this.layer.extId] = new OSData(this.layer,tile.children[i],this);
		}
		this.childrenCreated = true;
	
		
		// HACK : set renderable to have children
		var renderables = tile.extension.renderer ? tile.extension.renderer.renderables : [];
		for ( var i=0; i<renderables.length; i++ )
		{
			if ( renderables[i].bucket.layer == this.layer )
				renderables[i].hasChildren = true;
		}
	}
}

/**************************************************************************************************************/

/**
 * 	Dispose renderable data from tile
 */
OSData.prototype.dispose = function( renderContext, tilePool )
{
	if (this.parent && this.parent.childrenCreated)
	{
		this.parent.childrenCreated = false;
		// HACK : set renderable to not have children!
		var renderables = this.parent.tile.extension.renderer ? this.parent.tile.extension.renderer.renderables : [];
		for ( var i=0; i<renderables.length; i++ )
		{
			if ( renderables[i].bucket.layer == this.layer )
				renderables[i].hasChildren = false;
		}
	}
	
	for( var i = 0; i < this.featureIds.length; i++ )
	{
		this.layer.removeFeature( this.featureIds[i], this.tile );
	}
	this.tile = null;
	this.parent = null;
}

/**************************************************************************************************************/

/**
 *	Build request url
 */
OpenSearchLayer.prototype.buildUrl = function( tile )
{
	var url = this.serviceUrl + "/search?order=" + tile.order + "&healpix=" + tile.pixelIndex;
	if ( this.coordSystemRequired )
	{
		// OpenSearchLayer always works in equatorial
		url += "&coordSystem=EQUATORIAL";
	}
	url += "&media=json";
	return url;
}

/**************************************************************************************************************/

// Internal function to sort tiles
function _sortTilesByDistance(t1,t2)
{
	return t1.tile.distance - t2.tile.distance;
};

/**
	Render function
	
	@param tiles The array of tiles to render
 */
OpenSearchLayer.prototype.render = function( tiles )
{
	if (!this._visible)
		return;
	
	// Sort tiles
	this.tilesToLoad.sort( _sortTilesByDistance );

	// Load data for the tiles if needed
	for ( var i = 0; i < this.tilesToLoad.length && this.freeRequests.length > 0; i++ )
	{
		var tile = this.tilesToLoad[i].tile;
		var url = this.buildUrl(tile);
		if ( url )
		{
			this.launchRequest(tile, url);
		}
	}
	
	this.tilesToLoad.length = 0;
}

/**************************************************************************************************************/

/**
 * 	Update features
 */
OpenSearchLayer.prototype.updateFeatures = function( features )
{
	for ( var i=0; i<features.length; i++ )
	{
		var currentFeature = features[i];
		
		switch ( currentFeature.geometry.type )
		{
			case "Point":

				// Convert to default coordinate system if needed
				/*if ( "EQ" != this.globe.tileManager.imageryProvider.tiling.coordSystem )
				{
					currentFeature.geometry.coordinates = CoordinateSystem.convert(currentFeature.geometry.coordinates, this.globe.tileManager.imageryProvider.tiling.coordSystem, "EQ");
				}*/

				// Convert to geographic to simplify picking
				if ( currentFeature.geometry.coordinates[0] > 180 )
					currentFeature.geometry.coordinates[0] -= 360;
				break;
			case "Polygon":
				var ring = currentFeature.geometry.coordinates[0];
				for ( var j = 0; j < ring.length; j++ )
				{
					// Convert to default coordinate system if needed
					/*if ( "EQ" != this.globe.tileManager.imageryProvider.tiling.coordSystem )
					{
						ring[j] = CoordinateSystem.convert(ring[j], this.globe.tileManager.imageryProvider.tiling.coordSystem, "EQ");
					}*/

					// Convert to geographic to simplify picking
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

return OpenSearchLayer;

});
