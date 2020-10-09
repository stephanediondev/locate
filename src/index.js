import L from 'leaflet';
import $ from 'jquery';

var facebook_api_prefix = '/v3.0';
var date_today = new Date();
var map_zoom = 16;
var map_latitude = 48.82718231870979;
var map_longitude = 2.369314539436349;
var center_on_me = 1;
var map;
var map_circles = [];
var map_markers = [];
var fb_places = [];
var hash_save = false;
var user = false;
var permissions_saved = {};
var permissions_recommended = {};
var marker_me = false;
var latlng_me = false;
var circle_colors = {1: '#40fd07', 2: '#75f612', 3: '#aaef1d', 4: '#dee729', 5: '#ffd731', 6: '#ffbb35', 7: '#ff9228', 8: '#f46c1e', 9: '#e04616', 10: '#bc220d'};
var icon_marker = new L.Icon.Default({'iconUrl': '../../../public/images/locatemarker.png', 'iconRetinaUrl': '../../../public/images/locatemarker.png', 'shadowUrl': '../../../public/images/marker-shadow.png'});
var icon_me = new L.Icon.Default({'iconUrl': '../../../public/images/locatemarker_me.png', 'iconRetinaUrl': '../../../public/images/locatemarker_me.png', 'shadowUrl': '../../../public/images/marker-shadow.png'});
var search_in_progress = 0;
function debug(response) {
    if (window.console && console.debug) {
        console.debug(response);
    } else if (window.console && console.log) {
        console.log(response);
    }
}
function ui_showsplash(href) {
    debug('show splash: ' + href);
    $('.panel').hide();
    $('.splash').hide();
    $(href).fadeIn();
}
function ui_hidesplash() {
    debug('hide splash');
    $('.splash').hide();
    $('.panel').show();
    ui_sethash();
}
function ui_setmessage(message) {
    debug('set message');
    $('#message').html(message);
    $('#message').show();
}
function ui_emptymessage() {
    debug('empty message');
    $('#message').hide();
    $('#message').html('');
}
function ui_sethash() {
    debug('set hash');
    if (hash_save) {
        window.location.hash = hash_save;
    } else {
        var hash_content = map_zoom + '/' + map_latitude + '/' + map_longitude;
        if ($('#field_q').val() != '') {
            var field_q = $('#field_q').val()
            field_q = field_q.replace(/(<([^>]+)>)/ig, '');
            hash_content += '/' + field_q;
        }
        window.location.hash = encodeURI(hash_content);
    }
}
function addZ(n) {
    return n < 10 ? '0' + n : n;
}
function map_init() {
    debug('init map');
    map = new L.map('map_canvas', {'scrollWheelZoom': true, 'center': [map_latitude, map_longitude], 'zoom': map_zoom, 'attributionControl': false});
    map.addControl(new L.Control.Attribution({'prefix': '<a href="#credits" class="ui_showsplash">Credits</a>'}));
    var urlTemplate = 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}';
    L.tileLayer(urlTemplate, {
        'maxZoom': 18,
        'tileSize': 512,
        'zoomOffset': -1,
        'errorTileUrl': '//locate.stephanedion.dev/app/icons/icon-256x256.png',
        'id': 'mapbox/streets-v11',
        'accessToken': 'pk.eyJ1IjoicHJvamVjdDI5ayIsImEiOiJjankxam1weHkwYWt3M2NvaWFvNWw5cHR3In0.VWdF2-OVDLU1Eeqvyqfkww'
    }).addTo(map);
    map.on('click', function(e) {
        ui_hidesplash();
    });
    map.on('zoomend', function(e) {
        map_refresh();
    });
    map.on('dragend', function(e) {
        map_refresh();
    });
    map.on('dblclick', function(e) {
        map_refresh();
    });
}
function map_refresh() {
    debug('refresh map');
    map_getcenter();
    map_getzoom();
    map_removecircles();
    fb_search();
    ui_sethash();
}
function map_setcenter(latitude, longitude) {
    debug('set center');
    map_latitude = latitude;
    map_longitude = longitude;
    map.setView([latitude, longitude], map_zoom);
}
function map_setcircle(latitude, longitude, rank) {
    var radius = Math.abs(rank - 11) * 1.2;
    radius += Math.abs(map_zoom - 18) * 10;
    var circle = new L.Circle([latitude, longitude], radius, {'stroke': true, 'color': circle_colors[rank], 'opacity': 0.9, 'weight': 5, 'fill': false}).addTo(map);
    circle.bringToBack();
    map_circles[map_circles.length] = circle;
}
function map_removecircles() {
    debug('remove circles');
    var total_circles = map_circles.length;
    for (var i=0;i<total_circles;i++) {
        map.removeLayer(map_circles[i]);
    }
    map_circles = [];
    $('#top').html('');
}
function map_setcircles() {
    debug('set circles');
    var bounds = map.getBounds();
    var total_markers = map_markers.length;
    map_markers.sort(function(a,b){return b.score-a.score});
    var rank = 1;
    var explore = {'north': 0, 'south': 0, 'east': 0, 'west': 0, 'north_east': 0, 'north_west': 0, 'south_east': 0, 'south_west': 0};
    var document_height = $(document).height();
    for (var i=0;i<total_markers;i++) {
        var latitude = map_markers[i]._latlng.lat;
        var longitude = map_markers[i]._latlng.lng;
        var north = bounds._northEast.lat;
        var south = bounds._southWest.lat;
        var east = bounds._northEast.lng;
        var west = bounds._southWest.lng;
        if (latitude >= south && latitude <= north && longitude >= west && longitude <= east) {
            if (rank <= 10) {
                debug(rank + ': ' + map_markers[i].score);
                map_setcircle(map_markers[i]._latlng.lat, map_markers[i]._latlng.lng, rank);
                $('#top').append('<div data-marker="' + i + '" class="leaflet-popup-content topbox" id="topbox' + rank + '">' + map_markers[i]._popup._content + '</div>');
                $('#topbox' + rank).find('.intro strong').css({'background-color': circle_colors[rank]});
                if ($('#top').height() + 70 > document_height) {
                    $('#topbox' + rank).hide();
                }
            }
            rank++;
        } else {
            if (latitude > north && longitude > east) {
                explore.north_east++;
            } else if (latitude > north && longitude < west) {
                explore.north_west++;
            } else if (latitude > north && longitude >= west && longitude <= east) {
                explore.north++;
            }
            if (latitude < south && longitude > east) {
                explore.south_east++;
            } else if (latitude < south && longitude < west) {
                explore.south_west++;
            } else if (latitude < south && longitude >= west && longitude <= east) {
                explore.south++;
            }
            if (longitude > east && latitude >= south && latitude <= north) {
                explore.east++;
            }
            if (longitude < west && latitude >= south && latitude <= north) {
                explore.west++;
            }
        }
    }
    for (var i in explore) {
        if (explore[i] > 0) {
            $('#explore_' + i).html(explore[i]);
            $('#explore_' + i).show();
        } else {
            $('#explore_' + i).hide();
        }
    }
}
function map_getcenter() {
    debug('get center');
    var result = map.getCenter();
    map_latitude = result.lat;
    map_longitude = result.lng;
}
function map_getzoom() {
    debug('get zoom');
    map_zoom = map.getZoom();
}
function map_removemarkers() {
    debug('remove markers');
    var total_markers = map_markers.length;
    for (var i=0;i<total_markers;i++) {
        map.removeLayer(map_markers[i]);
    }
    map_markers = [];
    fb_places = [];
}
function map_addmarker(markerdata) {
    if (fb_places[markerdata.id] == null) {
        var options= {};
        options.icon = icon_marker;
        options.title = markerdata.name;
        options.zIndexOffset = markerdata.score;
        var marker = new L.marker([markerdata.location.latitude, markerdata.location.longitude], options);
        marker.id = markerdata.id;
        marker.score = markerdata.score;
        map_markers[map_markers.length] = marker;
        fb_places[markerdata.id] = markerdata;
        marker.addTo(map).bindPopup(markerdata.content, {'minWidth': 210, 'maxWidth': 210, 'closeButton': false});
    }
}
function map_locateme() {
    debug('locate me');
    ui_setmessage('<p>Loading...</p>');
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                latlng_me = new L.LatLng(position.coords.latitude, position.coords.longitude);
                if (!marker_me) {
                    var content = '<p class="intro"><strong>' + user.name + '</strong></p>';
                    if (user.picture) {
                        if (!user.picture.data.is_silhouette) {
                            content += '<p class="picture"><img src="' + user.picture.data.url + '"></p>';
                        }
                    }
                    var buttons = [];
                    buttons.push('<a class="button" target="_blank" href="https://www.facebook.com/' + user.id + '">Visit</a>');
                    buttons.push('<a class="button" href="#" onclick="fb_logout();return false;">Logout</a>');
                    content += '<p class="buttons">' + buttons.join('&nbsp;&nbsp;') + '</p>';
                    var options= {};
                    options.icon = icon_me;
                    options.title = user.name;
                    marker_me = new L.marker([position.coords.latitude, position.coords.longitude], options);
                    marker_me.addTo(map).bindPopup(content, {'minWidth': 210, 'maxWidth': 210, 'closeButton': false});
                } else {
                    marker_me.setLatLng([position.coords.latitude, position.coords.longitude]);
                    var total_markers = map_markers.length;
                    for (var i=0;i<total_markers;i++) {
                        var distance = parseInt(latlng_me.distanceTo([map_markers[i]._latlng.lat, map_markers[i]._latlng.lng]));
                        $('#distance' + map_markers[i].id).find('span').html(human_distance(distance));
                    }
                }
                if (center_on_me == 1) {
                    map_setcenter(position.coords.latitude, position.coords.longitude);
                    if ($('#field_q').val() == '') {
                        fb_search();
                    }
                    ui_sethash();
                }
                ui_emptymessage();
            },
            function(error) {
                if (error.code == 1) {
                    ui_setmessage('<p>Geolocation: permission denied</p>');
                } else if (error.code == 2) {
                    ui_setmessage('<p>Geolocation: position unavailable</p>');
                } else if (error.code == 3) {
                    ui_setmessage('<p>Geolocation: timeout</p>');
                } else {
                    ui_setmessage('<p>Geolocation: unknown error</p>');
                }
            },
            {'enableHighAccuracy': true, 'timeout': 30000}
        );
    }
}
function human_distance(distance) {
    if (distance == '-') {
        return '-';
    } else if (distance < 1000) {
        return distance + 'm.';
    } else {
        var km = parseInt(distance / 1000);
        var m = distance - (km * 1000);
        return km + 'km. ' + m + 'm.';
    }
    return false;
}
function fb_search() {
    debug('search');
    ui_hidesplash();
    if (search_in_progress == 0) {
        search_in_progress = 1;
        if ($('#field_q').val() != '') {
            //$(document).attr('title', 'sdion locate: ' + $('#field_q').val());
            var url = facebook_api_prefix + '/search?q=' + encodeURI($('#field_q').val()) + '&type=place&center=' + map_latitude + ',' + map_longitude + '&limit=150&fields=id,name,location,link,about,were_here_count,checkins,events.limit(1).fields(id,name,start_time,end_time)';
            //,offers.limit(1).fields(id,title,expiration_time)
        } else {
            map_removecircles();
            map_removemarkers();
            //$(document).attr('title', 'sdion locate');
            /*sql = 'SELECT page_id, name, categories, location, page_url, about, fan_count, were_here_count, talking_about_count, checkins, pic_square, pic, pic_small ';
            sql += 'FROM page '
            sql += 'WHERE page_id IN ';
            sql += '(SELECT page_id FROM place WHERE distance(latitude, longitude, "' + map_latitude + '", "' + map_longitude + '") < 10000) ';
            sql += 'ORDER BY fan_count DESC LIMIT 10';
            var url = facebook_api_prefix + '/fql?q=' + encodeURI(sql);*/
            var url = facebook_api_prefix + '/search?type=place&center=' + map_latitude + ',' + map_longitude + '&distance=10000&limit=10&fields=id,name,location,link,about,were_here_count,checkins,events.limit(1).fields(id,name,start_time,end_time)';
        }
        debug(url);
        ui_setmessage('<p>Loading...</p>');
        FB.api(url, 'get', {}, function(response) {
            if (!response || response.error) {
                search_in_progress = 0;
                ui_setmessage('<p>' + response.error.message + '</p>');
            } else if (response.data) {
                var total_results = response.data.length;
                if (total_results > 0) {
                    debug(total_results + ' results');
                    for (var i=0;i<total_results;i++) {
                        if (typeof response.data[i].location !== 'undefined' && typeof response.data[i].location.latitude !== 'undefined' && typeof response.data[i].location.longitude !== 'undefined') {
                            var buttons = [];
                            var score = 0;
                            if (!response.data[i].id) {
                                response.data[i].id = response.data[i].page_id;
                            }
                            if (response.data[i].were_here_count) {
                                score += parseInt(response.data[i].were_here_count);
                            }
                            if (response.data[i].checkins) {
                                score += parseInt(response.data[i].checkins);
                            }
                            buttons.push('<a class="button" target="_blank" href="' + response.data[i].link + '">Visit</a>');
                            //buttons.push('<a class="button" id="checkin' + response.data[i].id + '" href="#" onclick="fb_checkin(' + response.data[i].id + ');return false;">Check in</a>');
                            buttons.push('<a class="button" id="share' + response.data[i].id + '" href="#" onclick="fb_share(\'' + response.data[i].id + '\');return false;">Share</a>');
                            response.data[i].score = score;
                            response.data[i].content = '<p class="intro"><strong>' + response.data[i].name + '</strong>';
                            if (response.data[i].categories) {
                                for (c in response.data[i].categories) {
                                    if (response.data[i].categories[c].id != 0) {
                                        response.data[i].content += '<br>' + response.data[i].categories[c].name;
                                        break;
                                    }
                                }
                            }
                            if (response.data[i].location.street) {
                                response.data[i].content += '<br>' + response.data[i].location.street;
                            }
                            if ($('#field_q').val() != '') {
                                response.data[i].content += '<br>Score: ' + score;
                            }
                            if (latlng_me) {
                                var distance = parseInt(latlng_me.distanceTo([response.data[i].location.latitude, response.data[i].location.longitude]));
                            } else {
                                var distance = '-';
                            }
                            response.data[i].content += '<br><span id="distance' + response.data[i].id + '">Distance: <span>' + human_distance(distance) + '</span></span>';
                            response.data[i].content += '</p>';
                            if (response.data[i].pic_square) {
                                response.data[i].content += '<p class="picture"><img src="' + response.data[i].pic_square + '"></p>';
                            }
                            if (buttons.length > 0) {
                                response.data[i].content += '<p class="buttons">' + buttons.join('&nbsp;&nbsp;') + '</p>';
                            }
                            response.data[i].icon = 'marker';
                            if ($('#field_q').val() != '') {
                                if (response.data[i].events) {
                                    var display_event = false;
                                    var start_time = new Date(response.data[i].events.data[0].start_time);
                                    var start_time_display = addZ(start_time.getDate()) + '/' + addZ(start_time.getMonth() + 1);
                                    if (response.data[i].events.data[0].end_time) {
                                        var end_time = new Date(response.data[i].events.data[0].end_time);
                                        if (end_time >= date_today) {
                                            display_event = true;
                                            var end_time_display = addZ(end_time.getDate()) + '/' + addZ(end_time.getMonth() + 1);
                                            if (start_time_display != end_time_display) {
                                                event_time = start_time_display + '-' + end_time_display;
                                            } else {
                                                event_time = start_time_display;
                                            }
                                        }
                                    } else {
                                        display_event = true;
                                        event_time = start_time_display;
                                    }
                                    if (display_event) {
                                        response.data[i].icon = 'event';
                                        response.data[i].content += '<p class="event"><strong>' + event_time + ':</strong> <a target="_blank" href="https://www.facebook.com/' + response.data[i].events.data[0].id + '">' + response.data[i].events.data[0].name + '</a></p>';
                                    }
                                }
                                if (response.data[i].offers) {
                                    var expiration_time = new Date(response.data[i].offers.data[0].expiration_time);
                                    if (expiration_time >= date_today) {
                                        var expiration_time_display = addZ(expiration_time.getDate()) + '/' + addZ(expiration_time.getMonth() + 1);
                                        response.data[i].icon = 'event';
                                        response.data[i].content += '<p class="event"><strong>Until ' + expiration_time_display + ':</strong> <a target="_blank" href="https://www.facebook.com/' + response.data[i].offers.data[0].id + '">' + response.data[i].offers.data[0].title + '</a></p>';
                                    }
                                }
                            }
                            map_addmarker(response.data[i]);
                        }
                    }
                    map_setcircles();
                    search_in_progress = 0;
                    ui_emptymessage();
                } else {
                    search_in_progress = 0;
                    ui_setmessage('<p>No markers</p>');
                }
            }
        });
    }
}
function fb_login(params, callback) {
    debug('login');
    FB.login(function(response) {
        callback(response);
    }, params);
}
function fb_logout() {
    debug('logout');
    FB.logout(function(response) {
        location.reload();
    });
}
function fb_permissions() {
    debug('permissions');
    $('#permissions').html('');
    FB.api(facebook_api_prefix + '/me/permissions', 'get', {}, function(response) {
        permissions_saved = response.data[0];
        for (var i in permissions_recommended) {
            if (permissions_saved[i] == null) {
                $('#permissions').append('<p><a class="fb_addpermission button" data-permission="' + i + '" href="#">Add</a> <strong>' + i + '</strong></p>');
            } else if (i != 'installed' && i != 'public_profile') {
                $('#permissions').append('<p><a class="fb_revokepermission button" data-permission="' + i + '" href="#">Revoke</a> <strong>' + i + '</strong></p>');
            }
        }
        for (var i in permissions_saved) {
            if (permissions_recommended[i] == null && i != 'installed' && i != 'public_profile') {
                $('#permissions').append('<p><a class="fb_revokepermission button" data-permission="' + i + '" href="#">Revoke</a> ' + i + '</p>');
            }
        }
    });
}
function fb_checkin(id) {
    debug('check in');
    ui_hidesplash();
    ui_setmessage('<p>Loading...</p>');
    FB.api(facebook_api_prefix + '/me/feed', 'post', {'place': id, 'method': 'feed'}, function(response) {
        ui_emptymessage();
        if (!response || response.error) {
            ui_setmessage('<p>' + response.error.message + '</p>');
        } else {
            $('#checkin' + id).css({'text-decoration': 'line-through'});
        }
    });
}
function fb_share(id) {
    debug('share');
    ui_hidesplash();
    params = {};
    params.link = window.location.href;
    params.name = fb_places[id].name;
    if (fb_places[id].about) {
        params.description = fb_places[id].about;
    }
    params.actions = {};
    params.actions[0] = {'link': fb_places[id].link, 'name': 'Visit'};
    params.method = 'feed';
    FB.ui(params, function(response) {
        $('#share' + id).css({'text-decoration': 'line-through'});
    });
}
$(document).ready(function() {
    debug('document ready');
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
        navigator.serviceWorker.register('serviceworker.js').then(function() {
        }).catch(function() {
        });
    }
    if (window.location.hash) {
        var ref_hash = window.location.hash;
        if (ref_hash.substring(1).match('^[a-z]{1,}$')) {
            if ($(ref_hash).hasClass('splash')) {
                ui_showsplash(ref_hash);
            }
        }
    }
    FB.init({'appId': 242057362583698, 'status': true, 'cookie': true, 'frictionlessRequests': true, version: 'v3.0'});
    FB.getLoginStatus(function(response) {
        if (response.status === 'connected') {
            FB.Event.subscribe('auth.authResponseChange', function(response) {
                if (response.status === 'connected') {
                } else {
                    ui_setmessage('<p><a href="#" class="fb_reconnect button">Reconnect</a></p>');
                }
            });
            if (window.location.search) {
                var parameters = window.location.search.substring(1).split('&');
                for (var i=0;i<parameters.length;i++) {
                    var pos = parameters[i].indexOf('=');
                    if (pos > 0) {
                        var key = parameters[i].substring(0, pos);
                        var val = parameters[i].substring(pos + 1);
                        if (key == 'request_ids') {
                            FB.api(facebook_api_prefix + '/' + val, 'delete', {}, function(response) {
                            });
                        }
                    }
                }
            }
            if (window.location.hash) {
                ref_hash = window.location.hash;
                ref_hash = ref_hash.substring(1).split('/');
                var hash_zoom = parseInt(ref_hash[0]);
                var hash_latitude = parseFloat(ref_hash[1]);
                var hash_longitude = parseFloat(ref_hash[2]);
                if (hash_zoom == ref_hash[0] && hash_latitude == ref_hash[1] && hash_longitude == ref_hash[2]) {
                    map_zoom = hash_zoom;
                    map_latitude = hash_latitude;
                    map_longitude = hash_longitude;
                    center_on_me = 0;
                    if (ref_hash[3]) {
                        $('#field_q').attr('value', decodeURI(ref_hash[3]).replace(/(<([^>]+)>)/ig, ''));
                    }
                }
            }
            map_init();
            FB.api(facebook_api_prefix + '/me?fields=id,name,first_name,picture', 'get', {}, function(response) {
                user = response;
                $('.panel #hello').html('Hello ' + user.first_name);
                map_locateme();
            });
            fb_permissions();
            fb_search();
            $('#guest').remove();
            $('#connected').fadeIn();
            //$('#field_q').focus();
        } else {
            if (window.location.hash) {
                ref_hash = window.location.hash;
                if (ref_hash.substring(1).match('^[a-z]{1,}$')) {
                } else {
                    hash_save = window.location.hash;
                }
            }
            $('#connected').remove();
            $('#guest').fadeIn();
        }
    });
    $('form').bind('submit', function(event) {
        event.preventDefault();
        if ($('#field_q').val() != '') {
            map_removecircles();
            map_removemarkers();
        }
        fb_search();
        ui_sethash();
    });
    $(document).on('click', '.ui_showsplash', function(event) {
        ui_showsplash($(this).attr('href'));
    });
    $(document).on('click', '.ui_hidesplash', function(event) {
        event.preventDefault();
        ui_hidesplash();
    });
    $(document).on('click', '.map_locateme', function(event) {
        event.preventDefault();
        center_on_me = 1;
        map_locateme();
        map_setcircles();
        ui_hidesplash();
    });
    $(document).on('click', '.fb_login', function(event) {
        event.preventDefault();
        fb_login({}, function(result) {
            if (result.status == 'connected') {
                location.reload();
            }
        });
    });
    $(document).on('click', '.fb_reconnect', function(event) {
        event.preventDefault();
        fb_login({}, function(result) {
            if (result.status == 'connected') {
                ui_emptymessage();
            }
        });
    });
    $(document).on('click', '.fb_logout', function(event) {
        event.preventDefault();
        ui_sethash();
        fb_logout();
    });
    $(document).on('click', '.fb_addpermission', function(event) {
        event.preventDefault();
        var permission = $(this).data('permission');
        fb_login({'scope': permission}, function(result) {
            fb_permissions();
            ui_emptymessage();
        });
    });
    $(document).on('click', '.fb_revokepermission', function(event) {
        event.preventDefault();
        var permission = $(this).data('permission');
        FB.api({'method': 'auth.revokeExtendedPermission', 'perm': permission}, function(response) {
            fb_permissions();
        });
    });
    $(document).on('mouseenter', '.topbox', function(event) {
        var ref = $(this).data('marker');
        map_markers[ref].openPopup();
    });
});
