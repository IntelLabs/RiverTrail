"use strict";
function CritterAction(id) {
	var o = new Object();
	o.tag = 'baseAction';
	o.id = id;
	o.frames = [];
	o.theta0 = 0;
	o.curFrame = 0;
	o.heli = false;
	o.render = function(pose) {
		if (this.heli) {
			pose.renderTheta = pose.theta0;
			pose.flipX = (Math.cos(pose.theta) < 0);
		} else {
			pose.flipX = false;
			pose.renderTheta = pose.theta + pose.theta0;
		}
		var img = new Image()
		img.src = this.frames[this.curFrame++];
		img.id = this.id;
		if (this.curFrame >= this.frames.length) this.curFrame = 0;
		renderImage(img, pose);
	};
	return o;
};
function Critter(id, x, y, theta, w, h) {
	var o = new Object();
	o.id = id;
	o.pose = new Pose(x*Config.scaleX, y*Config.scaleY, theta, w*Config.scale, h*Config.scale);
	var defaultAction = new CritterAction(id);
	o.actions = [ defaultAction ];
	o.curAction = 0;
	o.visible = true;
	o.isStuck = false;
	o.update = function() {}
	o.render = function() {
		if (!this.visible) return;
		var action = this.actions[this.curAction];
		if (action == undefined) {
			console.log("action undefined for "+this.id);
			return;
		}
		action.render(this.pose);
	};
	o.setXY = function(x,y) { this.setXYAbs(x*Config.scaleX, y*Config.scaleY); }
	o.setXYAbs = function(x,y) { 
		this.pose.x = x;
		this.pose.y = y;		
	}
	o.setPos = function(v) { 
		this.pose.x = v[0];
		this.pose.y = v[1];		
	}
	o.setSize = function(size) { this.setSizeAbs(size*Config.scale); }
	o.setSizeAbs = function(size) {
		this.pose.w = size;
		this.pose.h = size;
	}
	o.setPose = function(pose) { this.pose = cloneObj(pose); }
	o.checkBoundaries = function() {
//		console.log(this.id, this.pose.getPos());
//		if (this.pose.x > 0 && this.pose.x < 1280 && this.pose.y > 0 && this.pose.y < 720) return;
		if (this.pose.x < Config.bounds.minX) { this.pose.x = Config.bounds.minX; this.pose.theta = 0; }
		if (this.pose.x > Config.bounds.maxX) { this.pose.x = Config.bounds.maxX; this.pose.theta = toRadians(180); }
		if (this.pose.y < Config.bounds.minY) { this.pose.y = Config.bounds.minY; this.pose.theta = toRadians(90); }
		if (this.pose.y > Config.bounds.maxY) { this.pose.y = Config.bounds.maxY; this.pose.theta = toRadians(-90); }
//		this.pose.theta = -this.pose.theta;
//		console.log('adjusted pose');
	}
	o.move = function(pose) {
		this.pose.x = pose.x;
		this.pose.y = pose.y;
	}
	o.setPixel = function(pixelSrc) { defaultAction.frames = [ pixelSrc ]; }
	o.addFrame = function(frameSrc) { defaultAction.frames.push(frameSrc); }
	o.moveToGoal = function() {
		if (this.goal == undefined) {
			console.log("undefined move goal"); //TODO: should throw
			return false;
		}
		var pos = this.pose.getPos();
		var v = this.goal.minus(pos);
		var d = v.len();
		if (d<1) return false; //already there
		v.normalize();
		this.pose.theta = Math.atan2(v[1], v[0]);
		if (d>this.vel) d=this.vel;
		this.pose.x += d*v[0];
		this.pose.y += d*v[1];
		return true;
	}
	return o;
};



