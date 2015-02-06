"use strict";

function ButterflyFly(id) {
	var o = new CritterAction(id);
	o.tag = "ButterflyFly";
	o.frames = 
		[ 
		  'animations/butterfly/butterflyfly01.png',
		  'animations/butterfly/butterflyfly02.png',
		  'animations/butterfly/butterflyfly03.png',
		  'animations/butterfly/butterflyfly04.png',
		  'animations/butterfly/butterflyfly05.png',
		  'animations/butterfly/butterflyfly06.png',
		  ];
	o.heli = true;
	o.vel = 5*Config.scale;
	o.angVel = toRadians(60);
	o.move = function(pose) {
		pose.theta += getRandom(-this.angVel, this.angVel);
		pose.x += this.vel * Math.cos(pose.theta);
		pose.y += this.vel * Math.sin(pose.theta);
	};
	return o;
} 
function ButterflySit(id) {
	var o = new CritterAction(id);
	o.tag = "ButterflySit";
	o.frames = [ 
	  		  	'animations/butterfly/butterflysitting01.png',
	  		  	'animations/butterfly/butterflysitting01.png',
	  		  	'animations/butterfly/butterflysitting01.png',
	  		  	'animations/butterfly/butterflysitting01.png',
	  		  	'animations/butterfly/butterflysitting02.png',
	  		  	'animations/butterfly/butterflysitting02.png',
	  		  	'animations/butterfly/butterflysitting02.png',
	  		  	'animations/butterfly/butterflysitting02.png',
	  		  	'animations/butterfly/butterflysitting03.png',
	  		  	'animations/butterfly/butterflysitting03.png',
	  		  	'animations/butterfly/butterflysitting03.png',
	  		  	'animations/butterfly/butterflysitting03.png',
	  		  	'animations/butterfly/butterflysitting02.png',
	  		  	'animations/butterfly/butterflysitting02.png',
	  		  	'animations/butterfly/butterflysitting02.png',
	  		  	'animations/butterfly/butterflysitting02.png',
//	  		  	'../../animations/butterfly/butterflysitting05.png',
//	  		  	'../../animations/butterfly/butterflysitting05.png',
//	  		  	'../../animations/butterfly/butterflysitting05.png',
//	  		  	'../../animations/butterfly/butterflysitting05.png',
//	  		  	'../../animations/butterfly/butterflysitting06.png',
//	  		  	'../../animations/butterfly/butterflysitting06.png',
//	  		  	'../../animations/butterfly/butterflysitting06.png',
//	  		  	'../../animations/butterfly/butterflysitting06.png',
	             ];
	o.vel = 0;
	o.heli = true;
	return o;
} 
function ButterflyCheer(id) {
	var o = new CritterAction(id);
	o.tag = "ButterflyCheer";
	o.frames = [ 
	            'animations/frogLadybugButterfly0814/butterflycheering01.png',
	            'animations/frogLadybugButterfly0814/butterflycheering02.png',
	            'animations/frogLadybugButterfly0814/butterflycheering03.png',
	            'animations/frogLadybugButterfly0814/butterflycheering04.png',
	            'animations/frogLadybugButterfly0814/butterflycheering05.png',
	            'animations/frogLadybugButterfly0814/butterflycheering06.png',
	             ];
	o.heli = true;
	return o;
} 


function Butterfly(id, x, y) {
	var o = new CheeringCritter(id, x, y, 0, 80, 80);
	o.actions = { fly: new ButterflyFly(id), sit: new ButterflySit(id), cheer: new ButterflyCheer(id) };
	o.curAction = 'fly';
	o.pose.xOff = -12*Config.scale;
	o.pose.yOff = -35*Config.scale;
	o.update = function() {
		if (this.reachedHome()) return;
		if (this.isStuck) return;
		
		var lastPos = this.pose.getPos();
		var flowPos = new Vec(flowManager.pointMoveTo(lastPos));
		var flowVec = flowPos.minus(lastPos); //TODO: cap flow length?
		var newPos = flowPos.clone();
		if (this.curAction == 'fly'){
			this.setPos(newPos);
			this.actions.fly.move(this.pose);			
			newPos = this.pose.getPos();
		}
		var onEdge = adjustEdgePos(newPos);
		this.setPos(newPos);
		if (this.curAction == 'fly') {
			var motion = newPos.minus(lastPos);
			this.pose.theta = Math.atan2(motion[1], motion[0]);
		}
		this.curAction = onEdge ? 'sit' : 'fly';
		this.checkBoundaries();
	};	
	return o;	
}
