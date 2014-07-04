

// Loader is responsible for fetching data from the Overpass API

function constructor() {

	var OSM_XAPI_URL = 'http://overpass-api.de/api/interpreter?data=[out:json];(way[%22building%22]({s},{w},{n},{e});node(w);way[%22building:part%22=%22yes%22]({s},{w},{n},{e});node(w);relation[%22building%22]({s},{w},{n},{e});way(r);node(w););out;';
	var FAKE_OVERPASS = '/test/fake_osm.json'

	var req = new XMLHttpRequest();

	function xhr(url, param, callback) {

		url = url.replace(/\{ *([\w_]+) *\}/g, function(tag, key) {
			return param[key] || tag;
		});

		req.onerror = function() {
			req.status = 500;
			req.statusText = 'Error';
		};

		req.ontimeout = function() {
			req.status = 408;
			req.statusText = 'Timeout';
		};

		req.onprogress = function() {
		};

		req.onload = function() {
			req.status = 200;
			req.statusText = 'Ok';
		};

		req.onreadystatechange = function() {
			if (req.readyState !== 4) {
			  return;
			}
			if (!req.status || req.status < 200 || req.status > 299) {
			  return;
			}
			if (callback && req.responseText) {
			  callback( JSON.parse(req.responseText) );
			}
		}

		req.open('GET', url);
		req.send(null);

	};


	// load fetches data from the Overpass API for the given bounding box
	// PARAMETERS:
	// 	bbox 		--> a four float array consisting of [ <min lon>, <min lat>, <max lon>, <max lat> ], 
	// 	callback 	--> a callback function to be called when the data is returned
	this.load = function( bbox, callback ) {
		var params = {
			e: bbox[2],
			n: bbox[3],
			s: bbox[1],
			w: bbox[0]
		}
		xhr( OSM_XAPI_URL, params, callback );
		//xhr( FAKE_OVERPASS, params, callback );
	}

}

module.exports = constructor;