function SpiderCrawl(id) {
	var o = new CritterAction(id);
	o.frames = 
		[ 'animations/spidercrawl01.png',
		  'animations/spidercrawl02.png',
		  'animations/spidercrawl03.png',
		  'animations/spidercrawl04.png',
		  'animations/spidercrawl05.png',
		  'animations/spidercrawl06.png',
		  ];
	o.theta0 = toRadians(90);
	return o;
} 
function SpiderSit(id) {
	var o = new CritterAction(id);
	o.frames = 
		[ 'animations/spidercrawl01.png' ];
	o.theta0 = toRadians(90);
	return o;
} 


function Spider(id, x, y) {
	var o = new Critter(id, x, y, 0, 100, 100);
	o.vel = 5*Config.scale;
	o.angVel = toRadians(2);
	o.actions = { crawl: new SpiderCrawl(id), sit: new SpiderSit(id) };
	o.pose.theta0 = toRadians(90);
	o.curAction = 'sit';
	o.bugsToEat = [];
	o.goal = undefined;
	o.webConstructed = false;
	o.update = function() {
		if (!this.webConstructed) this.constructWeb();
		this.checkForBugs();
		if (this.bugsToEat.length > 0) {
			this.curAction = 'crawl';
			var bug = this.closestBug;
			this.goal = bug.pose.getPos();
			if (!this.moveToGoal()) { //reached the bug
				removeObjFromList(bug.id, this.bugsToEat);
				bug.isStuck = false;
				resetBug(bug);
				spiderAte++;
			}
			var goalDist = this.goal.dist(this.pose.getPos());
			if (goalDist <= 4*this.vel && goalDist > 3*this.vel) {
				Sounds.spiderEat.playSound();			
			}
		} else {
//			console.log('moving to web center');
			this.goal = this.webCenter;
			if (this.moveToGoal()) this.curAction = 'crawl';
			else this.curAction = 'sit';
		}
	}
	o.closestBug = undefined;
	o.checkForBugs = function() {
		var minD = 10000;
		this.closestBug = undefined;
		for(var i=0; i<bugs.length; i++) {
			if (bugs[i].id == this.id) continue;
			var d = bugs[i].pose.distVec(this.webCenter);
			if (d > this.webRadius) continue;
			addObjToList(bugs[i], this.bugsToEat);
			bugs[i].isStuck = true;
			d = bugs[i].pose.dist(this.pose);
			if (d<minD) {
				minD = d;
				this.closestBug = bugs[i];
			}
		}
	}
	
	/* web */
	o.webCenter = undefined;
	o.webRadius = undefined;
	o.constructWeb = function() {
		var center = new Vec(1050*Config.scaleX,200*Config.scaleY);
		this.webCenter = center;
		this.webRadius = 150*Config.scale;
		this.spiderWeb = new Marker('spiderWeb');
		addDrawObjBefore(this.spiderWeb, this.id);
		this.spiderWeb.setXYAbs(center[0], center[1]);
		this.spiderWeb.setSizeAbs(2*this.webRadius+150*Config.scale);
//		this.spiderWeb.setPixel('../../animations/spiderweb2.png');
		this.spiderWeb.setPixel('animations/flyAndSpiderweb/spiderweb.png');
		this.webConstucted = true;
//		this.setXY(center[0]+50,center[1]+50);
	}
	return o;
	
	
	/* not used */
//	o.circleAround = function() {
//		this.pose.x += this.vel * Math.cos(this.pose.theta);
//		this.pose.y += this.vel * Math.sin(this.pose.theta);
//		this.pose.theta += this.angVel;
//	};
//	o.gotoXY = function(x, y) {
//		var v = [x-this.pose.x, y-this.pose.y];
//		var d = lengthOfVec(v);
//		if (d<1) return false; //already there
//		normalizeVec(v);
//		this.pose.theta = Math.atan2(v[1], v[0]);
//		if (d>this.vel) d=this.vel;
//		this.pose.x += d*v[0];
//		this.pose.y += d*v[1];
//		return true;
//	};
		
//	/* old web construction */
//	o.strandId = 0;
//	o.strandWidth = 3;
//	o.addSupportStrand = function(p1,p2) {
//		this.addStrand(p1,p2);
//		this.supports.push(new Line(p1, p2));
//	}
//	o.webAnchor = [450,600];
//	o.web = [];
//	o.supports = [];
//	o.constructWeb2 = function() {
//		var numLayers = 9;
//		var center = new Vec(700,100+50);
//		var anchor1 = new Vec(500,0+50);
//		var anchor2 = new Vec(900,0+50);
//		var anchor3 = new Vec(center[0],center[1]+anchor1.minus(center).len());
//		this.addSupportStrand(center, anchor1);
//		this.webCenter = center;
//		this.webRadius = this.supports[0].len()*0.7;
////		console.log(this.webCenter, this.webRadius);
//		this.addIntermediateSupport(anchor1, anchor2, center);
//		this.addSupportStrand(center, anchor2);
//		this.addIntermediateSupport(anchor2, anchor3, center);
//		this.addSupportStrand(center, anchor3);
//		this.addIntermediateSupport(anchor3, anchor1, center);
//		for(var i=1; i<numLayers-1; i++) for(var j=0; j<this.supports.length; j++) {
//			var toInd = (j==this.supports.length-1 ? 0 : j+1);
//			this.addStrand(this.supports[j].getPoint(i/numLayers), this.supports[toInd].getPoint(i/numLayers));
//		}
//		this.pose.x = center[0];
//		this.pose.y = center[1];
//	}
//	o.addIntermediateSupport = function(a1, a2, center) {
//		var a12 = (new Line(a1,a2)).center();
//		var line = new Line(center,a12);
//		var a = line.getPoint(this.supports[0].len()/line.len());
//		this.addSupportStrand(center,a);
//	}
//	o.addStrand = function(fromPos, toPos) {
//		var strandName = 'Strand'+this.strandId;
//		this.strandId++;
//		var strand = new DrawLine(strandName, fromPos, toPos, this.strandWidth);
//		addObjToList(strand, this.web);
//		addDrawObjBefore(strand, this.id);
//		addUpdateObj(strand);
//	}
//	o.addCarryStrand = function() {
//		var fromPos = new Vec(this.pose.x, this.pose.y);
//		var toPos = new Vec(this.pose.x, this.pose.y);
//		this.addStrand(fromPos, toPos);		
//	}
//	o.updateCarryStrand = function() {
//		if (this.web.length <= 0) return;
//		var strand = this.web[this.web.length-1];
//		strand.setToPos(this.pose.getPos());
//	}
//	
	
/* old web building code */	
//	o.firstMove = false;
//	o.secondMove = false;
	
//	{
//	var fromPos = [400,0];
//	var toPos = [this.pose.x, this.pose.y];
//	this.addStrand(fromPos, toPos);
//	}
//if (!this.firstMove && !this.gotoXY(this.webAnchor[0], this.webAnchor[1])) {
//	this.firstMove = true;
//	this.addCarryStrand();
//}
//if (this.firstMove && !this.secondMove && !this.gotoXY(600,300)) {
//	this.secondMove = true;
//	this.addCarryStrand();
//}
//if (this.secondMove) this.move();
//this.updateCarryStrand();
//console.log('spider: '+this.pose.x+' '+this.pose.y);

}

