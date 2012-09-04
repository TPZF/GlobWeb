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
	@class Manage the various vector renderer.
	@constructor
	@param globe	the globe
 */
GlobWeb.VectorRendererManager = function(globe)
{
	this.globe = globe;
	this.factories = [];
	
	// Copy 'global' factories to this instance
	var globalFactories = GlobWeb.VectorRendererManager.globalFactories;
	for ( var i = 0; i < globalFactories.length; i++ )
	{
		this.factories.push( { creator: globalFactories[i].creator, canApply: globalFactories[i].canApply, instance: null } );
	}
}

/**************************************************************************************************************/

/** 
	The singleton factory
 */
GlobWeb.VectorRendererManager.globalFactories = [];


/**************************************************************************************************************/

/** 
	Register a renderer in the singleton factory
	@param factory the factory to create a renderer
	@param factory.creator a function to create a renderer
	@param factory.canApply a function to check if the renderer can be applied
 */
GlobWeb.VectorRendererManager.registerRenderer = function(factory)
{
	GlobWeb.VectorRendererManager.globalFactories.push( factory );
}

/**************************************************************************************************************/

/** 
	Add a feature to renderers
 */
GlobWeb.VectorRendererManager.prototype.addFeature = function(feature,style)
{
	var type = feature['geometry']['type'];
	for ( var i = 0; i < this.factories.length; i++ )
	{
		var factory = this.factories[i];
		if ( factory.canApply(type,style) )
		{
			if ( !factory.instance )
			{
				factory.instance = factory.creator(this.globe);
				this.globe.tileManager.addPostRenderer(factory.instance);
			}
			factory.instance.addFeature(feature,style);
		}
	}
}

/**************************************************************************************************************/

/** 
	Remove a feature from renderers
 */
GlobWeb.VectorRendererManager.prototype.removeFeature = function(feature)
{
	for ( var i = 0; i < this.factories.length; i++ )
	{
		var factory = this.factories[i];
		if ( factory.instance )
			factory.instance.removeFeature(feature);
	}
}

/**************************************************************************************************************/
