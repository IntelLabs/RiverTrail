function DenseOpticalFlowManagerSeq(configuration) {
  var defaultConfiguration={
    flowWidth:160,
    flowHeight:90,
    imageWidth:1280,
    imageHeight:720,
    flipImage:true,
    padBorder:true,
    calculateFlowClass:OpticalFlowFarnebackSeq,
    polyN:5,
    polySigma:1.2,
    levels:0,
    winSize:15,
    flowPad:15,
    resizeRefineXNum:2,
    resizeRefineYNum:2,
    sigma:undefined,
    iterations:3,
    flowFactorIterations:1.0,
    flowFactorFinal:1.0,
    grayFactor:1.0,
    useTimer:true,
    debugTime:false,
  };
  for (var i in defaultConfiguration) {
    if (!(i in configuration)) {
      configuration[i]=defaultConfiguration[i];
    }
  }
  this.configuration=configuration;
  if (this.configuration.calculateFlowObject===undefined) {
    this.configuration.calculateFlowObject=new this.configuration.calculateFlowClass(this.configuration);
  }
  this.initialized=false;
}
DenseOpticalFlowManagerSeq.prototype={
  init:function(frame) {
    var c=this.configuration;
    this.gs1=new JSArray2D(frame.width,frame.height);
    this.gs2=new JSArray2D(c.flowWidth,c.flowHeight);
    this.gs3=new JSArray2D(c.flowWidth+10,c.flowHeight+10);
    var innerWidth=this.configuration.flowWidth;
    var innerHeight=this.configuration.flowHeight;
    var refineXNum=this.configuration.resizeRefineXNum;
    var refineYNum=this.configuration.resizeRefineYNum;
    var refinePad=this.configuration.flowPad;
    var outerPad=this.configuration.polyN;
    this.refine1=new JSArray2D(innerWidth*refineXNum,innerHeight*refineYNum);
	this.refine2=new JSArray2D(innerWidth+(refinePad*2)+(outerPad*2),(innerHeight+(refinePad*2))*refineXNum*refineYNum+(outerPad*2));
  },
  resizeRefineGrayscalePaddingV:function(src) {
    var innerWidth=this.configuration.flowWidth;
    var innerHeight=this.configuration.flowHeight;
    var refineXNum=this.configuration.resizeRefineXNum;
    var refineYNum=this.configuration.resizeRefineYNum;
    var refinePad=this.configuration.flowPad;
    var outerPad=this.configuration.polyN;
    if (this.configuration.useTimer) timer.start("computeFlowSeq-refine-resize1");
    grayscaleResizeMultImageSeq(src,this.refine1,1/(refineXNum*refineYNum));
    src=this.refine1;
    if (this.configuration.useTimer) timer.end("computeFlowSeq-refine-resize1");
    var srcShape=src.getShape();
	var stepY=srcShape[0]/innerHeight;
	var stepX=srcShape[1]/innerWidth;
	if (stepX%1!=0||stepY%1!=0) throw "interpolation not implemented, can only resize to smaller size that is 1/int of the original";
	var refineXStep=stepX/refineXNum;
	var refineYStep=stepY/refineYNum;
	if (stepX!=refineXNum||refineYNum!=stepY) throw "something is wrong: stepX "+stepX+" refineXNum "+refineXNum;

	var refineWidth=innerWidth+(2*refinePad);
	var refineHeight=innerHeight+(2*refinePad);
	var dest=this.refine2;
	for (var yd=0;yd<dest.height;yd++) {
		for (var xd=0;xd<dest.width;xd++) {
			//figure out rn, refineX and refineY
			var sy=yd;
			sy-=outerPad;
			if (sy<0) sy=0;
			if (sy>refineHeight*refineXNum*refineYNum-1) sy=refineHeight*refineXNum*refineYNum-1;
			var rn=Math.floor(sy/refineHeight);
			var sy=sy%refineHeight;
			var refineY=Math.floor(rn/refineXNum);
			var refineX=rn%refineXNum;
			sy-=refinePad;
			if (sy<0) sy=0;
			//figure out starting x&y positions in src
			sy*=stepY;
			sy+=refineY*refineYStep;
			if (sy>srcShape[0]-stepY) sy=srcShape[0]-stepY;
			var sx=xd-outerPad-refinePad;
			if (sx<0) sx=0;
			sx*=stepX;
			sx+=refineX*refineXStep;
			if (sx>srcShape[1]-stepX) sx=srcShape[1]-stepX;
			//compute
			var total = 0;
			for ( var yOffset = 0; yOffset < stepY; yOffset++) {
				for ( var xOffset = 0; xOffset < stepX; xOffset++) {
					total += src.get(sy + yOffset, sx + xOffset);
				}
			}
			dest.data[yd*dest.width+xd]=total;
		}
	}
	return dest;
  },
  computeFlow:function(currentFrame) {
    if (!this.initialized) this.init(currentFrame);
    if (this.configuration.useTimer) timer.start("computeFlowSeq");
    if (this.configuration.useTimer) timer.start("computeFlow-resizeRefineGrayscalePaddingV2");
	var flowFrame=this.resizeRefineGrayscalePaddingV(currentFrame);
    if (this.configuration.useTimer) timer.end("computeFlow-resizeRefineGrayscalePaddingV2");

    this.imageSize=[this.configuration.imageWidth,this.configuration.imageHeight];
    var destDim=[this.configuration.flowHeight,this.configuration.flowWidth];

    if (this.previousFrame===undefined) {
      this.previousFrame=flowFrame;
    }
    this.flow=this.configuration.calculateFlowObject.process(this.previousFrame,flowFrame);
    this.previousFrame=flowFrame;

    var flowDim=destDim.slice(0);
    this.flowScale=[0,0];
    this.offsetFlow=[0,0];
    this.imageBorder=[0,0];
    for (var i=0;i<2;i++) {
      this.flowScale[1-i]=this.imageSize[1-i]/destDim[i];
      this.offsetFlow[1-i]=(destDim[i]-flowDim[i])/2;
    }
    for (var i=0;i<2;i++) {
      this.imageBorder[i]=this.offsetFlow[i]*this.flowScale[i];
    }
    if (this.configuration.flipImage) {
      this.flowScale[0]*=-1;
      this.offsetFlow[0]-=destDim[1];
    }
    if (this.configuration.useTimer) timer.end("computeFlowSeq");
  },
  pointMoveTo:function(point) {
    var flowPos2=[0,0];
    flowPos2[0]=(point[1]/this.flowScale[1]-this.offsetFlow[1])*this.configuration.resizeRefineYNum;
    flowPos2[1]=(point[0]/this.flowScale[0]-this.offsetFlow[0])*this.configuration.resizeRefineXNum;
    flowPos2[0]=Math.round(flowPos2[0]-1);
    flowPos2[1]=Math.round(flowPos2[1]-1);
    if (flowPos2[0]<0) flowPos2[0]=0;
    if (flowPos2[1]<0) flowPos2[1]=0;
	var refineY=flowPos2[0]%this.configuration.resizeRefineYNum;
	var refineX=flowPos2[1]%this.configuration.resizeRefineXNum;
	var rn=refineY*this.configuration.resizeRefineXNum+refineX;
	flowPos2[0]-=refineY;
	flowPos2[1]-=refineX;
	flowPos2[0]/=this.configuration.resizeRefineYNum;
	flowPos2[1]/=this.configuration.resizeRefineXNum;
	flowPos2[0]+=rn*(this.configuration.flowHeight+(this.configuration.flowPad*2));
	flowPos2[0]+=this.configuration.flowPad;
	flowPos2[1]+=this.configuration.flowPad;
    var pointFlow2=[0,0];
      for (var i=0;i<2;i++) {
        pointFlow2[i]=this.flow.get(flowPos2).get(i)*this.flowScale[i];
      }
    var moveTo=point.slice(0);
    for (var i=0;i<2;i++) {
      moveTo[i]+=pointFlow2[i];
    }
    return moveTo;
  },
};
