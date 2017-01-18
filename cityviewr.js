var mapEl = document.querySelector('a-map');
var currentLocationEl = document.querySelector('#current-location');
var setProperty = window.AFRAME.utils.entity.setComponentProperty;
var queryData = ['Marokko_19','NederlandseAntillenEnAruba_20','Suriname_21','Turkije_22','OverigNietWesters_23'];


//http://opendata.cbs.nl/ODataApi/odata/83220NED/TypedDataSet?$filter=(substringof('WK0363',WijkenEnBuurten))&$select=WijkenEnBuurten,Marokko_19,NederlandseAntillenEnAruba_20,Suriname_21,Turkije_22,OverigNietWesters_23
//max = Object.keys(obj).reduce(function(m, k){ return obj[k] > m ? obj[k] : m }, -Infinity);

//helper function to find index of item in array
function findWithAttr(array, attr, value) {
    for (var i = 0; i < array.length; i += 1) {
        if (array[i][attr] === value) {
            return i;
        }
    }
    return -1;
}


// add bar which will show data by height and color
function addMarker(position, id) {
    var marker = document.createElement('a-entity');
    var point = document.createElement('a-box');
    point.setAttribute('height', 0.3);
    point.setAttribute('width', 0.03);
    point.setAttribute('depth', 0.03);
    point.setAttribute('rotation', {
        x: 90,
        y: 0,
        z: 0
    });
    point.setAttribute('position', position);
    point.setAttribute('color', 'lime');
    point.setAttribute('class', 'bar');
    point.setAttribute('bar', id);
    point.setAttribute('id', id + 0);
    point.setAttribute('visible', false);
    marker.appendChild(point);
    mapEl.appendChild(marker);
    return marker;
}

function fillMenuButton(vartext, id, number, type) {
    var buttontext = document.getElementById('menutext' + number);
    var str = 'color:white'.concat('; text: ', vartext, ';');
    buttontext.setAttribute('bmfont-text', str);
    buttontext.setAttribute('visible', true);
    var buttonpanel = document.getElementById('menupanel' + number);
    buttonpanel.setAttribute('submenu', id);
    if (type == 'TopicGroup') {
        buttonpanel.setAttribute('opacity', .2);
    } else {
        buttonpanel.setAttribute('opacity', 0);
    }
}


function addVarButton(vartext, classname, id, count) {
    var selection_panel = document.getElementById('selection_panel');
    var button = document.createElement('a-entity');
    var str = 'color:white'.concat('; text: ', vartext, ';');
    button.setAttribute('bmfont-text', str);
    button.setAttribute('class', 'menubutton');
    button.setAttribute('id', 'menutext' + count);
    button.setAttribute('scale', "0.4 0.4 0.4");
    button.setAttribute('width', "20");
    button.setAttribute('visible', true);
    var posx = -0.6;
    var cnt = count;
    console.log(cnt);

    var posy = 0.4 - (cnt / 12);
    var position = posx + " " + posy + " 0.01";
    button.setAttribute('position', position);
    var menuPanel = document.createElement('a-plane');
    menuPanel.setAttribute('class', 'menupanel');
    menuPanel.setAttribute('id', 'menupanel' + count);
    menuPanel.setAttribute('width', '3');
    menuPanel.setAttribute('height', '0.2');
    menuPanel.setAttribute('color', 'gray');
    menuPanel.setAttribute('position', "1.4 0.08 -0.01");
    menuPanel.setAttribute('submenu', id);
    button.appendChild(menuPanel);
    selection_panel.appendChild(button);
    return button;
}


function get_CBS_varnames() {
    //Get data categories from CBS Open Data
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            console.log(JSON.parse(xhr.responseText));
            variables = JSON.parse(xhr.responseText).value;
            console.log(variables);
            menuLookup = {};
            for (var i = 0, len = variables.length; i < len; i++) {
                menuLookup[variables[i].ID] = variables[i];
            }
            //create array where categories have children instead of a parent
            variables = variables.reduce(function(map, node) {
                map.i[node.ID] = node;
                node.children = [];
                node.ParentID === null ?
                    map.result.push(node) :
                    map.i[node.ParentID].children.push(node);
                return map;
            }, {
                i: {},
                result: []
            }).result;
            //remove some unnecessary items from menuData
            var remove = ['Wijken en buurten', 'Regioaanduiding', 'Postcode'];
            for (var i = 0; i < remove.length; i++) {
                var index = findWithAttr(variables, 'Title', remove[i]);
                if (index > -1) {
                    variables.splice(index, 1);
                }
            }
            var CBSdata = {};
            CBSdata.Title = 'CBS data';
            CBSdata.ID = 999;
            CBSdata.Type = 'TopicGroup';
            CBSdata.children = variables;
            menuData[0] = CBSdata;
            console.log(menuData);

            button = addVarButton(menuData[0].Title, 'CBStopcat', menuData[0].ID, 0);
            menuLookup[999] = menuData[0];
            for (var i = 0; i < menuData[0]['children'].length; i++) {
                button = addVarButton(menuData[0]['children'][i].Title, 'CBStopcat', menuData[0]['children'][i].ID, i + 1);
            }


        }

    }
    xhr.open('GET', 'http://opendata.cbs.nl/ODataApi/odata/83220NED/DataProperties', true);
    xhr.send(null);
}


