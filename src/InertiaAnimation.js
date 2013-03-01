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

 define(['./Utils','./Animation'], function(Utils,Animation) {
 
/**************************************************************************************************************/

/**	@constructor
 *	Animation simulating inertia for camera navigation
 *
 *	@param nav Navigation
 */
var InertiaAnimation = function(nav)
{
    Animation.prototype.constructor.call(this);

	this.factor = 0.95;
	this.type = null;
	this.dx = 0;
	this.dy = 0;
	this.navigation = nav;
	this.navigation.globe.addAnimation(this);
}

/**************************************************************************************************************/

Utils.inherits(Animation,InertiaAnimation);

/**************************************************************************************************************/

InertiaAnimation.prototype.update = function(now)
{
	if ( this.factor > 0 )
	{		
		switch(this.type)
		{
			case "pan":
				this.navigation.pan(this.dx,this.dy);
				break;
			case "rotate":
				this.navigation.rotate(this.dx,this.dy);
				break;
			case "zoom":
				this.navigation.zoom(this.dx);
				break;
			default:
		}
		this.dx *= this.factor;
		if (this.dy) this.dy *= this.factor;
		this.navigation.globe.renderContext.requestFrame();
	}
	else
	{
		this.stop();
        return;
	}
}

/**************************************************************************************************************/

/**
 *	@param type Type of inertia
 *				<ul>
 *					<li>pan</li>
 *					<li>rotate</li>
 *					<li>zoom</li>
 *				</ul>
 *	@param speed Starting speed
 *	@param {Int[]} inertiaVector Vector of mouvement in window coordinates(for pan and rotate inertias)
 */
InertiaAnimation.prototype.launch = function(type, dx, dy)
{
	// Set first value
 	this.type = type;
	this.dx = dx;
	this.dy = dy;

	this.start();
}

/**************************************************************************************************************/

return InertiaAnimation;

});
