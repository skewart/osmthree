(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

var controller = require('./controller.js');


function constructor( scene, scale, origin ) {

	var 
		_scene = scene,
		_scale = scale,
		_origin = lonLatToWorld( origin[0], origin[1] );

	controller.subscribe( 'dataReady', build );


	function latlonDistMeters( lon1, lat1, lon2, lat2 ){  // generally used geo measurement function
	    var R = 6378.137, // Radius of earth in KM
	    	dLat = (lat2 - lat1) * Math.PI / 180,
	    	dLon = (lon2 - lon1) * Math.PI / 180,
	    	a = Math.sin(dLat/2) * Math.sin(dLat/2) +
	    		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
	    		Math.sin(dLon/2) * Math.sin(dLon/2),
	    	c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)),
	    	d = R * c;
	    return d * 1000; // meters
	}


	function updateFaces( faces, len ) {
		for ( var i=0, flen = faces.length; i < flen; i++ ) {
			faces[i].a += len;
			faces[i].b += len;
			faces[i].c += len;
			if ( faces[i].d ) {
				faces[i].d += len;
			}
		}
		return faces;
	}


	function build( items ) {

		var bldg, currVerLen,
			mats = [],
			ids = [];
			//geom = new THREE.Geometry();

		for ( var i=0, len=items.length; i < len; i++ ) {
			bldg = makeBldgGeom( items[i] );
			//currVerLen = geom.vertices.length;
			//geom.vertices = geom.vertices.concat( bldg.vertices );
			//geom.faces = geom.faces.concat( updateFaces( bldg.faces, currVerLen ) );
			//mats = mats.concat( bldg.materials );
			// Is this really necessary?
			//for ( var j = 0, fLen = bldg.faces.length; j < fLen; j++ ) {
				//ids.push( i );
			//}
			_scene.add( new THREE.Mesh( bldg, new THREE.MeshNormalMaterial() ) );
		}

		// TODO Create the mesh object and any necessary material objects
		//_scene.add( new THREE.Mesh( geom, new THREE.MeshNormalMaterial() ) );

	}

	function lonLatToWorld( lon, lat ) {
		var x, y, pointX, pointY, latRad, mercN,
			worldWidth = 40075000,
			worldHeight = 40008000;

		x = ( lon + 180 ) * ( worldWidth / 360);
		latRad = lat*Math.PI/180;
		mercN = Math.log( Math.tan((Math.PI/4)+(latRad/2)));
		y = (worldHeight/2)-(worldHeight*mercN/(2*Math.PI));

		return [ x, y ]
	}


	function lonLatToScene( lon, lat ) {
		var point = lonLatToWorld( lon, lat );
		return new THREE.Vector2( point[0] - _origin[0], point[1] - _origin[1] );
	}


	function makeBldgGeom( item ) {
		// Create a path
		var pointX, pointY, extrudePath,
			path, shapes,
			bldgHeight = item.height,
			pathPoints = [];
		
		for ( var i = 0, last = item.footprint.length-1; i < last; i+=2 ) {
			pathPoints.push( lonLatToScene( item.footprint[i+1], item.footprint[i] ) );
		}

		path = new THREE.Path( pathPoints );
		shapes = path.toShapes(); // isCCW, noHoles

		extrudePath = new THREE.CurvePath();
		extrudePath.add( new THREE.LineCurve3( new THREE.Vector3(0,0,0), new THREE.Vector3(0,bldgHeight,0) ) );

		eg = new THREE.ExtrudeGeometry( shapes, {
			extrudePath: extrudePath
		})

		return eg;

	}

}

