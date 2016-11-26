
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

           function prepareAutoComplete(map) {
               var input = (document.getElementById('pac-input'));
               var autocomplete = new google.maps.places.Autocomplete(input);
               autocomplete.bindTo('bounds', map);
               map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

               return autocomplete;
           }

           function showLocation(latLng) {
               var map = createMap(latLng);
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
                   var marker = new google.maps.Marker({
                       map: map,
                       icon:"img/grey.png",
                       position: place.geometry.location
                   });

                   google.maps.event.addListener(
                    marker,
                    'click',

                    function () {
                        console.log(place.id);

                        function prepareInfoWindow(response) {

                            var head = "<h4>" + place.name + "</h4>";
                            
                            var takeCash = "<div style=\"display: none;\" id=\"TakeCash\">" +
                            					"<div class=\"container\">\r\n" +
                            					"<input type = \"hidden\" value = " +place.id+ " name = \"id\" id = \"id\">"+
                            					"<input type = \"hidden\" value = " +new Date().getTime()+ " name = \"time\" id = \"time\">"+

                            					"<button onclick=\"showQueue()\" >has cash<\/button>\r\n" +
                            					"<button onclick=\"noCash()\" >no cash<\/button>" +
                            					"\r\n<\/div>\r\n\r\n" +
                            					"</div>";
                            
                            var takeQueue = "<div style=\"display: none;\" id=\"TakeQueue\" >" +
        										"<div class=\"container\">\r\n" +

                            					"<div>Wait time : </div>"+
        										"<button onclick=\"noWait()\" >not much<\/button>\r\n" +
        										"<button onclick=\"mediumWait()\" >around 30 minutes<\/button>\r\n" +
        										"<button onclick=\"longWait()\" >lot more<\/button>\r\n" +
        										"<\/div>\r\n\r\n" +
        										"</div>";
                            
                            if (response.data.Count == 0) {
                                var dontKnow = "<p>There is no recent update about this ATM. Please help others if you have any : </p>"
                                infowindow.setContent(head + dontKnow + takeCash + takeQueue);
                                document.getElementById("TakeCash").style.display = "block";

                            } else {

                                var content =
                                      "<div id=\"Updated\">\r\n " +
                                      " <p>As reported " + prettyDate((response.data.List[0].time)) + 
                                      ", the ATM " + status(response.data.List[0].cash) + "<p>\r\n" +
                                      " <button type=\"button\" onclick=\"TakeCash()\">Have updates?</button>" +
                                      "</div>";
                                infowindow.setContent(head + content + takeCash + takeQueue);
                            }
                            
                            function status(cash) {
                            	if(cash === "yes") {
                            		return "has cash with not much wait time.";
                            	} else if(cash === "medium") {
                            		return "has cash with around thirty minutes wait time.";
                            	} else if(cash === "long") {
                            		return "has cash with around really long wait time.";
                            	} else {
                            		return "does't have cash.";
                            	}
                            }


                        }

                        fetch(place, prepareInfoWindow);
                        infowindow.open(map, this);
                    });

                   function colorMarker(response) {
                       if (response.data.Count != 0) {
                           if (response.data.List[0].cash === "yes") {
                               marker.setIcon('img/green.png');
                           } else if (response.data.List[0].cash === "medium") {
                               marker.setIcon('img/yellow.png');
                           } else if (response.data.List[0].cash === "no") {
                               marker.setIcon('img/red.png');
                           } else {
                        	   marker.setIcon('img/yellow.png');
                           }
                       } else {
                    	   marker.setIcon('img/grey.png');
                       }
                   }


                   fetch(place, colorMarker);


                   return marker;
               }


               function fetch(place, action) {
                   $http.get("https://e5vpc3sxzd.execute-api.ap-southeast-1.amazonaws.com/atm/status/" + place.id)
                    .then(action);
               }

               function markAllAtmsInTheArea(position) {

                   var request = {
                       location: position,
                       mapTypeId: google.maps.MapTypeId.ROADMAP,
                       disableDefaultUI: true,
                       radius: '2500',
                       types: ['atm']
                   }

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

           function createMap(latLng) {
               var mapOptions = {
                   center: latLng,
                   zoom: 17,
                   mapTypeId: google.maps.MapTypeId.ROADMAP,
                   disableDefaultUI: true,
               }

               return new google.maps.Map(document.getElementById('map'), mapOptions);
           }
       }


       google.maps.event.addDomListener(window, 'load', initialize);
   }
  ])



function TakeCash() {
    document.getElementById("Updated").style.display = "none";
    document.getElementById("TakeCash").style.display = "block";
}

function showQueue() {
	document.getElementById("TakeCash").style.display = "none";
    

    document.getElementById("TakeQueue").style.display = "block";
}

function noCash() {
    post("no");
}

function noWait() {
    post("yes");
}

function mediumWait() {
    post("medium");
}

function longWait() {
    post("long");
}

function post(cashVal) {
	 var id = document.getElementById("id").value;
	 var data = {
	   id: document.getElementById("id").value,
	   time: document.getElementById("time").value,
	   cash: "" + cashVal
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
                			  console.log(response.Count);
                              if (response.Count != 0) {
                                  if (response.Count != 0) {
                                      if (response.List[0].cash === "yes") {
                                    	  anchor.setIcon('img/green.png');
                                      } else if (response.List[0].cash === "medium") {
                                    	  anchor.setIcon('img/yellow.png');
                                      } else if (response.List[0].cash === "no") {
                                    	  anchor.setIcon('img/red.png');
                                      } else {
                                    	  anchor.setIcon('img/yellow.png');
                                      }
                                  } else {
                                	  anchor.setIcon('img/grey.png');
                                  }
                                  
                              } else {
                                  anchor.setIcon('img/grey.png');
                              }
                          }

            });
            infowindow.setContent("");
            infowindow.close();
        },
        data: JSON.stringify(data)
    }
		);
}