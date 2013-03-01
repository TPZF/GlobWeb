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
 
 define( function() {
 
/**************************************************************************************************************/

/** 
	@class Manage the various vector renderer.
	@constructor
	@param globe	the globe
 */
var VectorRendererManager = function(globe)
{
	this.globe = globe;
	this.factories = [];
	
	// Clone 'global' factories to this instance
	var globalFactories = VectorRendererManager.globalFactories;
	for ( var i = 0; i < globalFactories.length; i++ )
	{
		this.factories.push( { id: globalFactories[i].id, creator: globalFactories[i].creator, canApply: globalFactories[i].canApply, instance: null } );
	}
}

/**************************************************************************************************************/

/** 
	A global array that contains a factory for each vector renderer
	A factory is just two function :
	@see VectorRendererManager.registerRenderer
 */
VectorRendererManager.globalFactories = [];


/**************************************************************************************************************/

/** 
	Register a renderer in the manager
	@param factory the factory to create a renderer
	@param factory.creator a function to create a renderer
	@param factory.canApply a function to check if the renderer can be applied
 */
VectorRendererManager.registerRenderer = function(factory)
{
	VectorRendererManager.globalFactories.push( factory );
}

/**************************************************************************************************************/

/** 
	Get a renderer compatible for the given type and style
 */
VectorRendererManager.prototype.getRenderer = function(id)
{
	for ( var i = 0; i < this.factories.length; i++ )
	{
		var factory = this.factories[i];
		if ( factory.id == id )
		{
			if ( !factory.instance )
			{
				factory.instance = factory.creator(this.globe);
				this.globe.tileManager.addPostRenderer(factory.instance);
			}
			return factory.instance;
		}
	}
	
	return null;
}

/**************************************************************************************************************/

/** 
	Add a geometry to renderers
 */
VectorRendererManager.prototype.addGeometry = function(geometry,layer,style)
{
	var type = geometry['type'];
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
			factory.instance.addGeometry(geometry,layer,style);
		}
	}
}

/**************************************************************************************************************/

/** 
	Remove a geometry from renderers
 */
VectorRendererManager.prototype.removeGeometry = function(geometry,layer)
{
	for ( var i = 0; i < this.factories.length; i++ )
	{
		var factory = this.factories[i];
		if ( factory.instance )
		{
			factory.instance.removeGeometry(geometry,layer);
		}
	}
}

/**************************************************************************************************************/

return VectorRendererManager;

});
