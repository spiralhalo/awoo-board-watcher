// ==UserScript==
// @name 		awoo board watcher
// @include 	http://boards.lolis.download/*
// @include 	https://niles.lain.city/*
// @include 	http://dangeru.us/*
// @include 	https://dangeru.us/*
// @include 	http://www.dangeru.us/*
// @include 	https://www.dangeru.us/*
// @include 	http://boards.dangeru.us/*
// @include 	https://boards.dangeru.us/*
// @version		1.02
// @grant 		GM_getValue
// @grant 		GM_setValue
// @run-at 		document-end
// ==/UserScript==
var started = false;
var page = 1;
var updated = 0;
var onload = function() {

	// Only start once
	if (started) {
		return;
	}
	started = true;

	var time = new Date().getTime();
	var lasttime = GM_getValue("time", -1);
	var boardas = document.getElementsByClassName("boarda");

	//don't update timer on thread pages
	if(boardas.length < 1) return;

	//only do this every 1 minute to avoid overloading the api
	if (time - lasttime >= 60000) {
		console.log("updating board watcher");
		Array.prototype.slice.call(boardas, 0).forEach(doTheThing);
	} else {
		Array.prototype.slice.call(boardas, 0).forEach(doTheMinimalThing);
	}
};

var doTheMinimalThing = function (a) {
	var board = a.href.split("/")[3];

	var elem = document.createElement("span");
	a.appendChild(elem);

	var thread = GM_getValue(board+"t_new", -1);
	var replies = GM_getValue(board+"r_new", 0);
	comparison_and_update_elem(board, thread, replies, a, elem, true);
};

var doTheThing = function (a) {
	var url_ = a.href.split("/");
	var board = url_[3];
	var url = url_[0] + "//" + url_[2] + "/api/v2";

	var elem = document.createElement("span");
	a.appendChild(elem);
	elem.innerHTML = grey("?");

	// unlike awoo-catalog, this one uses and may overload the api?
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
	    if (this.readyState == 4 && this.status == 200) {
			updated --;
	    	doTheAsyncThing(a, elem, board, this.responseText);
			// if not all boards are updated, update on the next page load
			if(updated < 1){
				GM_setValue("time", new Date().getTime());
			}
	    }
	};
	xhr.open("GET", url + "/board/" + board, true);
	updated ++;
	xhr.send();
};

var doTheAsyncThing = function (a, elem, board, response){
	var json = JSON.parse(response);
	var id = 0;

	// sticky threads are unsupported. use thread watcher on app
	if (json === null) return update_and_cache_status(board, elem, grey("-"));
	while (id < json.length && json[id].sticky) id ++;
	if (id >= json.length) return update_and_cache_status(board, elem, grey("-"));

	var thread = json[id].post_id;
	var replies = json[id].number_of_replies;
	comparison_and_update_elem(board, thread, replies, a, elem);
};

var grey = function (text) {
	return color("gray", text);
};
var red = function (text) {
	return color("red", text);
};
var color = function (c, text) {
	return " <span style='color: " + c + ";'>" + text + "</span>";
};

var comparison_and_update_elem = function(board, thread, replies, a, elem, offline=false) {
	var oldthread = GM_getValue(board+"t", -1);
	var oldreplies = GM_getValue(board+"r", 0);
	if (oldthread != thread){
		if(!offline){
			GM_setValue(board+"t_new", thread);
			GM_setValue(board+"r_new", replies);
		}
    	elem.innerHTML = red("!");
    	set_onclick_listener(board, a, elem);
	} else if (oldreplies < replies) {
		if(!offline) GM_setValue(board+"r_new", replies);
    	elem.innerHTML = red("+");
    	set_onclick_listener(board, a, elem);
		// we have to wrap this in a closure because otherwise it clicking any post would only update the last post processed in this loop
	} else {
    	elem.innerHTML = grey("-");
	}
};

var set_onclick_listener = function (board, a, elem) {
	a.addEventListener("click", function() {
		GM_setValue(board+"t", GM_getValue(board+"t_new", -1));
		GM_setValue(board+"r", GM_getValue(board+"r_new", 0));
    	elem.innerHTML = grey("-");
	});
};

// In chrome, the userscript runs in a sandbox, and will never see these events
// Hence the run-at document-end
//document.addEventListener('DOMContentLoaded', onload);
//document.onload = onload;

// One of these should work, and the started variable should prevent it from starting twice (I hope)
function GM_main() {
	onload();
}
onload();
