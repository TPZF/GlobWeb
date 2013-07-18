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

 define(function() {

/**************************************************************************************************************/

/** @constructor
	Program constructor
 */
var Program = function(renderContext)
{
	this.renderContext = renderContext;
    this.glProgram = null;
    this.attributes = {};
    this.uniforms = {};
	this.numActiveAttribArray = 0;
}

/**************************************************************************************************************/

/**
  Creates a shader of the given type from the given source string
*/
Program.prototype.createShader = function(type, source)
{
	var gl = this.renderContext.gl;
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
	gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    {
		console.log("Shader compilation error: " + gl.getShaderInfoLog(shader));
		console.log(source);
		gl.deleteShader(shader);
        return null;
    }

    return shader;
}

/**************************************************************************************************************/

/**
	Create the program from source shaders
 */
Program.prototype.createFromSource = function(vertexSource, fragmentSource)
{
	var gl = this.renderContext.gl;
	
    //  Create the gl shaders from the source
    var vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
    var fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (vertexShader == null || fragmentShader == null)
    {
		return false;
    }
	
	// Create the program and attach the shaderss
	this.glProgram = gl.createProgram();
	gl.attachShader(this.glProgram, vertexShader);
	gl.attachShader(this.glProgram, fragmentShader);

	// Link and test the program is ok
	gl.linkProgram(this.glProgram);
    if (!gl.getProgramParameter(this.glProgram, gl.LINK_STATUS)) 
    {
        console.log("Program link error: " + gl.getProgramInfoLog(this.glProgram));
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);
		gl.deleteProgram(this.glProgram);
		this.glProgram = null;
        return false;
    }

    // Get vertex attributes used in the program, stored them in an attributes object
    var attributeCount = gl.getProgramParameter(this.glProgram, gl.ACTIVE_ATTRIBUTES);
	this.numActiveAttribArray = 0;
    for (var i = 0; i < attributeCount; ++i)
    {
        var attribute = gl.getActiveAttrib(this.glProgram, i);
		var loc = gl.getAttribLocation(this.glProgram,attribute.name);
        this.attributes[attribute.name] = loc;
		
		if ( loc + 1 > this.numActiveAttribArray )
		{
			this.numActiveAttribArray = loc + 1;
		}
    }

    // Get uniforms used in the program, stored them in an uniforms object
    var uniformCount = gl.getProgramParameter(this.glProgram, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < uniformCount; ++i)
    {
        var uniform = gl.getActiveUniform(this.glProgram, i);
        this.uniforms[uniform.name] = gl.getUniformLocation(this.glProgram,uniform.name);
    }

    return true;
}

/**************************************************************************************************************/

/*
	Load from file (must be located on the server)
 */
Program.prototype.loadFromFile = function(vertexFile, fragmentFile)
{
    var xhr = new XMLHttpRequest;
	xhr.open("get", this.renderContext.shadersPath + vertexFile, false);
	xhr.send(null);
    var vertexSource = xhr.responseText;
	xhr.open("get", this.renderContext.shadersPath +  fragmentFile, false);
	xhr.send(null);
    var fragmentSource = xhr.responseText;
    
    return this.createFromSource(vertexSource, fragmentSource);
}

/**************************************************************************************************************/

/*
	Apply the programs
 */
Program.prototype.apply = function()
{
	var rc = this.renderContext;
	var gl =  rc.gl;
	
    // Bind program
	gl.useProgram(this.glProgram);
    
	for ( var i = rc.numActiveAttribArray;
		i < this.numActiveAttribArray; i++ )
	{
		gl.enableVertexAttribArray(i);
	}
	for ( var i = this.numActiveAttribArray;
		i < rc.numActiveAttribArray; i++ )
	{
		gl.disableVertexAttribArray(i);
	}
	rc.numActiveAttribArray = this.numActiveAttribArray;
}

/**************************************************************************************************************/

/**
	Dispose the program
 */
Program.prototype.dispose = function()
{
	this.renderContext.gl.deleteProgram(this.glProgram);
}

/**************************************************************************************************************/

/*
	Load shader using Http request
 */
// Program.prototype.loadShader = function (shader, type, callback) 
// {
//     function onreadystatechange() {
//         var xhr = this;
//         if (xhr.readyState == 4) {
//             shader =  gl.createShader(type);
//              gl.shaderSource(shader, xhr.responseText);
//              gl.compileShader(shader);
//             if (! gl.getShaderParameter(shader,  gl.COMPILE_STATUS))
//                 throw  gl.getShaderInfoLog(shader)
//             ;
//             !--length && typeof callback == "function" && callback(shader);
//         }
//     }
	
// 	var asynchronous = !!callback;
// 	xhr = new XMLHttpRequest;
// 	xhr.open("get", shader, asynchronous);
// 	if (asynchronous) 
// 	{
// 		xhr.onreadystatechange = onreadystatechange;
// 	}
// 	xhr.send(null);
// 	onreadystatechange.call(xhr);
		
//     return shader;
// }

/**************************************************************************************************************/


/*
	Get the shader using defined in HTML
 */
// Program.prototype.getShader = function(id)
//  {
// 	var shaderScript = document.getElementById(id);
// 	if (!shaderScript) {
// 		return null;
// 	}

// 	var str = "";
// 	var k = shaderScript.firstChild;
// 	while (k) {
// 		if (k.nodeType == 3) {
// 			str += k.textContent;
// 		}
// 		k = k.nextSibling;
// 	}

// 	var shader;
// 	if (shaderScript.type == "x-shader/x-fragment") {
// 		shader = RenderContext.gl.createShader(RenderContext.gl.FRAGMENT_SHADER);
// 	} else if (shaderScript.type == "x-shader/x-vertex") {
// 		shader = RenderContext.gl.createShader(RenderContext.gl.VERTEX_SHADER);
// 	} else {
// 		return null;
// 	}

// 	RenderContext.gl.shaderSource(shader, str);
// 	RenderContext.gl.compileShader(shader);

// 	if (!RenderContext.gl.getShaderParameter(shader, RenderContext.gl.COMPILE_STATUS)) {
// 		alert(RenderContext.gl.getShaderInfoLog(shader));
// 		return null;
// 	}

// 	return shader;
// }

/**************************************************************************************************************/

return Program;

});
