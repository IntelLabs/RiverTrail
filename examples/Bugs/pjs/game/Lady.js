"use strict";
function LadyFly(id) {
	var o = new CritterAction(id);
	o.tag = "LadyFly";
	o.frames = 
		[ 
		  'animations/ladybugfly01.png',
		  'animations/ladybugfly02.png',
		  'animations/ladybugfly03.png',
		  'animations/ladybugfly04.png',
		  'animations/ladybugfly05.png',
		  'animations/ladybugfly06.png',
		  ];
	o.heli = true;
	o.vel = 5*Config.scale;
	o.angVel = toRadians(10);
	o.move = function(pose) {
		pose.theta += getRandom(-this.angVel, this.angVel);
		pose.x += this.vel * Math.cos(pose.theta);
		pose.y += this.vel * Math.sin(pose.theta);
	};
	return o;
} 

function adjustEdgePos(pos) {
	var pad = 5*Config.scale;
	return edgeManager.findClosestEdge(pos,pad);
};	

function LadyCrawl(id) {
	var o = new CritterAction(id);
	o.tag = "LadyCrawl";
	o.frames = [ 
	            'animations/frogLadybugButterfly0814/ladybugtopview01.png',
	            'animations/frogLadybugButterfly0814/ladybugtopview02.png',
	            'animations/frogLadybugButterfly0814/ladybugtopview03.png',
	            'animations/frogLadybugButterfly0814/ladybugtopview04.png',
	            'animations/frogLadybugButterfly0814/ladybugtopview05.png',
	            'animations/frogLadybugButterfly0814/ladybugtopview06.png',
	             ];
	o.vel = 2*Config.scale;
//	o.move = function(pose) {
//		var lastPose = cloneObj(pose);
//		var crawlVec = [ Math.cos(pose.theta)*this.vel, Math.sin(pose.theta)*this.vel ];
//		pose.addVec(crawlVec);
//		adjustEdgePose(pose);
//		var motion = [pose.x-lastPose.x, pose.y-lastPose.y];
//		pose.theta = Math.atan2(motion[1], motion[0]);
//	};	
	return o;
} 

function CheeringCritter(id, x, y, theta, w, h) {
	var o = new Critter(id, x, y, theta, w, h);
	o.cheerCnt = 0;
	o.isCheering = false;
	o.reachedHome = function() {
		var cheer = this.actions.cheer;
		var goalPos = flower1.anchor;
		var myPos = this.pose.getPos();
		if (goalPos.minus(myPos).len() > flower1.radius) return false;	
		
		// close to home: fly to the door
		this.goal = goalPos;
		this.vel = this.actions.fly.vel;
		this.curAction = 'fly';
		if (!this.isCheering && this.moveToGoal()) return true;
		
		// at the door: cheer
		this.isCheering = true;
		this.curAction = 'cheer';
		var numCheers = 3;
		this.doACheer();
		if (this.cheerCnt == 0 && cheer.curFrame == 0) Sounds.cheer.playSound();
		if (cheer.curFrame == cheer.frames.length - 1) this.cheerCnt++;
		if (this.cheerCnt < numCheers) return true;
		
		// done cheering: reset
		cheer.curFrame = 0;
		this.cheerCnt = 0;
		this.isCheering = false;
		happyBugs++;
		resetBug(this);
		return true;
	}
	o.doACheer = function() {
		var vel = 5 * Config.scale;
		var curFrame = this.actions.cheer.curFrame;
		var pose = this.pose;
		if (curFrame == 1) pose.y += vel;
		if (curFrame == 2) pose.y += vel;
		if (curFrame == 3) pose.y -= vel; 
		if (curFrame == 4) pose.y -= vel;		
	}
	return o;
}

function LadyCheer(id) {
	var o = new CritterAction(id);
	o.tag = "LadyCheer";
	o.frames = [ 
	            'animations/frogLadybugButterfly0814/ladybugcheering01.png',
	            'animations/frogLadybugButterfly0814/ladybugcheering02.png',
	            'animations/frogLadybugButterfly0814/ladybugcheering03.png',
	            'animations/frogLadybugButterfly0814/ladybugcheering04.png',
	            'animations/frogLadybugButterfly0814/ladybugcheering05.png',
	            'animations/frogLadybugButterfly0814/ladybugcheering06.png',
	             ];
	o.heli = true;
	return o;
} 


function Lady(id, x, y) {
	var o = new CheeringCritter(id, x, y, 0, 40, 40);
	o.actions = { fly: new LadyFly(id), crawl: new LadyCrawl(id), cheer: new LadyCheer(id) };
	o.curAction = 'fly';
	o.update = function() {
		if (this.reachedHome()) return;
		if (this.isStuck) return;
		
		var lastPos = this.pose.getPos();
		var flowPos = new Vec(flowManager.pointMoveTo(lastPos));
		var flowVec = flowPos.minus(lastPos); //TODO: cap flow length?
		var newPos = flowPos.clone();
		if (this.curAction == 'crawl') {
			var crawlVec = new Vec(Math.cos(this.pose.theta), Math.sin(this.pose.theta)); 
			crawlVec.scale(this.actions.crawl.vel);
			newPos.add(crawlVec);
		} else {
			this.setPos(newPos);
			this.actions.fly.move(this.pose);			
			newPos = this.pose.getPos();
		}
		var onEdge = adjustEdgePos(newPos);
		this.setPos(newPos);
		var motion = this.curAction == 'crawl' ? newPos.minus(flowPos) : newPos.minus(lastPos);
		this.pose.theta = Math.atan2(motion[1], motion[0]);
		this.curAction = onEdge ? 'crawl' : 'fly';
		this.checkBoundaries();
	};	
	return o;
}

