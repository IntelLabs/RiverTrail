"use strict";
function appendLog(msg) {
	var l = document.createElement("li");
	l.innerHTML = msg; 
	document.getElementById("log").appendChild(l);
}

function toRadians(a) {
	return Math.PI*a/180;
}

//o is modified
function addDefaultsToObj(o,defaults) {
	for (var i in defaults) {
		if (!(i in o)) {
			o[i]=defaults[i];
		}
	}
}

function overrideObj(o,overrides) {
	for (var i in overrides) if (overrides.hasOwnProperty(i)) {
		o[i]=overrides[i];
	}
}

function cloneObj(obj) {
	var o = new Object();
	for (var i in obj) {
		if (!(i in o)) {
			o[i]=obj[i];
		}
	}
	return o;
}

function cloneArray(obj) {
	var o = [];
	for (var i in obj) {
		if (!(i in o)) {
			o[i]=obj[i];
		}
	}
	return o;
}

function getRandom(a, b) {
	var r = Math.random();
	return a + (b-a)*r;
}
