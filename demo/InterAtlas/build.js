({
	paths: {
		gw: '../../src'
	},
	name: "main",
	out: "main.min.js",
	optimize: "uglify2",
	uglify2: {
         output: {
            beautify: false
        },
        warnings: true,
        mangle: true
    },

})
