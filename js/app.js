var destinationAfterUpload = 'uploaded.html';
var filesToUpload = [];
var map;

// Init Googlemap marker image
var spotIconImage = new google.maps.MarkerImage("img/marker_r1_c4.png",
	new google.maps.Size(37.0, 35.0),
	new google.maps.Point(0, 0),
	new google.maps.Point(18.0, 35.0)
);
var spotIconShadow = new google.maps.MarkerImage("img/marker_r1_c4_shadow.png",
	new google.maps.Size(55.0, 35.0),
	new google.maps.Point(0, 0),
	new google.maps.Point(18.0, 35.0)
);

$(function () {
	$('.browse_files').on('click', function() {
		$('#input-browse').focus().click();
		return false;
	});

	setupUploader();
})

function setupUploader() {
	// foursquareHelper.initialize(window.foursquareClientId, window.foursquareSecret);
	var jqXHR, uploadIndex = 0;

	$('#fileupload').fileupload({
		progressInterval : 50,
		bitrateInterval : 250,
		maxFileSize: 10000000, //10MB
		acceptFileTypes: /(\.|\/)(jpe?g)$/i,
		// singleFileUploads: false,//if TRUE (default), "add" will be call multiple times
		sequentialUploads: true,
		maxNumberOfFiles: 10,
		disableImageResize: false,
		imageMaxWidth: 1600,
		imageMaxHeight: 1600,
		uploadTemplateId: null,
		downloadTemplateId: null,
		add: function(e, data){
			var $lstThumb = $('.thumbnails-holder');

			//Read photo at client
			$.each(data.files, function(index, file) {
				canvasResize(file, {
					width: 1140,
					height: 0,
					crop: false,
					quality: 90,
					//rotate: 90,
					callback: function(imageData, width, height, exifData) {
						// - NOT SUPPORT FILE - //
						// Max of 10 files
						if ($('.upload-thumbnail').length >= 10) {
							alert('Exceed max of 10 files. Aborted !');
							return true;
						}

						// Restrict file size
						if (file.size >= 10000000) {// 10MB
							alert('File ' + file.name + ' is larger than 10MB. Aborted !');
							return false;
						}

						// Restrict file type: JPG only
						if (!file.type.match(/(\.|\/)(jpe?g)$/i)) {
							alert('File type is not supported');
							return false;
						}

						// - SUPPORTED FILE - //
						uploadIndex++;// Index for each photo
						var is1stFile = false;
						if ($('.upload-thumbnail').length == 0) {
							is1stFile = true;
							uploadIndex = 1;
						}

						// Extract EXIF data
						var tdata = $.extend({}, exifData, {title: file.name, count: uploadIndex, active: is1stFile});
						// convert GPS data if any
						var hasGPS = false;
						if (tdata.GPSLatitude && tdata.GPSLongitude){
							tdata = convertGPSdata(tdata);
							hasGPS = true;
						}

						// render HTML for thumbnail item
						var thumbnailHtml = tmpl("tmpl-uploadThumbnail", {
							index: uploadIndex, 
							filename: file.name, 
							imageSrc: imageData, 
							active: is1stFile,
							hasGPS: hasGPS
						});
						$lstThumb.append(thumbnailHtml);
						$('img[alt="' + file.name + '"]').resizeToParent({parent: '.upload-thumbnail'});//auto resize and crop 1:1

						// render HTML for edit-zone
						var editZoneHtml = tmpl("tmpl-uploadEditor", tdata);
						data.context = uploadIndex;//KEY POINT, GRRRRRRRR !!!
						$(".edit-zone-holder").append(editZoneHtml);

						if (is1stFile){
							$('.uploader').removeClass('block-hide');// show the edit tool
							$('.start-zone').hide();
							$('.preview-zone img').attr('src', imageData);
							confirmClosePage();
							initMap($('#photo-' + uploadIndex + ' .map-canvas')[0]);
						}

						// initTaging(uploadIndex);

						// List of files to upload
						filesToUpload.push(data);
						updateUploadEditor();
					}
				});
			});
		},

		send : function(e, data) {
			jqXHR = data.xhr();
		},

		progress: function(e, data) {
			// var progress = parseInt(data.loaded / data.total * 100, 10);
		},

		progressall: function(e, data) {
			var progress = 0;
			if (data.total){
				progress = parseInt(data.loaded / data.total * 100, 10);
			}
			showProgress(progress);
		},

		submit: function(e, data){
			console.log(data.files[0].name + '<-- uploading...');
			if ($('#photo-' + data.context).length != 0) {//dont send removed photos
				var additionData = $('#photo-' + data.context + ' form').serializeArray();
				data.formData = additionData;
				return true;
			} else {
				return false;
			}
		},

		done : function(e, data) {
			debug(data.result);
			console.log(data.files[0].name + '<-- DONE');
			
			//Store image data into HTML5 sessionStorage to display right after uploading
			if (window.sessionStorage){
				var photoId = new Date().getTime(); //data.result;
				var imageData = $('.upload-thumbnail.photo_' + data.context + ' img').attr('src');
				sessionStorage.setItem('photo_' + photoId, imageData);
			}
		},

		stop: function(e){
			redirectProgress('Finished.');
			window.onbeforeunload = false;
			window.setTimeout(function(){
				redirectProgress('Redirecting...');
			}, 1000);
			window.setTimeout(function(){
				// window.location.href = destinationAfterUpload;
			}, 2000);
		}
	});
	
	/*-- Binding events --*/
	//Cancel (remove) a photo
	$(document).on('click', '.btn-remove', function(e){
		var r = confirm('Are you sure to remove this photo');
		if (r == true) {
			// remove photo thumbnail + editor
			$('.edit-zone.active').remove();
			if ($('.thumbnails-holder .active').prev().length) {
				$('.thumbnails-holder .active').prev().find('a').trigger('click').end().end().remove();
			} else {
				$('.thumbnails-holder .active').next().find('a').trigger('click').end().end().remove();
			}
			updateUploadEditor();

			// If no photo remains, reset start-zone
			if ($('.upload-thumbnail').length == 0){
				$('.start-zone').show();
				$('.uploader').addClass('block-hide');
				is1stFile = true;
				filesToUpload = [];
			}
		}
	});

	//Save and next a photo
	/*$(document).on('click', '.btnSave', function(){
		var $parentTab = $(this).closest('.editPhoto');

		if ($parentTab.find('.photoLat').val() && $parentTab.find('.photoLon').val()){
			moveTabSelect('next');
			mapWarningOff($('.editPhoto').index($parentTab));
		} else{
			mapWarningOn($('.editPhoto').index($parentTab));
		}
	});*/

	$('.btn-upload').on('click', function(e){
		$('.btn-upload').off('click').css({opacity: 0.5, cursor: 'wait'});
		$('html, body').animate({scrollTop: 0}, 1000);
		$('.btn-remove, .btn-save').hide();
		$('.preview-zone img').remove();

		$(document).off('click', '#myTab a');
		$('.upload-thumbnail').parent().removeClass('active');
		// $('.edit-zone').removeClass('active');
		$('.map').addClass('disabled');
		$('.edit-zone input, .edit-zone textarea, .edit-zone select').attr('readonly', 'true');

		for (i in filesToUpload){
			filesToUpload[i].submit();
		}
	});

	// $('.btnUploadCancel').on('click', function(e){
	// 	console.log(jqXHR);
	// 	showProgress(0);
	// 	jqXHR.abort();
	// });

	/*$(document).on('click', '.moretips-trg', function(){
		$('.moretips').slideToggle();
		$(this).find('.icon-slide-toggle').toggleClass('up');
	});*/
}

