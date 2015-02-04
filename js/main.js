(function (win) {
  var $ = win.$ || document.querySelector.bind(document);
  var $$ = win.$$ || document.querySelectorAll.bind(document);
  var address_element = $('#address');
  var directions_element = $('#directions');
  var user_loc;
  var nearby = [];
  var map;
  var autocomplete;
  var directions_service;
  var directions_renderer;

function init() {
  user_loc = new google.maps.LatLng(34.166711, -118.375128);
  navigator.geolocation.getCurrentPosition(function(l) {
    user_loc = null;
    user_loc = new google.maps.LatLng(l.coords.latitude, l.coords.longitude);
    map && map.setCenter(user_loc);
  });
  
  map = new google.maps.Map(document.getElementById('map-canvas'), {
    center: user_loc,
    zoom: 17
  });
  google.maps.event.addListener(map, 'bounds_changed', _.debounce(function getNearby () {
    var toRemove = [];
    _.each(nearby, function (place) {
      if (!isPlaceVisibleTo(map, place)) {
        toRemove.push(place);
      }
    });
    _.each(toRemove, removePlace);
    nearby = _.compact(nearby)
    toRemove = null;
    // XHR for nearby
    var xhr = new XMLHttpRequest();
    xhr.open('get', '/nearby?'+'latlng='+map.getCenter().toUrlValue());
    xhr.onreadystatechange = function () {
      if (!(xhr.readyState === 4 && xhr.status === 200)) {return;}
      nearby = JSON.parse(xhr.responseText);
      _.each(nearby, handlePlace);
    };
    xhr.send();
  }, 750));
  directions_service = new google.maps.DirectionsService();
  directions_renderer = new google.maps.DirectionsRenderer();
  autocomplete = new google.maps.places.Autocomplete(address_element, {
    types:['establishment']
  });
  autocomplete.bindTo('bounds', map);
  google.maps.event.addListener(autocomplete, 'place_changed', placeChanged);
}

function handlePlace (place) {
  if (place.marker) return;
  var marker = new google.maps.Marker({
    map: map,
    anchorPoint: new google.maps.Point(0, -29)
  });
  marker.setIcon({
    url: place.icon,
    size: new google.maps.Size(71, 71),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(17, 34),
    scaledSize: new google.maps.Size(35, 35)
  });
  marker.setPosition(new google.maps.LatLng(place.lat, place.lng));
  var infowindow = new google.maps.InfoWindow();
  place.marker = marker;
  place.infowindow = infowindow;
  google.maps.event.addListener(marker, 'click', function showInfoGetDirections () {
    directions_service.route(
      {
        origin: user_loc,
        destination: marker.getPosition(),
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.IMPERIAL
      },
      function (directions, status) {
        if (status != google.maps.DirectionsStatus.OK) {
          infowindow.setContent('No Route');
        } else {
          infowindow.setContent(
            '<div><strong>' + place.name + '</strong></div>' +
            '<div>' + place.vicinity + '</div>' +
            '<div>' + directions.routes[0].legs[0].distance.text + ' away</div>'
          );
          directions_renderer.setDirections(directions);
          directions_renderer.setMap(map);
          directions_renderer.setPanel(directions_element);
        }
        infowindow.open(map, marker);
        google.maps.event.addListener(infowindow, 'closeclick', function () {
          // hide infowindow
          directions_renderer.setMap(null);
          directions_renderer.setPanel(null);
        });
      }
    );
  });
  marker.setVisible(true);
}

function isPlaceVisibleTo(map, place) {
  return place.marker && map.getBounds().contains(place.marker.getPosition()) ;
}

function placeChanged () {
  var place = autocomplete.getPlace();
  if (!place.geometry) return;
  var infowindow = new google.maps.InfoWindow();
  var marker = new google.maps.Marker({
    map: map,
    anchorPoint: new google.maps.Point(0, -29)
  });
  if (place.geometry.viewport) {
    map.fitBounds(place.geometry.viewport);
  } else {
    map.setCenter(place.geometry.location);
    map.setZoom(17);
  }
  marker.setIcon({
    url: place.icon,
    size: new google.maps.Size(71, 71),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(17, 34),
    scaledSize: new google.maps.Size(35, 35)
  });
  marker.setPosition(place.geometry.location);
  marker.setVisible(true);
  win.addPlace = makeAddPlace(place, marker, infowindow);
  google.maps.event.addListener(marker, 'click', function addPlace () {
    infowindow.setContent(
      '<button type="button" onclick="addPlace(event)">' +
      'Add ' + place.name +
      '</button>'
    );
    infowindow.open(map, marker);
  });
}

function removePlace (place) {
  removeMarker(place);
  removeInfoWindow(place);
  place = null;
}

function removeMarker(place) {
  removeThing('marker', place);
}
function removeInfoWindow(place) {
  removeThing('infowindow', place);
}

function removeThing(name, place, _undefined) {
  if (_undefined == place[name]) return;
  place[name].setMap(null);
  place[name] = null;
  delete place[name];
}

function makeAddPlace (place, marker, infowindow) {
  return function addPlace (ev) {
    console.dir(ev);
    console.dir(place);
    console.dir(marker);
    console.dir(infowindow);
    var distance = -1;
    directions_service.route(
      {
        origin: user_loc,
        destination: marker.getPosition(),
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.IMPERIAL
      },
      function (directions, status) {
        if (status != google.maps.DirectionsStatus.OK) {
          return;
        }
        distance = directions.routes[0].legs[0].distance.value;
        var xhr = new XMLHttpRequest();
        xhr.open('post', '/nearby');
        xhr.onreadystatechange = function () {
          if (!(xhr.readyState === 4 && xhr.status === 200)) {return;}
          marker.setMap(null);
          infowindow.setMap(null);
          marker = null;
          infowindow = null;
        };
        xhr.send(JSON.stringify({
          place_id: place.place_id,
          name: place.name,
          vicinity: place.vicinity,
          icon: place.icon,
          distance: distance,
          latlng: place.geometry.location.toUrlValue()
        }));
      }
    );
  }
}

google.maps.event.addDomListener(window, 'load', init);
}(window));