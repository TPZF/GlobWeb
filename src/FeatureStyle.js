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

/** @constructor
	FeatureStyle construtor
 */
GlobWeb.FeatureStyle = function(style)
{
	// Color used for lines or polygon outline
	this.strokeColor = [1.0, 0.0, 0.0, 1.0];
	// Color used to full polygon
	this.fillColor = [1.0, 0.0, 0.0, 1.0];
	this.fillTextureUrl = null;
	this.strokeWidth = 1;
	this.iconUrl = "hotspot.png";
	this.icon = null;
	this.label = null;
	this.textColor = [1.0, 1.0, 1.0, 1.0];
	this.fill = false;
	this.pointMaxSize = 40;
	this.opacity = 1.;
	this['rendererHint'] = "Tiled";
	
	if ( style )
	{
		for ( var s in style )
		{
			this[s] = style[s];
		}
	}
}

/**************************************************************************************************************/

/** 
 * Convert a hexa color (#ffffff) to internal color used by GlobWeb
 */
GlobWeb.FeatureStyle.hexToColor = function(hex)
{
	if ( hex.charAt(0) == "#" )
		hex = hex.substring(1,9);
		
	var color = [];
	color[3] = parseInt( hex.substring(0,2), 16 ) / 255.0;
	color[2] = parseInt( hex.substring(2,4), 16 ) / 255.0;
	color[1] = parseInt( hex.substring(4,6), 16 ) / 255.0;
	color[0] = parseInt( hex.substring(6,8), 16 ) / 255.0;

	return color;
}

/**************************************************************************************************************/

/** 
 * Convert an internal color to hexa color (#ffffff)
 */
GlobWeb.FeatureStyle.colorToHex = function(color)
{		
	var rr = parseInt( color[0] * 255.0 ).toString(16);
	var gg = parseInt( color[1] * 255.0 ).toString(16);
	var bb = parseInt( color[2] * 255.0 ).toString(16);

	return '#' + rr + gg + bb;
}

/**************************************************************************************************************/

/** 
 * Check if a style is equals to render poly
 */
GlobWeb.FeatureStyle.prototype.isEqualForPoly = function(style)
{
	return this.fill == style.fill;
}

/**************************************************************************************************************/

/** 
 * Check if a style is equals to render poly
 */
GlobWeb.FeatureStyle.prototype.isEqualForLine = function(style)
{
	return this.strokeColor[0] == style.strokeColor[0]
		&& this.strokeColor[1] == style.strokeColor[1]
		&& this.strokeColor[2] == style.strokeColor[2]
		&& this.strokeColor[3] == style.strokeColor[3]
		&& this.strokeWidth == style.strokeWidth;
}

/**************************************************************************************************************/

/** 
 * Check if a style is equals to render point
 */
GlobWeb.FeatureStyle.prototype.isEqualForPoint = function(style)
{
	return this.iconUrl == style.iconUrl
		&& this.icon == style.icon
		&& this.label == style.label;
}

/**************************************************************************************************************/