function tabSelect(_this){
	$('.preview-zone img').attr('src', _this.find('img').attr('src'));
	initMap($('.edit-zone.active .map-canvas')[0]);
	// initTaging($('.item').eq(index).data('fid'));
}

/*function moveTabSelect(direction){
	if (direction == undefined) direction = 'next';
	var index = $('.lstThumb .item').index($('.item.active'));
	var nbTab = $('.lstThumb .item').length;
	if (direction == 'next'){
		index = (index>=(nbTab-1))?(nbTab-1):(index + 1);
	}else if (direction == 'prev'){
		index = (index==0)?0:(index - 1);
	}
	$('.lstThumb .item').removeClass('active');
	$('.lstThumb .item').eq(index).addClass('active');
	$('.editPhoto').hide();
	$('.editPhoto').eq(index).show();

	//update map
	initMap($('.editPhoto').eq(index).find('.map_canvas')[0]);

	//update big thumbnail
	$('.mainImg img.mainImg').attr('src', $('.lstThumb .item').eq(index).find('img').attr('src'));

	initTaging($('.item').eq(index).data('fid'));
}*/

function initMap(element) {
	var $_element = $(element);
	var searchInput = $_element.parent().find('.map-search');
	var autocomplete = new google.maps.places.Autocomplete(searchInput[0]);
	var latInput = $_element.parent().find('.photoLat'),
			lonInput = $_element.parent().find('.photoLon');
	var hasGPS = false;
	if (latInput.val() && lonInput.val()) hasGPS = true;

	var myLatLng = new google.maps.LatLng(21.03333, 105.85);//Hanoi, Vietnam
	if (hasGPS){
		myLatLng = new google.maps.LatLng(latInput.val(), lonInput.val());
	}
	var myOptions = {
		zoom: (hasGPS)?12:3,
		center: myLatLng,
		scaleControl: false,
		mapTypeControl: false,
		panControl: false,
		zoomControl: true,
		streetViewControl: false,
		mapTypeId : google.maps.MapTypeId.ROADMAP,
		maxZoom: 20,
		minZoom: 2
	};
	
	map = new google.maps.Map(element, myOptions);

	var marker = new google.maps.Marker({
		position : myLatLng,
		icon: spotIconImage,
		shadow: spotIconShadow
	});
	if (hasGPS) marker.setMap(map);

	google.maps.event.addListener(map, 'click', function(e) {
		if (!hasGPS) marker.setMap(map);
		marker.setPosition(e.latLng);

		var lat = e.latLng.lat();
		var lon = e.latLng.lng();

		latInput.val(lat);
		lonInput.val(lon);

		// add Ready marker
		$('.thumbnails-holder .active .upload-thumbnail').addClass('ready');

		updateReadyPhoto();
	});

	autocomplete.bindTo('bounds', map);

	google.maps.event.addListener(autocomplete, 'place_changed', function() {
		var place = autocomplete.getPlace();
		if (!place.geometry) {
			// Inform the user that the place was not found and return.
			return;
		}

		// If the place has a geometry, then present it on a map.
		if (place.geometry.viewport) {
			map.fitBounds(place.geometry.viewport);
		} else {
			map.setCenter(place.geometry.location);
			map.setZoom(17);
		}
	});
}

