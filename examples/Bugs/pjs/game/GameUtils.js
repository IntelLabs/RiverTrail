"use strict";
function addDrawObj(obj) { addObjToList(obj, objectsToDraw); }
function addDrawObjBefore(obj, id) { addObjToListBefore(obj, objectsToDraw, id); }
function removeDrawObj(id) { removeObjFromList(id, objectsToDraw); removeImage(id); }
function addUpdateObj(obj) { addObjToList(obj, objectsToUpdate); }
function removeUpdateObj(id) { removeObjFromList(id, objectsToUpdate); }

/*
function hasEdge(pos) {
	var xx = Math.floor(pos[0]);
	var yy = Math.floor(pos[1]);
	var imageData = edgeData;
	var cOffset = 0; //1 for green, 2 for blue
	var red = imageData.data[((yy*(imageData.width*4)) + (xx*4)) + cOffset];
	if (red < 50) return false;
	return true;
}
*/

function removeBug(id) {
	removeDrawObj(id);
	removeUpdateObj(id);
	removeObjFromList(id, bugs);
}

function addBug(bug) {
	var areaW = Config.w;
	var areaH = Config.h;
	var topCorner = Vec(0,0);
	bug.pose.x = areaW*Math.random() + topCorner[0];
	bug.pose.y = areaH*Math.random() + topCorner[1];
	bug.pose.theta = getRandom(-Math.PI,Math.PI);
	addObjToList(bug, bugs);
	addObjToListBefore(bug, objectsToDraw, 'Spider1');
	addObjToListBefore(bug, objectsToUpdate, 'Spider1');	
}

function resetBug(bug) {
	removeBug(bug.id);
	bug.isStuck = false;
	addBug(bug);
}