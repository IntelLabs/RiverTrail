function DenseOpticalFlowManager(configuration) {
  var defaultConfiguration={
    flowWidth:160,
    flowHeight:90,
    imageWidth:1280,
    imageHeight:720,
    flipImage:true,
    padBorder:true,
    calculateFlow:CalculateOpticalFlowFarneback,
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
}
function resizeRefinePaddingVEF(ind,src,innerWidth,innerHeight,refineXNum,refineYNum,refinePad,outerPad,refineXStep,refineYStep,stepX,stepY) {
	var srcShape=src.getShape();
	var refineWidth=innerWidth+(2*refinePad);
	var refineHeight=innerHeight+(2*refinePad);
	//figure out rn, refineX and refineY
	var sy=ind[0];
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
	var sx=ind[1]-outerPad-refinePad;
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
	return total;
}
function resizeRefineGrayscalePaddingV(src,innerWidth,innerHeight,refineXNum,refineYNum,refinePad,outerPad) {
	var gsShape=[innerHeight*refineYNum,innerWidth*refineXNum];
	timer.start("computeFlow-refine-resize1");
    src=grayscaleResizeMultImage(src,gsShape,1/(refineXNum*refineYNum));
	timer.end("computeFlow-refine-resize1");

    var srcShape=src.getShape();
	var stepY=srcShape[0]/innerHeight;
	var stepX=srcShape[1]/innerWidth;
	if (stepX%1!=0||stepY%1!=0) throw "interpolation not implemented, can only resize to smaller size that is 1/int of the original";
	var refineXStep=stepX/refineXNum;
	var refineYStep=stepY/refineYNum;
	var scale=1/(stepX*stepY);
	if (stepX!=refineXNum||refineYNum!=stepY) throw "something is wrong: stepX "+stepX+" refineXNum "+refineXNum;
	var shape=[(innerHeight+(refinePad*2))*refineXNum*refineYNum+(outerPad*2),innerWidth+(refinePad*2)+(outerPad*2)];
	return new ParallelArray(shape,resizeRefinePaddingVEF,src,innerWidth,innerHeight,refineXNum,refineYNum,refinePad,outerPad,refineXStep,refineYStep,stepX,stepY);
}
DenseOpticalFlowManager.prototype={
  computeFlow:function(currentFrame) {
	if (this.configuration.useTimer) timer.start("computeFlow");
	var conf=this.configuration;
    if (this.configuration.useTimer) timer.start("computeFlow-resizeRefineGrayscalePaddingV2");
	var flowFrame=resizeRefineGrayscalePaddingV(currentFrame,conf.flowWidth,conf.flowHeight,conf.resizeRefineXNum,conf.resizeRefineYNum,conf.flowPad,conf.polyN);
    if (this.configuration.useTimer) timer.end("computeFlow-resizeRefineGrayscalePaddingV2");
    var destDim=[this.configuration.flowHeight,this.configuration.flowWidth];
    this.imageSize=[this.configuration.imageWidth,this.configuration.imageHeight];
    if (this.previousFrame2===undefined) {
      this.previousFrame2=flowFrame;
    }
    this.flow2=this.configuration.calculateFlow(this.previousFrame2,flowFrame,this.configuration);
    this.previousFrame2=flowFrame;

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
    if (this.configuration.useTimer) timer.end("computeFlow");
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
    /*
      for (var i=0;i<2;i++) {
        pointFlow2[i]=this.flow2.get(flowPos2).get(i)*this.flowScale[i];
      }
    */
    //pointFlow2[0]=this.flow2.get(flowPos2,0)*this.flowScale[0];
    var shape = this.flow2.getShape();
    pointFlow2[0] = this.flow2.data[flowPos2[0]*shape[1]*shape[2] + flowPos2[1]*shape[2]]*this.flowScale[0];
    //pointFlow2[1]=this.flow2.get(flowPos2,1)*this.flowScale[1];
    pointFlow2[1] = this.flow2.data[flowPos2[0]*shape[1]*shape[2] + flowPos2[1]*shape[2]+1]*this.flowScale[1]
    var moveTo=point.slice(0);
    for (var i=0;i<2;i++) {
      moveTo[i]+=pointFlow2[i];
    }
    return moveTo;
  },
};
