
var importer = require('./importer.js' );

function constructor( finalCallback, filterCallback ) {

	var _nodes = {},
		_ways = {},
		_relations = {},
		MAP_DATA = [];


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
		    	if (outerFootprint = getFootprint(outerWay.nodes)) {
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


	this.parse = function( osmData ) {
		var item, buildData;
		for ( var i = 0, len = osmData.elements.length; i < len; i++ ) {
			item = osmData.elements[i];
			switch ( item.type ) {
				case 'node': processNode( item ); break;
				case 'way': processWay( item ); break;
				case 'relation': processRelation( item ); break;
			}
		}
		( filterCallback ) ? buildData = filterCallback.call( this, MAP_DATA )
						   : buildData = MAP_DATA;
		finalCallback.apply( this, [ buildData ] );
	}


}

module.exports = constructor;