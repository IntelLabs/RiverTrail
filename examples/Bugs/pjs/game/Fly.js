"use strict";

function Fly(id, x, y) { //id x y theta w h
	var o = new Critter(id, x, y, 0, 40, 40);
//	o.setPixel('../../animations/bug_eyed_bee_T.png');
	o.setPixel('animations/flyAndSpiderweb/fly01.png');
	o.addFrame('animations/flyAndSpiderweb/fly02.png'); 
	o.actions[0].heli = true;
	o.vel = 10*Config.scale;
	o.angVel = toRadians(30);
	o.update = function() {
		if (this.isStuck) return;
		
		var lastPos = this.pose.getPos();
		var flowPos = new Vec(flowManager.pointMoveTo(lastPos));
		var flowVec = flowPos.minus(lastPos); //TODO: cap flow length?
		var newPos = flowPos.clone();
		
		this.pose.theta += getRandom(-this.angVel, this.angVel);
		var flyVec = new Vec(Math.cos(this.pose.theta), Math.sin(this.pose.theta));
		flyVec.scale(this.vel);
		newPos.add(flyVec);
		this.setPos(newPos);
		var motion = newPos.minus(lastPos);
		this.pose.theta = Math.atan2(motion[1], motion[0]);
		
		this.checkBoundaries();
	}
	return o;
}

function Mosquito(id, x, y) {
	var o = new Fly(id, x, y);
	o.setPixel('animations/green_hornet_T.png');
	return o;
}

