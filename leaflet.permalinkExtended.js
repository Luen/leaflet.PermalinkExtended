// Modified by Luen Warnek
L.Permalink = {
    //gets the map center, zoom-level and rotation from the URL if present, else uses default values
    getMapLocation: function (zoom, center, basemap, overlays) {
        'use strict';
        zoom = (zoom || zoom === 0) ? zoom : 18;
        center = (center) ? center : [52.26869, -113.81034];
        basemap = (basemap) ? basemap : 'outdoor';
        overlays = (overlays) ? overlays : [];

        var hash = window.location.hash;
        if (hash !== '') {
            var hash = hash.replace('#', '');
            var parts = hash.split(',');
            if (parts.length === 3 || parts.length === 4 || parts.length === 5) {
                center = {
                    lat: parseFloat(parts[0]),
                    lng: parseFloat(parts[1])
                };
                zoom = parseInt(parts[2].slice(0, -1), 10);
            }
            if (parts.length === 4 || parts.length === 5) {
                basemap = parts[3];
            }
            if (parts.length === 5) {
              overlays = parts[4].split("/");
            }
        } else {
          // restore from cookie
          var permalinkCookie = Cookies.get('permalinkCookie');
          if (permalinkCookie) {
            var state = JSON.parse(permalinkCookie);
            zoom = state.zoom;
            center = state.center;
            basemap = state.basemap;
            overlays = state.overlays;
            hash = state.hash;
            //delete state.hash;
            window.history.pushState(state, 'map', hash);
          }
        }
        //if (overlays.length > 0) {
          return {zoom: zoom, center: center, basemap: basemap, overlays: overlays};
        //} else {
        //  return {zoom: zoom, center: center, layer: layer};
        //}
    },

    setup: function (map) {
        'use strict';
        var shouldUpdate = true;
        var updatePermalink = function () {
            if (!shouldUpdate) {
                // do not update the URL when the view was changed in the 'popstate' handler (browser history navigation)
                shouldUpdate = true;
                return;
            }

            var center = map.getCenter();
            var layers = map._layers;

            // get overlay value from elsewhere deep in object and add to object.
            //var layersAll = layers[Object.keys(layers)[0]]._events.remove[2].ctx._layers;
            var layersAll = layers[Object.keys(layers)[0]]._events.add[0].ctx._layers;
            for (var i = 0; i < layersAll.length; i++) {
              var layer_id = layers[layersAll[i].layer._leaflet_id];
              if (typeof layer_id != "undefined") {
                layer_id["overlay"] = layersAll[i].overlay;
              }
            }

            var basemap,
                overlays = [];

            var keys = Object.keys(layers);
            keys.forEach(function(key) {
              var layer = layers[key];
              if (layer) {
                var layer_options = layer.options;
                if ("id" in layer_options){ // if layer
                  if (!layer.overlay) { //basemap
                    basemap = layer_options.id;
                  } else { //overlay
                    overlays.push(layer_options.id);
                  }
                }
              }
            });
            //console.log(basemap);
            //console.log(overlays);
            overlays = (overlays.length > 0) ? overlays.join('/') : '';

            var hash = '#' +
                    Math.round(center.lat * 100000) / 100000 + ',' +
                    Math.round(center.lng * 100000) / 100000 + ',' +
                    map.getZoom() + 'z';
            if (basemap != "outdoor" || overlays.length > 0) {
              hash += ','+basemap;
            }
            if (overlays.length > 0) {
              hash += ','+overlays;
            }
            var state = {
                zoom: map.getZoom(),
                center: center,
                basemap: basemap,
                overlays: overlays
            };
            window.history.pushState(state, 'map', hash);
            state['hash'] = hash;
            Cookies.set('permalinkCookie', JSON.stringify(state), { expires: 7 });
        };

        map.on('moveend', updatePermalink);
        map.on('baselayerchange', updatePermalink);
        map.on('overlayadd', updatePermalink);
        map.on('overlayremove', updatePermalink);

        // restore the view state when navigating through the history, see
        // https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate
        window.addEventListener('popstate', function (event) {
            if (event.state === null) {
                return;
            }
            map.setView(event.state.center, event.state.zoom);
            shouldUpdate = false;
        });
    }
};
