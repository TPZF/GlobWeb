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

 define(['./Utils', './BaseLayer', './Program'], function(Utils,BaseLayer,Program) {

/** @name AtmosphereLayer
	@class
	A layer to BaseLayer an atmosphere on the globe.
	@augments RasterLayer
	@param options Configuration properties for the layer. See {@link BaseLayer} for base properties :
		<ul>
			<li>kr : the raylength parameter, default is 0.0025</li>
			<li>km : the mie parameter, default is 0.0015</li>
			<li>sunBrightness : the mie parameter, default is 0.0015</li>
			<li>exposure : the exposure, use for basic high dynamic range, default is 2.0</li>
			<li>wavelength : the RGB color of the sun, default is [0.650,0.570,0.475]</li>
		</ul>
 */
var AtmosphereLayer = function(options)
{
	BaseLayer.prototype.constructor.call( this, options );
	if (!this.name)
		this.name = "Atmosphere";

	this.kr = (options && options['kr']) || 0.0025;
	this.km = (options && options['km']) || 0.0015;
	this.sunBrightness = (options && options['sunBrightness']) || 15.0;
	this.exposure = (options && options['exposure']) || 2.0;
	this.wavelength = (options && options['wavelength']) || [0.650,0.570,0.475];
	
	// internal properties
	this._skyProgram = null;
	this._groundProgram = null;
	this._originalProgram = null;
	this._isValid = false;
	
	// For rendering
	this.zIndex = -1;
}

/**************************************************************************************************************/

Utils.inherits( BaseLayer,AtmosphereLayer );

/**************************************************************************************************************/

/** 
  Attach the atmosphere layer to the globe
 */
AtmosphereLayer.prototype._attach = function( g )
{
	this.globe = g;
	this._innerRadius = this.globe.coordinateSystem.radius;
	this._outerRadius = this._innerRadius * 1.025;
	var renderContext = g.renderContext;
	
	// Setup program, uniform now that we have the render context
		
    this._skyFromSpaceProgram = new Program(renderContext);
	this._skyFromSpaceProgram.loadFromFile( "SkyFromSpaceVert.glsl", "SkyFrag.glsl" );
	
	this._skyFromAtmosphereProgram = new Program(renderContext);
	this._skyFromAtmosphereProgram.loadFromFile( "SkyFromAtmosphereVert.glsl", "SkyFrag.glsl" );
	
	this._groundFromSpaceProgram = new Program(renderContext);
	this._groundFromSpaceProgram.loadFromFile( "GroundFromSpaceVert.glsl", "GroundFrag.glsl" );
	
    this._groundFromAtmosphereProgram = new Program(renderContext);
	this._groundFromAtmosphereProgram.loadFromFile( "GroundFromAtmosphereVert.glsl", "GroundFrag.glsl" );
	
	// Check if the atmosphre is valid : all programs must be OK
	this._isValid = this._skyFromSpaceProgram.glProgram != null
	    && this._skyFromAtmosphereProgram.glProgram != null
		&& this._groundFromSpaceProgram.glProgram != null
		&& this._groundFromAtmosphereProgram.glProgram != null;
		
	if ( !this._isValid )
		return;

	this._skyFromSpaceProgram.apply();
	this._initUniforms( this._skyFromSpaceProgram.uniforms );
	this._skyFromAtmosphereProgram.apply();
	this._initUniforms( this._skyFromAtmosphereProgram.uniforms );
	this._groundFromSpaceProgram.apply();
	this._initUniforms( this._groundFromSpaceProgram.uniforms );
	this._groundFromAtmosphereProgram.apply();
	this._initUniforms( this._groundFromAtmosphereProgram.uniforms );
	
	// Create the sphere
	var vertices = [];
	var indices = [];
	
	var nbEl = 72;
	var nbAz = 144;
	
	// Create the vertices
	for (var el=-nbEl; el <= nbEl; el++)
	{
		var elevation = el * (Math.PI * 0.5) / nbEl;
		for (var az=-nbAz; az <= nbAz; az++)
		{
			var azimuth = az * Math.PI / nbAz;

			var x = this._outerRadius * Math.cos(azimuth) * Math.cos(elevation);
			var y = this._outerRadius * Math.sin(azimuth) * Math.cos(elevation);
			var z = this._outerRadius * Math.sin(elevation);

			vertices.push( x );
			vertices.push( y );
			vertices.push( z );
		}
	}

	// build the sphere triangles
	for (var el=0; el < 2*nbEl; el++)
	{
		for (var az=0; az < 2*nbAz; az++)
		{
			indices.push( el * (2*nbAz+1) + az );
			indices.push( (el+1) * (2*nbAz+1) + az+1 );
			indices.push( el * (2*nbAz+1) + az + 1 );
			
			indices.push( (el+1) * (2*nbAz+1) + az+1 );
			indices.push( el * (2*nbAz+1) + az );
			indices.push( (el+1) * (2*nbAz+1) + az );
		}
	}

	var gl = renderContext.gl;
	this._vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	
	this._indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
	this._numIndices = indices.length;
	
	this._originalProgram = g.tileManager.program;
	
	g.preRenderers.push(this);
	g.tileManager.addPostRenderer(this);
}

/**************************************************************************************************************/

/*
	Initialize uniforms
 */
AtmosphereLayer.prototype._initUniforms = function( uniforms )
{
	var gl = this.globe.renderContext.gl;
	
	var g = -0.95;		// The Mie phase asymmetry factor
	var scale = 1.0 / ( this._outerRadius - this._innerRadius );
	var rayleighScaleDepth = 0.25;
	//var mieScaleDepth = 0.1;

	var lightDir = [1.0,1.0,1.0];
	vec3.normalize( lightDir );
	
	gl.uniform1f( uniforms["fKrESun"], this.kr * this.sunBrightness );
	gl.uniform1f( uniforms["fKmESun"], this.kr * this.sunBrightness );
	gl.uniform1f( uniforms["fKr4PI"], this.kr * 4.0 * Math.PI );
	gl.uniform1f( uniforms["fKm4PI"], this.km * 4.0 * Math.PI );
	gl.uniform1f( uniforms["fExposure"], this.exposure );

	var wavelength = [ Math.pow( this.wavelength[0], 4.0 ), Math.pow( this.wavelength[1], 4.0 ) ,Math.pow( this.wavelength[2], 4.0 ) ];
	gl.uniform3f( uniforms["v3InvWavelength"], 1.0 / wavelength[0], 1.0 / wavelength[1], 1.0 / wavelength[2] );

	gl.uniform3f( uniforms["v3LightPos"],  lightDir[0], lightDir[1], lightDir[2] );
	gl.uniform1f( uniforms["fInnerRadius"], this._innerRadius );
	gl.uniform1f( uniforms["fInnerRadius2"], this._innerRadius*this._innerRadius );
	gl.uniform1f( uniforms["fOuterRadius"], this._outerRadius );
	gl.uniform1f( uniforms["fOuterRadius2"], this._outerRadius*this._outerRadius );
	gl.uniform1f( uniforms["fScale"], scale );
	gl.uniform1f( uniforms["fScaleDepth"], rayleighScaleDepth );
	gl.uniform1f( uniforms["fScaleOverScaleDepth"], scale / rayleighScaleDepth );
	gl.uniform1f( uniforms["g"], g );
	gl.uniform1f( uniforms["g2"], g*g );
}

/**************************************************************************************************************/

/*
	Pre-render the atmoshpere
 */
AtmosphereLayer.prototype.preRender = function()
{
	if ( !this._isValid )
		return;
		
	var tileManager = this.globe.tileManager;
	if ( !this._visible )
	{
		tileManager.program = this._originalProgram;
		return;
	}
		
	var rc = this.globe.renderContext;
	var gl = rc.gl;

	// Compute the eye position from the view matrix : the eye position is equals to [0,0,0] * inv(viewMatrix)
	// Optimized to avoid to compute the view matrix inverse
	var vm = rc.viewMatrix;
	var x = vm[12], y = vm[13], z = vm[14];
	var eyePos = [ -( vm[0]*x + vm[1]*y + vm[2]*z ),
				 -( vm[4]*x + vm[5]*y + vm[6]*z ),
				  -( vm[8]*x + vm[9]*y + vm[10]*z ) ];
	var eyeHeight = vec3.length(eyePos);

	this._skyProgram = eyeHeight < this._outerRadius ? this._skyFromAtmosphereProgram : this._skyFromSpaceProgram;
	this._groundProgram = eyeHeight < this._outerRadius ? this._groundFromAtmosphereProgram : this._groundFromSpaceProgram;

	this._skyProgram.apply();
	
	gl.uniform3f( this._skyProgram.uniforms["v3CameraPos"], eyePos[0], eyePos[1], eyePos[2] );
	gl.uniform1f( this._skyProgram.uniforms["fCameraHeight2"], eyeHeight * eyeHeight );
	gl.uniform1f( this._skyProgram.uniforms["fCameraHeight"], eyeHeight );

	this._groundProgram.apply();
	
	var earthCenter = [ 0.0, 0.0, 0.0 ];
	mat4.multiplyVec3( rc.viewMatrix, earthCenter );
	gl.uniform3f( this._groundProgram.uniforms["earthCenter"], earthCenter[0], earthCenter[1], earthCenter[2] );

	var lightDir = [1.0,1.0,1.0];
	vec3.normalize( lightDir );
	var x = lightDir[0], y = lightDir[1], z = lightDir[2];
	var mat = rc.viewMatrix;
	lightDir[0] = mat[0]*x + mat[4]*y + mat[8]*z;
	lightDir[1] = mat[1]*x + mat[5]*y + mat[9]*z;
	lightDir[2] = mat[2]*x + mat[6]*y + mat[10]*z ;
	gl.uniform3f( this._groundProgram.uniforms["lightDir"], lightDir[0], lightDir[1], lightDir[2] );

	gl.uniform3f( this._groundProgram.uniforms["v3CameraPos"], eyePos[0], eyePos[1], eyePos[2] );
	gl.uniform1f( this._groundProgram.uniforms["fCameraHeight2"], eyeHeight * eyeHeight );
	gl.uniform1f( this._groundProgram.uniforms["fCameraHeight"], eyeHeight );
	
	tileManager.program = this._groundProgram;
	
	rc.minFar = 2.0;
}

/**************************************************************************************************************/

/*
	Render the atmosphere
 */
AtmosphereLayer.prototype.render = function()
{
	if ( !this._isValid || ! this._visible )
		return;
		
	var rc = this.globe.renderContext;
	var gl = rc.gl;
	
	gl.enable(gl.CULL_FACE);

	this._skyProgram.apply();
	
	gl.uniformMatrix4fv(this._skyProgram.uniforms["projectionMatrix"], false, rc.projectionMatrix);
	gl.uniformMatrix4fv(this._skyProgram.uniforms["viewMatrix"], false, rc.viewMatrix);

	gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
	gl.vertexAttribPointer(this._skyProgram.attributes['vertex'], 3, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
	gl.drawElements(gl.TRIANGLES, this._numIndices, gl.UNSIGNED_SHORT, 0);
	
	gl.disable(gl.CULL_FACE);
}

/**************************************************************************************************************/

return AtmosphereLayer;

});

