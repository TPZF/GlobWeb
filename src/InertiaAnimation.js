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

var epsilon = 0.1;

/**	@constructor
 *	Animation simulating inertia for camera navigation
 *
 *	@param nav Navigation
 *	@param options Configuration of navigation
 *			<ul>
 *				<li>panFactor : Pan factor</li>
 *				<li>rotateFactor : Rotate factor</li>
 *				<li>zoomFactor : Zoom factor</li>
 *			</ul>
 */
var InertiaAnimation = function(nav, options)
{
    Animation.prototype.constructor.call(this);

    if ( options )
    {
		this.panFactor = options.hasOwnProperty('panFactor') ? options['panFactor'] : 0.95;
		this.rotateFactor = options.hasOwnProperty('rotateFactor') ? options['rotateFactor'] : 0.95;
		this.zoomFactor = options.hasOwnProperty('zoomFactor') ? options['zoomFactor'] : 0.95;
	}

	this.type = null;
	this.dx = 0;
	this.dy = 0;
	this.navigation = nav;
	this.renderContext = nav.renderContext;
}

/**************************************************************************************************************/

Utils.inherits(Animation,InertiaAnimation);

/**************************************************************************************************************/

/**
 * Update inertia
 */
InertiaAnimation.prototype.update = function(now)
{
	var hasToStop = false;
	
	switch(this.type)
	{
		case "pan":
			this.navigation.pan(this.dx,this.dy);
			this.dx *= this.panFactor;
			this.dy *= this.panFactor;
			hasToStop = (Math.abs(this.dx) < epsilon && Math.abs(this.dy) < epsilon);
			break;
		case "rotate":
			this.navigation.rotate(this.dx,this.dy);
			this.dx *= this.rotateFactor;
			this.dy *= this.rotateFactor;
			hasToStop = (Math.abs(this.dx) < epsilon && Math.abs(this.dy) < epsilon);
			break;
		case "zoom":
			this.navigation.zoom(this.dx);
			this.dx *= this.zoomFactor;
			hasToStop = (Math.abs(this.dx) < epsilon);
			break;
		default:
	}
	this.navigation.renderContext.requestFrame();

	if ( hasToStop )
		this.stop();
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
