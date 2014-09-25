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
	@name Stats
	@class
	Display some rendering statistics in a HTML element
	@param options Configuration properties for Stats.
		<ul>
			<li>element : the HTML element to receivce statistcs, can be a string (the ID) or the DOM element itself</li>
			<li>verbose : the verbosity of the stats, default is false</li>
		</ul>
 */
var Stats = function(renderContext,options)
{
	renderContext.stats = this;
	this.renderContext = renderContext;
	
	var elt = options ? options['element'] : undefined;
	if ( elt )
	{	
		if (typeof elt == "string") 
		{
			this.element = document.getElementById(elt);
		}
		else
		{
			this.element = elt;
		}
	}
	
	this.showFPS = this.renderContext.continuousRendering;
	this.verbose = options && options['verbose'] ? options['verbose'] : false;
	this.numFrames = 0;
	
	var self = this;
	window.setInterval( function() { self.print(); }, 1000 );
}

/**************************************************************************************************************/

/** 
	Start measuring time
 */
Stats.prototype.start = function(name)
{
	this[name] = Date.now();
}

/**************************************************************************************************************/

/** 
	End measuring time
 */
Stats.prototype.end = function(name)
{
	var time = Date.now() - this[name];
	
	var max = this["max_"+name] || -1; 
	if (max < time) max = time;
	
	var sum = this["sum_"+name] || 0; 
	sum += time;
	
	this[name] = time;
	this["max_"+name] = max;
	this["sum_"+name] = sum;
	
	if ( name == "globalRenderTime" )
	{
		this.numFrames++;
	}
}

/**************************************************************************************************************/

/** 
	Print stats in an HTML element
 */
Stats.prototype.print = function()
{
	if ( this.numFrames > 0 )
	{
		var content = "";
		
		if ( this.showFPS )
		{
			content += "FPS : " + this.numFrames + "<br>";
		}
		
		content += "Average render time : " + (this["sum_globalRenderTime"] / this.numFrames).toFixed(2) + " ms";
		// FIXME: currently count stats for the first renderer in render context
		if ( this.renderContext.renderers[0].getRenderStats )
			content += "<br>" + this.renderContext.renderers[0].getRenderStats();
		
		if ( this.verbose )
		{
			content += "<br>Average traverse tiles time : " + (this["sum_traverseTime"] / this.numFrames).toFixed(2) + " ms";
			content += "<br>Average render tiles time : " + (this["sum_renderTime"] / this.numFrames).toFixed(2) + " ms";
			content += "<br>Average generate tiles time : " + (this["sum_generateTime"] / this.numFrames).toFixed(2) + " ms";
			content += "<br>Average request tiles time : " + (this["sum_requestTime"] / this.numFrames).toFixed(2) + " ms";
			content += "<br>Max render time : " + this["max_globalRenderTime"] + " ms";
			content += "<br>Max traverse tiles time : " + this["max_traverseTime"] + " ms";
			content += "<br>Max render tiles time : " + this["max_renderTime"] + " ms";
			content += "<br>Max generate tiles time : " + this["max_generateTime"]  + " ms";
			content += "<br>Max request tiles time : " + this["max_requestTime"] + " ms";
		}
		
		this.element.innerHTML = content;
		
		this["sum_globalRenderTime"] = 0;
		this["sum_traverseTime"] = 0;
		this["sum_renderTime"] = 0;
		this["sum_generateTime"] = 0;
		this["sum_requestTime"] = 0;
		this["max_globalRenderTime"] = 0;
		this["max_traverseTime"] = 0;
		this["max_renderTime"] = 0;
		this["max_generateTime"] = 0;
		this["max_requestTime"] = 0;
		this.numFrames = 0;
	}
}

/**************************************************************************************************************/

return Stats;

});
