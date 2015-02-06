"use strict";
function Frog(id, x, y) {
	var scale = 1.2;
	var o = new Critter(id, x, y, 0, 150*scale, 150*scale);
	o.actions = { sit: new FrogSit(id), eat: new FrogEat(id) };
	o.curAction = 'sit';
	o.eating = false;
	o.bugToEat = {};
	var playSound = true;
	o.update = function() {
		if (!this.eating) this.findClosestBug();
		if (!this.eating) return;
		if (playSound) {
			Sounds.frogEat.playSound();
			playSound = false;
		}
		var v = this.pose.makeVec(this.bugToEat.pose);
		var d = lengthOfVec(v);
		var vel = 50*Config.scale;
		if (d > vel && d < vel*2) this.actions.eat.curFrame = 6; //open mouth
		if (d < vel) { //done eating
			this.eating = false;
			this.curAction = 'sit';
			resetBug(this.bugToEat);
			this.hideTongue();
			frogAte++;
			playSound = true;
			return;
		}
		normalizeVec(v);
		this.bugToEat.pose.x += v[0]*vel;
		this.bugToEat.pose.y += v[1]*vel;
		this.updateTongue();
	};
	o.findClosestBug = function() {
		var minD = 10000;
		var bugToEat = {};
		for(var b=0; b<bugs.length; b++) {
			var d = this.pose.dist(bugs[b].pose);
			if (d<minD) {
				minD = d;
				bugToEat = bugs[b];
			}
		}
		if (minD > 200*Config.scale) return;	
		this.eating = true;
		this.curAction = 'eat';
		this.bugToEat = bugToEat;
		bugToEat.isStuck = true;
		this.showTongue();
	};
	o.hideTongue=function() {
		removeDrawObj(this.tongue.id);
		removeUpdateObj(this.tongue.id);
	};
	o.showTongue=function() {
		addDrawObj(this.tongue);
		addUpdateObj(this.tongue);		
	};
	o.updateTongue=function() {
		this.tongue.setToPos(this.bugToEat.pose.getPos());		
	};
	o.tongueOri = new Vec(x,y-20*scale*Config.scale);
	o.tongue = new DrawLine(o.id+'Tongue', o.tongueOri, o.tongueOri, 5); //TODO: does tongue width need to scale?
	return o;
}

function FrogEat(id) {
	var o = new CritterAction(id);
	o.frames = 
		[ 
		  'animations/frogAndLadybug/frogeat201.png',
		  'animations/frogAndLadybug/frogeat202.png',
		  'animations/frogAndLadybug/frogeat203.png',
		  'animations/frogAndLadybug/frogeat204.png',
		  'animations/frogAndLadybug/frogeat205.png',
		  'animations/frogAndLadybug/frogeat206.png',
		  'animations/frogAndLadybug/frogeat207.png',
		  'animations/frogAndLadybug/frogeat208.png',
		  'animations/frogAndLadybug/frogeat209.png',
		  'animations/frogAndLadybug/frogeat210.png',
		  'animations/frogAndLadybug/frogeat211.png',
		  'animations/frogAndLadybug/frogeat212.png',
		  ];
	o.heli = true;
	return o;
} 

function FrogSit(id) {
	var o = new CritterAction(id);
	var repeatFrame=2;
	var f=0;
	for (var n=0;n<4;n++) {
		for (var i=1;i<=9;i++) {
			for (var j=0;j<repeatFrame;j++) {
				o.frames[f++]='animations/frogAndLadybug/frogsitting0'+i+'.png';
			}
		}
	}
	for (var i=1;i<=9;i++) {
		for (var j=0;j<repeatFrame;j++) {
			o.frames[f++]='animations/frogLadybugButterfly0814/froggoofy0'+i+'.png';
		}
	}
	o.heli = true;
	return o;
} 
