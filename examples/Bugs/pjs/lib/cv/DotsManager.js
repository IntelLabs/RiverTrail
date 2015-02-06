function DotsManager(flowManager,numDots,dotImage) {
  this.flowManager=flowManager;
  this.numDots=numDots;
  this.initialized=false;
  this.dotImage=dotImage;
}
DotsManager.prototype={
  init:function() {
    this.randomize();
    this.initialized=true;
  },
  getRandomPose:function() {
    var pose=[0,0];
    for (var i=0;i<2;i++) {
      var l=this.flowManager.imageBorder[i];
      var h=this.flowManager.imageSize[i]-l;
      pose[i]=(Math.random()*(h-l))+l;
    }
    return pose;
  },
  isPoseInBounds:function(pose) {
    for (var i=0;i<2;i++) {
      //TODO: not fully correct due to rounding
      var l=this.flowManager.imageBorder[i]+2;
      var h=this.flowManager.imageSize[i]-l;
      if (pose[i]<l||pose[i]>h) { return false; }
    }
    return true;
  },
  randomize:function() {
    this.dots=[];
    for (var i=0;i<this.numDots;i++) {
      this.dots[i]=this.getRandomPose();
    }
  },
  moveDots:function() {
    if (!this.initialized) { this.init(); }
    timer.start("moveDots");
    for (var i=this.dots.length-1;i>=0;i--) {
      this.dots[i]=this.flowManager.pointMoveTo(this.dots[i]);
      if (!this.isPoseInBounds(this.dots[i])) {
        //this.dots[i]=this.getRandomPose();
        this.dots.splice(i,1);
      }
    }
    timer.end("moveDots");
  },
  drawDots:function() {
    timer.start("drawDots");
    for (var i=0;i<this.dots.length;i++) {
      var pos=this.dots[i];
      imageManager.addImage(this.dotImage,pos[0],pos[1]);
    }
    timer.end("drawDots");
  },
};
