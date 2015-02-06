"use strict";
function renderImageCanvas(img, x, y, w, h) {
    var canvas = document.getElementById('canvas0');
    if (!canvas.getContext) return;
	var ctx = canvas.getContext('2d');
	ctx.drawImage(img, x, y, w, h);		
}

var renderedObjects = [];
function removeImage(id) {
    var imgElt = document.getElementById(id);
    if (imgElt == null) return;
	drawArea.removeChild(imgElt);	
	removeObjFromList(id, renderedObjects);
}
function clearRenderedObjects() {
	for(var i=0; i<renderedObjects.length; i++) removeImage(renderedObjects[i].id);
	renderedObjects = [];
}
function renderImage(img, pose) {
    img.style.left = pose.x - 0.5*pose.w + pose.xOff*(pose.flipX ? -1 : 1);
    img.style.top = pose.y - 0.5*pose.h + pose.yOff;
    img.style.width = pose.w;
    img.style.height = pose.h;
    img.style.position = 'absolute';
    var transStr = 'rotate('+pose.renderTheta.toFixed(5)+'rad)'; 
    if (pose.flipX) transStr += ' scaleX(-1)';
    img.style.MozTransform = transStr;
    var imgElt = document.getElementById(img.id);
    if (imgElt == null) {
        drawArea.appendChild(img);
        addObjToList(img, renderedObjects);
    } else {
    	drawArea.removeChild(imgElt);	
        drawArea.appendChild(img);
//    	drawArea.replaceChild(img, imgElt);
    }
}
