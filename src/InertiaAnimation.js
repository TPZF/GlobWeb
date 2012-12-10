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

/**	@constructor
 *	Animation simulating inertia for camera navigation
 *
 *	@param nav Navigation
 */
GlobWeb.InertiaAnimation = function(nav)
{
    GlobWeb.Animation.prototype.constructor.call(this);

	this.factor = 1;
	this.type = null;
	this.speed = -1;
	this.inertiaVector = null;
	this.navigation = nav;
	this.navigation.globe.addAnimation(this);
}

/**************************************************************************************************************/

GlobWeb.inherits(GlobWeb.Animation,GlobWeb.InertiaAnimation);

/**************************************************************************************************************/

GlobWeb.InertiaAnimation.prototype.update = function(now)
{
	if ( this.factor > 0 )
	{
		switch(this.type)
		{
			case "pan":
				this.navigation.pan(this.inertiaVector[0]*this.speed*this.factor, this.inertiaVector[1]*this.speed*this.factor);
				break;
			case "rotate":
				this.navigation.rotate(this.inertiaVector[0]*this.speed*this.factor, this.inertiaVector[1]*this.speed*this.factor);
				break;
			case "zoom":
				this.navigation.zoom(this.speed*this.factor);
				break;
			default:
		}
		this.factor*=0.9;
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
GlobWeb.InertiaAnimation.prototype.launch = function(type, speed, inertiaVector)
{
	// Set first value
    this.factor = 1;
	this.type = type;
	this.speed = speed;
	this.inertiaVector = inertiaVector;

	this.start();
}

/**************************************************************************************************************/