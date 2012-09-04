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

/** @constructor
	Atmosphere constructor
 */
GlobWeb.Atmosphere = function(renderContext)
{
	this.renderContext = renderContext;
	this.kr = 0.0025;
	this.km = 0.0015;
	this.sunBrightness = 15.0;
	this.exposure = 2.0;
	this.wavelength = [0.650,0.570,0.475];
	this.innerRadius = GlobWeb.CoordinateSystem.radius;
	this.outerRadius = this.innerRadius * 1.025;
	this.skyProgram = null;
	this.groundProgram = null;
	this.isValid = false;
		
    this.skyFromSpaceProgram = new GlobWeb.Program(renderContext);
	this.skyFromSpaceProgram.loadFromFile( "SkyFromSpaceVert.glsl", "SkyFrag.glsl" );
	
	this.skyFromAtmosphereProgram = new GlobWeb.Program(renderContext);
	this.skyFromAtmosphereProgram.loadFromFile( "SkyFromAtmosphereVert.glsl", "SkyFrag.glsl" );
	
	this.groundFromSpaceProgram = new GlobWeb.Program(renderContext);
	this.groundFromSpaceProgram.loadFromFile( "GroundFromSpaceVert.glsl", "GroundFrag.glsl" );
	
    this.groundFromAtmosphereProgram = new GlobWeb.Program(renderContext);
	this.groundFromAtmosphereProgram.loadFromFile( "GroundFromAtmosphereVert.glsl", "GroundFrag.glsl" );
	
	// Check if the atmosphre is valid : all programs must be OK
	this.isValid = this.skyFromSpaceProgram.glProgram != null
	    && this.skyFromAtmosphereProgram.glProgram != null
		&& this.groundFromSpaceProgram.glProgram != null
		&& this.groundFromAtmosphereProgram.glProgram != null;
		
	if ( !this.isValid )
		return;

	this.skyFromSpaceProgram.apply();
	this.initUniforms( this.skyFromSpaceProgram.uniforms );
	this.skyFromAtmosphereProgram.apply();
	this.initUniforms( this.skyFromAtmosphereProgram.uniforms );
	this.groundFromSpaceProgram.apply();
	this.initUniforms( this.groundFromSpaceProgram.uniforms );
	this.groundFromAtmosphereProgram.apply();
	this.initUniforms( this.groundFromAtmosphereProgram.uniforms );
	
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

			var x = this.outerRadius * Math.cos(azimuth) * Math.cos(elevation);
			var y = this.outerRadius * Math.sin(azimuth) * Math.cos(elevation);
			var z = this.outerRadius * Math.sin(elevation);

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

	this.mesh = new GlobWeb.Mesh(renderContext);
	this.mesh.setVertices( vertices );
	this.mesh.setIndices( indices );
	
}

/**************************************************************************************************************/

/*
	Initialize uniforms
 */
GlobWeb.Atmosphere.prototype.initUniforms = function( uniforms )
{
	var gl = this.renderContext.gl;
	
	var g = -0.95;		// The Mie phase asymmetry factor
	var scale = 1.0 / ( this.outerRadius - this.innerRadius );
	var rayleighScaleDepth = 0.25;
	var mieScaleDepth = 0.1;

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
	gl.uniform1f( uniforms["fInnerRadius"], this.innerRadius );
	gl.uniform1f( uniforms["fInnerRadius2"], this.innerRadius*this.innerRadius );
	gl.uniform1f( uniforms["fOuterRadius"], this.outerRadius );
	gl.uniform1f( uniforms["fOuterRadius2"], this.outerRadius*this.outerRadius );
	gl.uniform1f( uniforms["fScale"], 1.0 / (this.outerRadius - this.innerRadius) );
	gl.uniform1f( uniforms["fScaleDepth"], rayleighScaleDepth );
	gl.uniform1f( uniforms["fScaleOverScaleDepth"], (1.0 / (this.outerRadius - this.innerRadius)) / rayleighScaleDepth );
	gl.uniform1f( uniforms["g"], g );
	gl.uniform1f( uniforms["g2"], g*g );
}

/**************************************************************************************************************/

/*
	Pre-render the atmoshpere
 */
GlobWeb.Atmosphere.prototype.preRender = function(tileManager)
{
	if ( !this.isValid )
		return;
		
	var gl = this.renderContext.gl;

	// Compute the eye position from the view matrix : the eye position is equals to [0,0,0] * inv(viewMatrix)
	// Optimized to avoid to compute the view matrix inverse
	var vm = this.renderContext.viewMatrix;
	var x = vm[12], y = vm[13], z = vm[14];
	var eyePos = [ -( vm[0]*x + vm[1]*y + vm[2]*z ),
				 -( vm[4]*x + vm[5]*y + vm[6]*z ),
				  -( vm[8]*x + vm[9]*y + vm[10]*z ) ];
	var eyeHeight = vec3.length(eyePos);

	this.skyProgram = eyeHeight < this.outerRadius ? this.skyFromAtmosphereProgram : this.skyFromSpaceProgram;
	this.groundProgram = eyeHeight < this.outerRadius ? this.groundFromAtmosphereProgram : this.groundFromSpaceProgram;

	this.skyProgram.apply();
	
	gl.uniform3f( this.skyProgram.uniforms["v3CameraPos"], eyePos[0], eyePos[1], eyePos[2] );
	gl.uniform1f( this.skyProgram.uniforms["fCameraHeight2"], eyeHeight * eyeHeight );
	gl.uniform1f( this.skyProgram.uniforms["fCameraHeight"], eyeHeight );

	this.groundProgram.apply();
	
	var earthCenter = [ 0.0, 0.0, 0.0 ];
	mat4.multiplyVec3( this.renderContext.viewMatrix, earthCenter );
	gl.uniform3f( this.groundProgram.uniforms["earthCenter"], earthCenter[0], earthCenter[1], earthCenter[2] );

	var lightDir = [1.0,1.0,1.0];
	vec3.normalize( lightDir );
	var x = lightDir[0], y = lightDir[1], z = lightDir[2];
	var mat = this.renderContext.viewMatrix;
	lightDir[0] = mat[0]*x + mat[4]*y + mat[8]*z;
	lightDir[1] = mat[1]*x + mat[5]*y + mat[9]*z;
	lightDir[2] = mat[2]*x + mat[6]*y + mat[10]*z ;
	gl.uniform3f( this.groundProgram.uniforms["lightDir"], lightDir[0], lightDir[1], lightDir[2] );

	gl.uniform3f( this.groundProgram.uniforms["v3CameraPos"], eyePos[0], eyePos[1], eyePos[2] );
	gl.uniform1f( this.groundProgram.uniforms["fCameraHeight2"], eyeHeight * eyeHeight );
	gl.uniform1f( this.groundProgram.uniforms["fCameraHeight"], eyeHeight );
	
	tileManager.program = this.groundProgram;
	
	this.renderContext.far = 3;
}

/**************************************************************************************************************/

/*
	Render the atmosphere
 */
GlobWeb.Atmosphere.prototype.render = function()
{
	if ( !this.isValid )
		return;
		
	var gl = this.renderContext.gl;
	
	gl.enable(gl.CULL_FACE);

	this.skyProgram.apply();
	
	gl.uniformMatrix4fv(this.skyProgram.uniforms["projectionMatrix"], false, this.renderContext.projectionMatrix);
	gl.uniformMatrix4fv(this.skyProgram.uniforms["viewMatrix"], false, this.renderContext.viewMatrix);

	this.mesh.render( this.skyProgram.attributes );
}


/**************************************************************************************************************/

