"use strict";
function Marker(id) {
	var o = new Critter(id, 0, 0, 0, 10, 10);
	o.setPixel('animations/frogeat01.png')
	return o;
}


function DrawLine(id, p1, p2, width) { // p1 and p2 are Vec's
	var o = new Critter(id, 0, 0, 0, 10, 10);
//	o.visible = false;
	o.setPixel('animations/tongue2.png');
	o.line = new Line(p1, p2);
	o.width = width;
	o.update = function() {
//		this.visible = true;
		var pos = this.line.center();
		this.pose.x = pos[0];
		this.pose.y = pos[1];
		var v = this.line.p2.minus(this.line.p1); 
		var d = v.len();
		if (d<1) { this.removeLine(); return; }
		v.normalize();
		this.pose.theta = Math.atan2(v[1], v[0]);
		this.pose.w = d;
		this.pose.h = this.width;
	}
	o.removeLine = function() {
		removeImage(this.id);
		this.visible = false;
	}
	o.setFromPos = function(pos) { this.line.p1 = pos.clone(); }
	o.setToPos = function(pos) { this.line.p2 = pos.clone(); }
	return o;
}

