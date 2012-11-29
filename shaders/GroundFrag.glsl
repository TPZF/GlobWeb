#ifdef GL_ES
precision highp float;
#endif

varying vec2 texCoord;
varying vec3 color;
varying vec3 secondaryColor;
uniform sampler2D colorTexture;
uniform float fExposure;	

void main (void)	
{	
	gl_FragColor.rgb = 1.0 - exp( -fExposure * (color + texture2D(colorTexture,texCoord).rgb * secondaryColor) );	
	//gl_FragColor.rgb = texture2D(colorTexture,texCoord).rgb;	
	gl_FragColor.a = 1.0;
}