module.exports = constructor;
},{"./controller.js":2}],2:[function(require,module,exports){

// Implementing super simple pub-sub for now.  Can add unsubsubscribe if needed later.

var events = {}

function subscribe( eventName, callback ) {
	if (!(events[ eventName ] instanceof Array )) {
		events[ eventName ] = []
	}
	events[ eventName ].push( callback );
}

function publish( eventName, argsArray ) {
	if (!(events[ eventName ] instanceof Array )) {
		console.warn( "Published an event with no subscribers. --> " + eventName );
		return;
	}
	for ( var i = 0, eL = events[ eventName ].length; i < eL; i++ ) {
		events[ eventName ][i].apply( window, argsArray );
	}
}

module.exports = {
	subscribe: subscribe,
	publish: publish
}

},{}],3:[function(require,module,exports){

var importer = require('./importer.js' ),
	controller = require( './controller.js' );

var _nodes = {},
	_ways = {},
	_relations = {},
	MAP_DATA = []


function isBuilding(data) {
	var tags = data.tags;
	return (tags && !tags.landuse &&
	  (tags.building || tags['building:part']) && (!tags.layer || tags.layer >= 0));
}


function getRelationWays(members) {
	var m, outer, inner = [];
	for (var i = 0, il = members.length; i < il; i++) {
	  m = members[i];
	  if (m.type !== 'way' || !_ways[m.ref]) {
	    continue;
	  }
	  if (!m.role || m.role === 'outer') {
	    outer = _ways[m.ref];
	    continue;
	  }
	  if (m.role === 'inner' || m.role === 'enclave') {
	    inner.push(_ways[m.ref]);
	    continue;
	  }
	}

	//  if (outer && outer.tags) {
	if (outer) { // allows tags to be attached to relation - instead of outer way
	  return { outer:outer, inner:inner };
	}
}


function getFootprint(points) {
    if (!points) {
      return;
    }

    var footprint = [], p;
    for (var i = 0, il = points.length; i < il; i++) {
      	p = _nodes[ points[i] ];
      	footprint.push(p[0], p[1]);
    }

    // do not close polygon yet
    if (footprint[footprint.length-2] !== footprint[0] && footprint[footprint.length-1] !== footprint[1]) {
      	footprint.push(footprint[0], footprint[1]);
    }

    // can't span a polygon with just 2 points (+ start & end)
    if (footprint.length < 8) {
      	return;
    }

    return footprint;
}



function mergeItems(dst, src) {
    for (var p in src) {
      if (src.hasOwnProperty(p)) {
        dst[p] = src[p];
      }
    }
    return dst;
}


function filterItem(item, footprint) {
    var res = importer.alignProperties(item.tags);
    res.tags = item.tags;  // Keeping the raw tags too
    if (item.id) {
      res.id = item.id;
    }

    if (footprint) {
      res.footprint = importer.makeWinding(footprint, importer.clockwise);
    }

    if (res.shape === 'cone' || res.shape === 'cylinder') {
      res.radius = importer.getRadius(res.footprint);
    }

    return res;
}


function processNode(node) {
	_nodes[node.id] = [node.lat, node.lon];
}


function processWay(way) {
	if (isBuilding(way)) {
	  	var item, footprint;
	  	if ( footprint = getFootprint(way.nodes) ) {
	    	item = filterItem(way, footprint);
	    	MAP_DATA.push(item);
	  	}
	  	return;
	}

	var tags = way.tags;
	if (!tags || (!tags.highway && !tags.railway && !tags.landuse)) { // TODO: add more filters
	  	_ways[way.id] = way;
	}
}


function processRelation(relation) {
	var relationWays, outerWay, holes = [],
	  	item, relItem, outerFootprint, innerFootprint;
	if (!isBuilding(relation) ||
	  	(relation.tags.type !== 'multipolygon' && relation.tags.type !== 'building') ) {
	  	return;
	}

	if ((relationWays = getRelationWays(relation.members))) {
	  	relItem = filterItem(relation);
	  	if ((outerWay = relationWays.outer)) {
	    	if ((outerFootprint = getFootprint(outerWay.nodes)) && _callback(outerWay) !== false) {
		      	item = filterItem(outerWay, outerFootprint);
		      	for (var i = 0, il = relationWays.inner.length; i < il; i++) {
		        	if ((innerFootprint = getFootprint(relationWays.inner[i].nodes))) {
		          		holes.push( importer.makeWinding(innerFootprint, importer.counterClockwise) );
		        	}
		      	}
		      	if (holes.length) {
		        	item.holes = holes;
		      	}
		      	MAP_DATA.push( mergeItems(item, relItem) );
	    	}
	  	}
	}
}


function process( osmData ) {
	var item;
	for ( var i = 0, len = osmData.elements.length; i < len; i++ ) {
		item = osmData.elements[i];
		switch ( item.type ) {
			case 'node': processNode( item ); break;
			case 'way': processWay( item ); break;
			case 'relation': processRelation( item ); break;
		}
	}
	controller.publish( 'dataReady', [ MAP_DATA ] )
	return MAP_DATA;  // No real need for this return
}


module.exports = {
	MAP_DATA: MAP_DATA,
	process: process
}
},{"./controller.js":2,"./importer.js":4}],4:[function(require,module,exports){

var YARD_TO_METER = 0.9144,
    FOOT_TO_METER = 0.3048,
    INCH_TO_METER = 0.0254,
    METERS_PER_LEVEL = 3,
    DEFAULT_HEIGHT = 5,

    clockwise = 'CW',
    counterClockwise = 'CCW';


module.exports = {

  YARD_TO_METER: YARD_TO_METER,
  FOOT_TO_METER: FOOT_TO_METER,
  INCH_TO_METER: INCH_TO_METER,
  METERS_PER_LEVEL: METERS_PER_LEVEL,
  DEFAULT_HEIGHT: DEFAULT_HEIGHT,

  clockwise: clockwise,
  counterClockwise: counterClockwise,

  // detect winding direction: clockwise or counter clockwise
  getWinding: function(points) {
    var x1, y1, x2, y2,
      a = 0,
      i, il;
    for (i = 0, il = points.length-3; i < il; i += 2) {
      x1 = points[i];
      y1 = points[i+1];
      x2 = points[i+2];
      y2 = points[i+3];
      a += x1*y2 - x2*y1;
    }
    return (a/2) > 0 ? this.clockwise : this.counterClockwise;
  },

  // enforce a polygon winding direcetion. Needed for proper backface culling.
  makeWinding: function(points, direction) {
    var winding = this.getWinding(points);
    if (winding === direction) {
      return points;
    }
    var revPoints = [];
    for (var i = points.length-2; i >= 0; i -= 2) {
      revPoints.push(points[i], points[i+1]);
    }
    return revPoints;
  },

  toMeters: function(str) {
    str = '' + str;
    var value = parseFloat(str);
    if (value === str) {
      return value <<0;
    }
    if (~str.indexOf('m')) {
      return value <<0;
    }
    if (~str.indexOf('yd')) {
      return value*this.YARD_TO_METER <<0;
    }
    if (~str.indexOf('ft')) {
      return value*this.FOOT_TO_METER <<0;
    }
    if (~str.indexOf('\'')) {
      var parts = str.split('\'');
      var res = parts[0]*this.FOOT_TO_METER + parts[1]*this.INCH_TO_METER;
      return res <<0;
    }
    return value <<0;
  },

  getRadius: function(points) {
    var minLat = 90, maxLat = -90;
    for (var i = 0, il = points.length; i < il; i += 2) {
      minLat = min(minLat, points[i]);
      maxLat = max(maxLat, points[i]);
    }

    return (maxLat-minLat) / RAD * 6378137 / 2 <<0; // 6378137 = Earth radius
  },

  materialColors: {
    brick:'#cc7755',
    bronze:'#ffeecc',
    canvas:'#fff8f0',
    concrete:'#999999',
    copper:'#a0e0d0',
    glass:'#e8f8f8',
    gold:'#ffcc00',
    plants:'#009933',
    metal:'#aaaaaa',
    panel:'#fff8f0',
    plaster:'#999999',
    roof_tiles:'#f08060',
    silver:'#cccccc',
    slate:'#666666',
    stone:'#996666',
    tar_paper:'#333333',
    wood:'#deb887'
  },

  baseMaterials: {
    asphalt:'tar_paper',
    bitumen:'tar_paper',
    block:'stone',
    bricks:'brick',
    glas:'glass',
    glassfront:'glass',
    grass:'plants',
    masonry:'stone',
    granite:'stone',
    panels:'panel',
    paving_stones:'stone',
    plastered:'plaster',
    rooftiles:'roof_tiles',
    roofingfelt:'tar_paper',
    sandstone:'stone',
    sheet:'canvas',
    sheets:'canvas',
    shingle:'tar_paper',
    shingles:'tar_paper',
    slates:'slate',
    steel:'metal',
    tar:'tar_paper',
    tent:'canvas',
    thatch:'plants',
    tile:'roof_tiles',
    tiles:'roof_tiles'
  },

  // cardboard
  // eternit
  // limestone
  // straw

  getMaterialColor: function(str) {
    str = str.toLowerCase();
    if (str[0] === '#') {
      return str;
    }
    return this.materialColors[this.baseMaterials[str] || str] || null;
  },

  // aligns and cleans up properties in place
  alignProperties: function(prop) {
    var item = {};

    prop = prop || {};

    item.height = this.toMeters(prop.height);
    if (!item.height) {
      if (prop['building:height']) {
        item.height = this.toMeters(prop['building:height']);
      }
      if (prop.levels) {
        item.height = prop.levels*this.METERS_PER_LEVEL <<0;
      }
      if (prop['building:levels']) {
        item.height = prop['building:levels']*this.METERS_PER_LEVEL <<0;
      }
      if (!item.height) {
        item.height = DEFAULT_HEIGHT;
      }
    }

    item.minHeight = this.toMeters(prop.min_height);
    if (!item.min_height) {
      if (prop['building:min_height']) {
        item.minHeight = this.toMeters(prop['building:min_height']);
      }
      if (prop.min_level) {
        item.minHeight = prop.min_level*this.METERS_PER_LEVEL <<0;
      }
      if (prop['building:min_level']) {
        item.minHeight = prop['building:min_level']*this.METERS_PER_LEVEL <<0;
      }
    }

    item.wallColor = prop.wallColor || prop.color;
    if (!item.wallColor) {
      if (prop.color) {
        item.wallColor = prop.color;
      }
      if (prop['building:material']) {
        item.wallColor = this.getMaterialColor(prop['building:material']);
      }
      if (prop['building:facade:material']) {
        item.wallColor = this.getMaterialColor(prop['building:facade:material']);
      }
      if (prop['building:cladding']) {
        item.wallColor = this.getMaterialColor(prop['building:cladding']);
      }
      // wall color
      if (prop['building:color']) {
        item.wallColor = prop['building:color'];
      }
      if (prop['building:colour']) {
        item.wallColor = prop['building:colour'];
      }
    }

    item.roofColor = prop.roofColor;
    if (!item.roofColor) {
      if (prop['roof:material']) {
        item.roofColor = this.getMaterialColor(prop['roof:material']);
      }
      if (prop['building:roof:material']) {
        item.roofColor = this.getMaterialColor(prop['building:roof:material']);
      }
      // roof color
      if (prop['roof:color']) {
        item.roofColor = prop['roof:color'];
      }
      if (prop['roof:colour']) {
        item.roofColor = prop['roof:colour'];
      }
      if (prop['building:roof:color']) {
        item.roofColor = prop['building:roof:color'];
      }
      if (prop['building:roof:colour']) {
        item.roofColor = prop['building:roof:colour'];
      }
    }

    switch (prop['building:shape']) {
      case 'cone':
      case 'cylinder':
        item.shape = prop['building:shape'];
      break;

      case 'dome':
        item.shape = 'dome';
      break;

      case 'sphere':
        item.shape = 'cylinder';
      break;
    }

    if ((prop['roof:shape'] === 'cone' || prop['roof:shape'] === 'dome') && prop['roof:height']) {
      item.shape = 'cylinder';
      item.roofShape = prop['roof:shape'];
      item.roofHeight = this.toMeters(prop['roof:height']);
    }

    if (item.roofHeight) {
      item.height = max(0, item.height-item.roofHeight);
    } else {
      item.roofHeight = 0;
    }

    return item;
  }
};

},{}],5:[function(require,module,exports){


// Loader is responsible for fetching data from the Overpass API

var OSM_XAPI_URL = 'http://overpass-api.de/api/interpreter?data=[out:json];(way[%22building%22]({s},{w},{n},{e});node(w);way[%22building:part%22=%22yes%22]({s},{w},{n},{e});node(w);relation[%22building%22]({s},{w},{n},{e});way(r);node(w););out;';
var FAKE_OVERPASS = '/test/fake_osm.json'

var req = new XMLHttpRequest();

function xhr(url, param, callback) {

	url = url.replace(/\{ *([\w_]+) *\}/g, function(tag, key) {
		return param[key] || tag;
	});

	// function changeState(state) {
	// 	if ('XDomainRequest' in win && state !== req.readyState) {
	// 	  req.readyState = state;
	// 	  if (req.onreadystatechange) {
	// 	    req.onreadystatechange();
	// 	  }
	// 	}
	// }

	req.onerror = function() {
		req.status = 500;
		req.statusText = 'Error';
//		changeState(4);
	};

	req.ontimeout = function() {
		req.status = 408;
		req.statusText = 'Timeout';
//		changeState(4);
	};

	req.onprogress = function() {
//		changeState(3);
	};

	req.onload = function() {
		req.status = 200;
		req.statusText = 'Ok';
//		changeState(4);
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

//	changeState(0);
	req.open('GET', url);
//	changeState(1);
	req.send(null);
//	changeState(2);

};




// load fetches data from the Overpass API for the given bounding box
// bbox --> a four float array consisting of [ <min lon>, <min lat>, <max lon>, <max lat> ], 
// callback --> a callback function to be called when the data is returned
function load( bbox, callback ) {
	var params = {
		e: bbox[2],
		n: bbox[3],
		s: bbox[1],
		w: bbox[0]
	}
	//xhr( OSM_XAPI_URL, params, callback );
	xhr( FAKE_OVERPASS, params, callback );
}

module.exports = {
	load: load
}
},{}],6:[function(require,module,exports){

var loader = require("./loader.js"),
	data = require("./data.js");
	Builder = require("./builder.js");

function loadData( scene, bbox, params ) {
	
	// TODO Actually consider the params...
	// 		check and process things, etc...
	params = params || {};

	var scale = params.scale || 100000;

	var builder = new Builder( scene, scale, [ 114.15, 22.2675 ] );
	
	loader.load( bbox, data.process );

}

window.OSM3 = {
	loadData: loadData
}

},{"./builder.js":1,"./data.js":3,"./loader.js":5}]},{},[6])