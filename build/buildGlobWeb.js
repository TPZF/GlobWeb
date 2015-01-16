({
	baseUrl: "../src",
	name: "GlobWeb.light",
	out: "../build/generated/GlobWeb.min.js",
	optimize: "uglify2",
	onBuildWrite: function ( name, path, contents )
	{		
		contents = contents
				.replace( /define\s*\([^{]*?{/, "" )
				.replace( /\s*return\s+[^\}]+(\}\);[^\w\}]*)$/, "" )
				.replace( /\}\);[^}\w]*$/, "" );
				
		return contents;
	},
	wrap: {
        start: "(function() {",
        end: "\nreturn GlobWeb; }());"
    },
	uglify2: {
        //Example of a specialized config. If you are fine
        //with the default options, no need to specify
        //any of these properties.
        output: {
            beautify: false
        },
        compress: {
			unsafe: true,
        },
        warnings: true,
        mangle: true
    },

})
