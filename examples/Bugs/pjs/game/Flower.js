"use strict";

function Flower(id, x, y) {
	var o = new Critter(id, x, y, 0, 250, 250);
//	o.setPixel('../../animations/flower1.png');
	o.setPixel('animations/ladybughome.png');
	o.anchor = o.pose.getPos().plus(new Vec(0,80*Config.scale));
	o.radius = 150*Config.scale;
	return o;
}

