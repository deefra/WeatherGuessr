const apiKey = '';

var map = L.map('map').setView([0, 0], 1);

L.tileLayer(`https://api.maptiler.com/maps/topo-v2/{z}/{x}/{y}.png?key=${apiKey}`, {
attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
}).addTo(map);

const geocoder = L.Control.Geocoder.nominatim();

let markers = [];

function onMapClick(e) {
    let lat = parseFloat(e.latlng.lat.toFixed(4));
    let lon = parseFloat(e.latlng.lng.toFixed(4));

    markers.forEach(marker => {
        map.removeLayer(marker);
    })

    markers = [];

    const newMarker = L.marker([lat, lon]).addTo(map);
    markers.push(newMarker);

    geocoder.reverse(e.latlng, map.options.crs.scale(map.getZoom()), function(results) {
        if (results.length > 0) {
            var countryName = results[0].properties.address.country;
            document.getElementById('userInput').value = countryName;
            
        } else {
           document.getElementById('userInput').value = 'Not a country!';
        }
    });
    
} map.on('click', onMapClick);
 