function confirmClosePage(){
	return true;
	window.onbeforeunload = function(e){
		var msg = 'Are you sure to leave this page ?';
		e = e || window.event;
		if(e) e.returnValue = msg;
		return msg;
	}
}

function updateUploadEditor(){
	$('.totalphoto').text($('.upload-thumbnail').length);
	updateReadyPhoto();
}

function updateReadyPhoto(){
	$('.readyphoto').text($('.upload-thumbnail.ready').length);
}

function convertGPSdata(data){
	var output = data;
	var latRef = {'N': 1, 'S': -1},
		lonRef = {'E': 1, 'W': -1};
	
	output.GPSLatitude = latRef[data.GPSLatitudeRef] * minuteToDegree(output.GPSLatitude);
	output.GPSLongitude = lonRef[data.GPSLongitudeRef] * minuteToDegree(output.GPSLongitude);
	return output;
}
function minuteToDegree(data){
	return (data[0] + data[1]/60 + data[2]/3600);
}

function dateFormat(date, format) {
	// Calculate date parts and replace instances in format string accordingly
	format = format.replace("DD", (date.getDate() < 10 ? '0' : '') + date.getDate()); // Pad with '0' if needed
	format = format.replace("MM", (date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1)); // Months are zero-based
	format = format.replace("YYYY", date.getFullYear());
	return format;
}

function checkReady(){
	var isReady = true;
	$('.editPhoto').find('input.photoLat').each(function(index){
		if (!$(this).val()){
			tabSelect(index);
			mapWarningOn(index);
			isReady = false;
			return true;
		}
	});
	return isReady;
}

function showProgress(rate){
	var $p = $('.progress-holder');
	if (!$p.is(':visible')) $p.show();
	$p.find('.progress .bar').css('width', rate + '%');
	$p.find('.progress-rate').text(rate + '%');
}

function hideProgress(){
	$('.progress-holder').hide();
}

function redirectProgress(text){
	var $p = $('.progress-holder');
	$p.find('.progress-rate').text(text); 
}

function isBrowserCompatible(){
	if (!window.File || !window.FileList || !window.FileReader) {
			return false;
	}
	return true;
}

function checkBrowserCompatible(){
	if (!isBrowserCompatible()){
		fancyAlert("Please use latest Google Chrome, Mozilla Firefox, Opera to get the best experiences");
	}
}

$.fn.animateHighlight = function(highlightColor, duration) {
		var highlightBg = highlightColor || "#a4efff";
		var animateMs = duration || 1500;
		var originalBg = 'transparent';//this.css("backgroundColor");
		this.stop().css("background-color", highlightBg).animate({backgroundColor: originalBg}, animateMs);
};

function initTaging(nb){
	$('.editPhoto.file_' + nb + ' .taging').select2({
			minimumInputLength: 3,
			maximumSelectionSize: 3,
			placeholder: $('input.taging').attr('placeholder'),
			tags: ["red", "green", "blue"],
			tokenSeparators: [","],
			width: '410px'
	});
}
/*function spotsF4q(){
	//Foursquare API
	foursquareHelper.explore(tdata.GPSLatitude, tdata.GPSLongitude, function(data) {
		if (data.response.groups) {
			for (i in data.response.groups ) {
				var group = data.response.groups[i];
				for (j in group.items ) {
					var item = group.items[j];
					option.text(item.venue.name);
					option.val(item.venue.name + ',' + item.venue.location["lat"] + ',' + item.venue.location["lng"] + ',' + item.venue.location["city"] + ',' + item.venue.location["country"] + ',' + item.venue.location["state"] + ',' + item.venue.id);
				}
			}
		}
	});
}*/
function debug(data) {
	console.log(data);
}