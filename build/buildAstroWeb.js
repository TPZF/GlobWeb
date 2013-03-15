({
	baseUrl: "../src",
	name: "../build/almond",
	include: ['AstroWeb'],
	insertRequire: ['AstroWeb'],
	out: "../build/generated/AstroWeb.min.js",
	wrap: true,
	optimize: "uglify2",
	uglify: {
			toplevel: true,
			//ascii_only: true,
			//beautify: true,
			max_line_length: 1000,
			//Custom value supported by r.js but done differently
			//in uglifyjs directly:
			//Skip the processor.ast_mangle() part of the uglify call (r.js 2.0.5+)
			mangle: true,
		},
  uglify2: {
        //Example of a specialized config. If you are fine
        //with the default options, no need to specify
        //any of these properties.
        output: {
            beautify: false
        },
        compress: {
 /*           sequences: false,
            global_defs: {
                DEBUG: false
            }*/
        },
        warnings: true,
        mangle: true
    },

})
