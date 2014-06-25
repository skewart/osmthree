
var Loader = require("./loader.js"),
	Data = require("./data.js");


window.onload = function() {
	var loader = new Loader(),
		data = new Data();
		
	loader.greet();
	data.greet();
}
