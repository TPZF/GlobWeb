({
	paths: {
		gw: '../../src'
	},
	name: "main",
	exclude: ['js/jquery-1.7.2.min','js/jquery-ui-1.8.20.custom.min'],
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
