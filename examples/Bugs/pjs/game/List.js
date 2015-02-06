"use strict";
function findObjInList(id, list) {
//	console.log(id);
	for(var i=0; i<list.length; i++) {
		if (list[i].id == id) return i;
	}
	return -1;
}
function addObjToList(obj, list) {
	var objIndex = findObjInList(obj.id, list);
	if (objIndex >= 0) return;
	list.push(obj);
}
function addObjToListBefore(obj, list, id) {
	var objIndex = findObjInList(obj.id, list);
	if (objIndex >= 0) return;
	var targetIndex = findObjInList(id, list);
	if (targetIndex < 0) return; //TODO: die here?
//	console.log('add before: '+id+' ind: '+targetIndex);
	list.splice(targetIndex, 0, obj);
//	console.log('added at: '+findObjInList(obj.id, list)+' targ at: '+findObjInList(id, list));
}
function removeObjFromList(id, list) { //note: only removes 1 occurence
	var objIndex = findObjInList(id, list);
	if (objIndex < 0) return;
	list.splice(objIndex, 1);
}