function onLocationUpdate(lat, long, width, height) {
    var halfWidth = width / 2;
    var halfHeight = height / 2;
    // Load demo data from Amsterdam (based on CBS wijken en buurten kaart)
    loadJSON('geojson/WK_GM0363.geojson', function(response) {
        response = {
            "type": "FeatureCollection",
            "features": JSON.parse(response)
        };
        for (var i = 0; i < response['features'].length; i++) {
            var district = {};
            district.center = turf.center(response['features'][i]['geometry']);
            district.long = district.center['geometry']['coordinates'][0];
            district.lat = district.center['geometry']['coordinates'][1];
            district.id = response['features'][i]['properties']['WK_CODE'];
            district.marker = addMarker({
                x: 0,
                y: 0,
                z: 0
            }, district.id);
            districtCache[district.id] = district;
        }
        Object.keys(districtCache).forEach(markerId => {
            var district = districtCache[markerId];
            var position = mapEl.components.map.project(district.long, district.lat);
            if (
                position.x > halfWidth ||
                position.x < -halfWidth ||
                position.y > halfHeight ||
                position.y < -halfHeight
            ) {
                setProperty(district.marker, 'visible', false);
            } else {
                setProperty(district.marker, 'visible', true);
            }
            //setProperty(district.marker, 'id', district.id+0);
            setProperty(district.marker, 'position', position);
            extra_markers = create_extra_markers(position, district.id);
        });
        //load default data
        loadJSON('data/default_data.json', function(response) {
            var data = JSON.parse(response);
            var max = Object.keys(data).reduce(function(m, k){ return data[k] > m ? data[k] : m }, -Infinity);
            barsSet = setBars(data.value, max);
          });
    });
}

function setBars(data, max){
    dataLookup = {};
    for (var i = 0, len = data.length; i < len; i++) {
        dataLookup[data[i]['WijkenEnBuurten'].trim()] = data[i];
    }
  console.log(dataLookup);
  nrOfItems = Object.keys(data[0]).length;
  var barColors = chroma.scale('YlOrBr').colors(nrOfItems-1);
  var vals = Object.keys(data).map(function(key) {
		return data[key];
	});
  var heights = [];
  var barData = [];
  for (var i=0; i<data.length;i++) {
		var wk = vals[i]['WijkenEnBuurten'];
		for (var j=1; j<nrOfItems;j++) {
      var barNr = j-1;
			var val = vals[i][queryData[barNr]];
      var color = barColors[barNr];
			heights.push(val);
			barData.push({"district":wk.trim()+barNr,"value":val, 'color':color});
		}
	}

	var maxBarValue = Math.max.apply(Math, heights);
  var allBars = document.getElementsByClassName('bar');
  for (var i=0; i<barData.length;i++){
    var bar = document.getElementById(barData[i]['district']);
    var height = barData[i]['value'];
    var position = new THREE.Vector3();
		position.setFromMatrixPosition(bar.object3D.matrixWorld);
    //position.y = (height/maxBarValue)/2;
    //bar.setAttribute('position', {position[x], position[y], z});
    //bar.object3D.position.set(position.x, position.y, position.z);
    bar.setAttribute('height', (height/maxBarValue));
    bar.setAttribute('color', barData[i]['color']);
    bar.setAttribute('visible', true);
  }
}

function create_extra_markers(position, id) {
    for (var i = 0; i < 4; i++) {
        var barNr = i + 1;
        var posx = position.x + 0.03 + i * 0.03;
        var posy = position.y;
        var posz = 0;
        var extra_markers = [];
        var marker = document.createElement('a-entity');
        var point = document.createElement('a-box');
        point.setAttribute('height', 0.2);
        point.setAttribute('width', 0.03);
        point.setAttribute('depth', 0.03);
        point.setAttribute('rotation', {
            x: 90,
            y: 0,
            z: 0
        });
        point.setAttribute('position', {
            x: posx,
            y: posy,
            z: posz
        });
        point.setAttribute('color', 'fuchsia');
        point.setAttribute('class', 'bar');
        point.setAttribute('bar', id);
        point.setAttribute('id', id + barNr);
        point.setAttribute('visible', false);
        marker.appendChild(point);
        mapEl.appendChild(marker);
        extra_markers.push(marker);
    }
    return extra_markers;
}

function addViveControls(){
  var scene = document.getElementById("scene");
  var leftcontrol = document.createElement('a-entity');
  var rightcontrol = document.createElement('a-entity');
  leftcontrol.setAttribute('vive-controls',"hand: left");
  rightcontrol.setAttribute('vive-controls',"hand: right");
  scene.appendChild(leftcontrol);
  scene.appendChild(rightcontrol);
  var cursor = document.getElementById('cursor');
  cursor.setAttribute('fuse', false);
}
//------------START------------------------------------------------------------

if (AFRAME.utils.checkHeadsetConnected()){
  addViveControls();
}
var menu = get_CBS_varnames();


// Once the map is loaded

mapEl.addEventListener('map-loaded', function() {
    mapEl.setAttribute('map', 'style', JSON.stringify(style));
    var geomData = mapEl.components.geometry.data;
    //Amsterdam centre (TODO: get centre and zoom from geojson data)
    var long = 4.895168;
    var lat = 52.370216;
    // center the map on that location
    setProperty(mapEl, 'map.center', long + ' ' + lat);
    // and zoom in: 20 is very zoomed in, 0 is really zoomed out
    setProperty(mapEl, 'map.zoom', '10');
    // Place the marker in the correct position
    setProperty(currentLocationEl, 'position', mapEl.components.map.project(long, lat));
    setProperty(currentLocationEl, 'visible', true);
    onLocationUpdate(lat, long, geomData.width, geomData.height);
});
