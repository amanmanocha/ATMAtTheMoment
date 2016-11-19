
var infowindow;
angular.module('starter', ['ionic', 'ngCordova'])
 .run(function ($ionicPlatform) {
     $ionicPlatform.ready(function () {
         if (window.cordova && window.cordova.plugins.Keyboard) {
             cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
             cordova.plugins.Keyboard.disableScroll(true);
         }
         if (window.StatusBar) {
             StatusBar.styleDefault();
         }
     });
 })
 .controller(
  'MapCtrl', [
   '$scope',
   '$http',
   '$cordovaGeolocation',
   function ($scope, $http, $cordovaGeolocation) {
       function initialize() {
           var options = { timeout: 5000, enableHighAccuracy: false };
           $cordovaGeolocation.getCurrentPosition(options).then(locationLoaded, locationNotLoaded);

           $scope.disableTap = function () {
               var container = document.getElementsByClassName('pac-container');
               angular.element(container).attr('data-tap-disabled', 'true');
               var backdrop = document.getElementsByClassName('backdrop');
               angular.element(backdrop).attr('data-tap-disabled', 'true');
               angular.element(container).on("click", function () {
                   document.getElementById('pac-input').blur();
               });
           };

           function locationNotLoaded(error) {
               var latLng = { lat: 28.613939, lng: 77.209021 };
               showLocation(latLng);
           }

           function locationLoaded(position) {
               var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
               showLocation(latLng);
           }

           function prepareAutoComplete( map) {
               var input = (document.getElementById('pac-input'));
               var autocomplete = new google.maps.places.Autocomplete(input);
               autocomplete.bindTo('bounds', map);
               map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

               return autocomplete;
           }

           function showLocation(latLng) {
               var mapOptions = {
                   center: latLng,
                   zoom: 17,
                   mapTypeId: google.maps.MapTypeId.ROADMAP,
                   disableDefaultUI: true,
               }

               var map = new google.maps.Map(document.getElementById('map'), mapOptions);
               var service = new google.maps.places.PlacesService(map);

               markAllAtmsInTheArea(latLng);
               var autocomplete = prepareAutoComplete(map);

               
               function callback(results, status) {
                   if (status == google.maps.places.PlacesServiceStatus.OK) {
                       for (var i = 0; i < results.length; i++) {
                           var place = results[i];
                           createMarker(results[i]);
                       }
                   }
               }

               function createMarker(place) {
                   var placeLoc = place.geometry.location;

                   var marker = new google.maps.Marker({
                       map: map,
                       position: place.geometry.location
                   });

                   google.maps.event.addListener(
                    marker,
                    'click',

                    function () {
                        console.log(place.id);

                        fetch(place);
                        infowindow.open(map, this);
                    });

                   $http.get(
                           "https://e5vpc3sxzd.execute-api.ap-southeast-1.amazonaws.com/atm/status/" + place.id)
                          .then(
                                 function (response) {
                                     if (response.data.Count != 0) {
                                         if (response.data.List[0].cash === "true") {
                                             marker.setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png');
                                         } else {
                                             marker.setIcon('http://maps.google.com/mapfiles/ms/icons/red-dot.png');
                                         }
                                     }
                                 });


                   return marker;
               }


               function fetch(place) {

                   httpBackup = $http;
                   $http.get(
                     "https://e5vpc3sxzd.execute-api.ap-southeast-1.amazonaws.com/atm/status/" + place.id)
                    .then(
                     function (response, $http) {

                         var head =
                             "<h2>" + place.name + "</h2>";

                         var takeInput =
                               "<div style=\"display: none;\" id=\"TakeUpdate\">\r\n " +
                           "<form name=\"myForm\"  method=\"post\">" +
                           "\r\n<input type=\"hidden\" id=\"id\" name=\"id\" value=" + place.id + " />" +
                           "\r\n<input type=\"hidden\" id=\"time\" name=\"time\" value=" + new Date().getTime() + " />" +
                           "\r\nCash: <input type=\"checkbox\" id=\"cash\" name=\"cash\" />" +
                       "\r\nQueue: <input type=\"checkbox\" id=\"queue\" name=\"queue\" />" +

                       "\r\n<input type=\"button\" onClick=\"post()\" value=\"Submit\" />" +
                       "</form>" +
                       "</div>";
                         if (response.data.Count == 0) {
                             var dontKnow = "<p>There is no recent update about this ATM. Please help others if you have any : </p>"
                             infowindow.setContent(head + dontKnow + takeInput);
                             document.getElementById("TakeUpdate").style.display = "block";

                         } else {

                             var content =

                                   "<div id=\"Updated\">\r\n " +

                                   " <p>As of " + new Date(response.data.List[0].time).toLocaleString() + "<p>\r\n" +
                                   " <p>Cash   " + (response.data.List[0].cash === "true" ? "Yes" : "No") + "<p>\r\n" +
                                   " <p>Queue   " + (response.data.List[0].queue === "true" ? "Yes" : "No") + "<p>\r\n" +
                                   " <button type=\"button\" onclick=\"takeUpdate()\">Have updates?</button>" +
                                   "</div>";
                             infowindow.setContent(head + content + takeInput);
                         }


                     });
               }
               
               function markAllAtmsInTheArea(position) {

                   var request = {
                       location: position,
                       mapTypeId: google.maps.MapTypeId.ROADMAP,
                       disableDefaultUI: true,
                       radius: '2500',
                       types: ['atm']
                   };


                   service.nearbySearch(request, callback);
                   infowindow = new google.maps.InfoWindow();

                   






               }

               var handle = function () {
                   var place = autocomplete.getPlace();
                   if (!place.geometry) {
                       return;
                   }
                   if (place.geometry.viewport) {
                       map.fitBounds(place.geometry.viewport);
                   } else {
                       map.setCenter(place.geometry.location);
                       map.setZoom(100);
                   }
                   markAllAtmsInTheArea(place.geometry.location);

               }

               google.maps.event.addListener(
                autocomplete,
                'place_changed',
                handle
                );

           }

       }


       google.maps.event.addDomListener(window, 'load', initialize);
   }
  ])




function takeUpdate() {
    document.getElementById("Updated").style.display = "none";
    document.getElementById("TakeUpdate").style.display = "block";
}

function post() {
    var id = document.getElementById("id").value;
    var data = {
        id: document.getElementById("id").value,
        time: document.getElementById("time").value,
        cash: document.getElementById("cash").checked,
        queue: document.getElementById("queue").checked,

    }
    var anchor = infowindow.anchor;
    $.ajax({

        type: "POST",
        url: "https://e5vpc3sxzd.execute-api.ap-southeast-1.amazonaws.com/atm/status",
        dataType: "json",
        contentType: "application/json",
        success: function (data) {

            $.ajax({
                type: "GET",
                url: "https://e5vpc3sxzd.execute-api.ap-southeast-1.amazonaws.com/atm/status/" + id,
                success:
                          function (response) {
                              if (response.Count != 0) {
                                  if (response.List[0].cash === "true") {
                                      anchor.setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png');
                                  } else {
                                      anchor.setIcon('http://maps.google.com/mapfiles/ms/icons/red-dot.png');
                                  }
                              }
                          }

            });
            infowindow.close();
        },
        data: JSON.stringify(data)
    }
		);
}