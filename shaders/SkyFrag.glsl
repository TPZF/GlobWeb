#ifdef GL_ES
precision highp float;
#endif

varying vec3 color;
varying vec3 secondaryColor;

uniform vec3 v3LightPos;	
uniform float g;	
uniform float g2;	
uniform float fExposure;	
varying vec3 v3Direction;	


void main (void)	
{	
	float fCos = dot(v3LightPos, v3Direction) / length(v3Direction);	
	float fRayleighPhase = 0.75 * (1.0 + fCos*fCos);	
	float fMiePhase = 1.5 * ((1.0 - g2) / (2.0 + g2)) * (1.0 + fCos*fCos) / pow(1.0 + g2 - 2.0*g*fCos, 1.5);	
	gl_FragColor.rgb = 1.0 - exp( -fExposure * (fRayleighPhase * color + fMiePhase * secondaryColor) );
	gl_FragColor.a = 1.0; 
	//gl_FragColor = fRayleighPhase * color + fMiePhase * secondaryColor;
	//gl_FragColor.a = gl_FragColor.b;
}	
