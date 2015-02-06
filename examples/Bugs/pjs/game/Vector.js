"use strict";

function squared(x) { return x*x; }

function lengthOfVec(v) {
	return Math.sqrt(squared(v[0]) + squared(v[1]));
}
function normalizeVec(v) {
	var len = lengthOfVec(v);
	if (len>0) {
		v[0] /= len;
		v[1] /= len;
	}
}

function Vec() { // empty args, another vector, or list of numbers
	var o = [];
	if (arguments.length == 0) {
		o[0] = 0;
		o[1] = 0;
	} else {
		if (typeof arguments[0] == 'object') { // or Array.isArray(arguments[0])
			o = cloneArray(arguments[0]);
		} else {
			for(var i=0; i<arguments.length; i++) o[i] = arguments[i];
		}
	}
	o.len = function() { return lengthOfVec(this); }
	o.normalize = function() { normalizeVec(this); }
	o.scale = function(s) {
		this[0] *= s;
		this[1] *=s;
	}
	o.mult = function(s) {
		var v = this.clone();
		v.scale(s);
		return v;
	}
	o.add = function(v) {
		this[0] += v[0];
		this[1] += v[1];
	}
	o.sub = function(v) {
		this[0] -= v[0];
		this[1] -= v[1];
	}
	o.plus = function(v) {
		var ret = this.clone();
		ret.add(v);
		return ret;
	}
	o.minus = function(v) {
		var ret = this.clone();
		ret.sub(v);
		return ret;
	}
	o.dot = function(v) {
		var d = 0;
		for(var i=0; i<this.length; i++) d += this[i] * v[i];
		return d;
	}
	o.clone = function() { return new Vec(this); }
	o.dist = function(v) {
		var dv = this.minus(v);
		return dv.len();
	}
	return o;
}


function Pose(x, y, theta, w, h) {
	var o = {};
	o.x = x;
	o.y = y;
	o.theta = theta;
	o.theta0 = 0;
	o.renderTheta = theta;
	o.w = w;
	o.h = h;
	o.flipX = false;
	o.xOff = 0;
	o.yOff = 0;
	o.makeVec = function(pose) {
		return [ this.x - pose.x, this.y - pose.y];
	}
	o.addVec = function(v) {
		this.x += v[0];
		this.y += v[1];
	}
	o.dist = function(pose) {
		var d = Math.sqrt(squared(this.x - pose.x) + squared(this.y - pose.y));
		return d;
	}
	o.distVec = function(v) {
		var v1 = this.getPos();
		return v.minus(v1).len();
	}
	o.getPos = function() { return new Vec(this.x, this.y); }
	return o;
}

function Line(p1, p2) { // two Vec's
	var o = new Object();
	o.p1 = p1.clone();
	o.p2 = p2.clone();
	
	o.center = function() { return this.p1.plus(this.p2).mult(0.5); }
	// intersect 2 line segments in 2D: (p1,p2) and (q1,q2)
	// return: intersection point or undefined
	o.intersectionWith = function(q) {
		var u = this.p2.minus(this.p1); //p2.addReturn(-1,p1);
		var v = q.p2.minus(q.p1); //q2.addReturn(-1,q1);
		var w = this.p1.minus(q.p1); //p1.addReturn(-1,q1);
		var d = this.perp2(u,v);
		if (Math.abs(d)<0.0001) {
			console.log("intersectionWith: can not handle parallel lines");
 			return undefined;
		}

		var sI = this.perp2(v,w)/d;
		if (sI<0 || sI>1) return undefined;

		var tI=this.perp2(u,w)/d;
		if (tI<0 || tI>1) return undefined;

		console.log(d, sI, tI);
		return this.p1.plus(u.mult(sI));
	}
	o.perp2 = function(v1, v2) {
        var cv2 = new Vec(v2[1],-v2[0]);
        return v1.dot(cv2);
	}
	o.getPoint = function(s) {
		var v = this.p2.minus(this.p1);
		v.scale(s);
		return v.plus(this.p1);
	}
	o.len = function() {
		var v = this.p2.minus(this.p1);
		return v.len();
	}
	return o;
}

function testLine() {
	var l1 = new Line(new Vec(0,0), new Vec(1,1));
	var l2 = new Line(new Vec(0,1), new Vec(1,0));
	var p = l1.intersectionWith(l2);
	console.log(p);
}

