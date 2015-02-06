function FarnebackPolyExpHEF(ind,v0,v1,v2,ig,g,xg,xxg) {
  var n=5;//(g.length-1)/2;
  var y=ind[0];
  var x=ind[1]+n;

  //same notation as in OpenCV FarnebackPolyExp horizontal part of convolution
  var g0=g[n+0];
  var b1=v0.get(y,x)*g0;
  var b2=0;
  var b3=v1.get(y,x)*g0;
  var b4=0;
  var b5=v2.get(y,x)*g0;
  var b6=0;
  for (var k=1;k<=n;k++) {
    var tg=v0.get(y,x+k)+v0.get(y,x-k);
    g0=g[n+k];
    b1+=tg*g0;
    b4+=tg*xxg[n+k];
    b2+=(v0.get(y,x+k)-v0.get(y,x-k))*xg[n+k];
    b3+=(v1.get(y,x+k)+v1.get(y,x-k))*g0;
    b6+=(v1.get(y,x+k)-v1.get(y,x-k))*xg[n+k];
    b5+=(v2.get(y,x+k)+v2.get(y,x-k))*g0;
  }
  var ig11=ig[0];
  var ig03=ig[1];
  var ig33=ig[2];
  var ig55=ig[3];
  return [b3*ig11,b2*ig11,b1*ig03 + b5*ig33,b1*ig03 + b4*ig33,b6*ig55];
}

//for n=5, polySigma=1.2
//returns [src.getShape()[0]-10,src.getShape()[1]-10,5] for R matrix without 5pix (n) border
function FarnebackPolyExp(src) {
  //Precomputed by OpenCV for polyN=5 polySigma=1.2
  var ig11=0.694486393023049,ig03=-0.347453530622514,ig33=0.241301747286859,ig55=0.482311346219923;
  var ig=[ig11,ig03,ig33,ig55];
  var g=[5.64693182241172e-05,0.00128523574676365,0.0146069535985589,0.0828978195786476,0.234927147626877,0.332452744245529,0.234927147626877,0.0828978195786476,0.0146069535985589,0.00128523574676365,5.64693182241172e-05]; //[-5,5]
  var xg=[-0.000282346591120586,-0.00514094298705459,-0.0438208617269993,-0.165795639157295,-0.234927147626877,0,0.234927147626877,0.165795639157295,0.0438208617269993,0.00514094298705459,0.000282346591120586];
  var xxg=[0.00141173298470676,0.0205637719482183,0.131462588906288,0.33159127831459,0.234927147626877,0,0.234927147626877,0.33159127831459,0.131462588906288,0.0205637719482183,0.00141173298470676];

  var v0=verticalFilter(src,g, 0);
  var v1=verticalFilter(src,xg, 1);
  var v2=verticalFilter(src,xxg, 2);
  var dim=v0.getShape();
  var destDim=[dim[0],dim[1]-g.length+1];

  return new ParallelArray(destDim,FarnebackPolyExpHEF,v0,v1,v2,ig,g,xg,xxg);
}

function FarnebackUpdateMatricesEF(ind,R0,R1,flow,offsetC) {
  var offset=0;//GetSpecializedConst(offsetC); //NOTE: obsolete, offset is now 0
  var y=ind[0];
  var x=ind[1];
  //var dim=flow.getShape();
  var dim=this.getShape();//TODO:revert back to flow
  var dx=flow.get(y,x,0);
  var dy=flow.get(y,x,1);
  var height=dim[0]+(2*offset);
  var width=dim[1]+(2*offset);
  x+=offset;
  y+=offset;
  var fx=x+dx;
  var fy=y+dy;
  var x1=Math.floor(fx);
  var y1=Math.floor(fy);
  var r2,r3,r4,r5,r6;
  fx-=x1;
  fy-=y1;
  if (0<=x1&&x1<(width-1)&&0<=y1&&y1<(height-1)) {
    var a00 = (1.0-fx)*(1.0-fy);
    var a01 = fx*(1.0-fy);
    var a10 = (1.0-fx)*fy;
    var a11 = fx*fy;

    var b00=R1.get(y1,x1);
    var b01=R1.get(y1,x1+1);
    var b10=R1.get(y1+1,x1);
    var b11=R1.get(y1+1,x1+1);
    //OpenCV ptr is R1[y1,x1];
    r2 = a00*b00.get(0)+a01*b01.get(0)+a10*b10.get(0)+a11*b11.get(0);
    r3 = a00*b00.get(1)+a01*b01.get(1)+a10*b10.get(1)+a11*b11.get(1);
    r4 = a00*b00.get(2)+a01*b01.get(2)+a10*b10.get(2)+a11*b11.get(2);
    r5 = a00*b00.get(3)+a01*b01.get(3)+a10*b10.get(3)+a11*b11.get(3);
    r6 = a00*b00.get(4)+a01*b01.get(4)+a10*b10.get(4)+a11*b11.get(4);

    //OpenCV R0 is R0[y,0]
    r4 = (R0.get(y,x,2) + r4)*0.5;
    r5 = (R0.get(y,x,3) + r5)*0.5;
    r6 = (R0.get(y,x,4) + r6)*0.25;
  } else {
    r2 = 0.0;
    r3 = 0.0;
    r4 = R0.get(y,x,2);
    r5 = R0.get(y,x,3);
    r6 = R0.get(y,x,4)*0.5;
  }
  r2 = (R0.get(y,x,0) - r2)*0.5;
  r3 = (R0.get(y,x,1) - r3)*0.5;
  r2 += r4*dy + r6*dx;
  r3 += r6*dy + r5*dx;

  return [r4*r4+r6*r6,(r4+r5)*r6,(r5*r5)+(r6*r6),(r4*r2)+(r6*r3),(r6*r2)+(r5*r3)];
}
//returns matM, same size as flow which should be offset*2 smaller than R0&R1
function FarnebackUpdateMatrices(R0,R1,flow,offset) {
  //TODO: use new ParallelArray for clarity
  return flow.combine(2,FarnebackUpdateMatricesEF,R0,R1,flow,SpecializeConst(offset));
}

function FarnebackUpdateFlowGaussianEF(ind,flowFactor) {
  var b=this.get(ind);
  var g11=b.get(0);
  var g12=b.get(1);
  var g22=b.get(2);
  var h1=b.get(3);
  var h2=b.get(4);
  var idet=1.0/((g11*g22)-(g12*g12)+0.001);
  return [((g11*h2)-(g12*h1))*idet*flowFactor,((g22*h1)-(g12*h2))*idet*flowFactor];
}
//TODO: make all of these in a prototype instead of passing around useTimer and i
//returns flow
function FarnebackUpdateFlowGaussian(matM,blockSize,blockSigma,flowFactor,useTimer,i) {
  var m=(blockSize-1)/2;
  if (m%1!=0) throw "blockSize must be odd";
  var sigma=m*0.3;
  if (blockSigma!=undefined) { sigma=blockSigma; }
  if (useTimer) timer.start("FarnebackFlowGaussGetKernel"+i);
  var filterKernel=GetGaussianKernel(blockSize,sigma);
  if (useTimer) timer.end("FarnebackFlowGaussGetKernel"+i);
  if (useTimer) timer.start("FarnebackFlowGaussPad"+i);
  var padM=padBorder(matM,m);
  if (useTimer) timer.end("FarnebackFlowGaussPad"+i);
  if (useTimer) timer.start("FarnebackFlowGaussVF"+i);
  var vM=verticalFilter(padM,filterKernel);
  if (useTimer) timer.end("FarnebackFlowGaussVF"+i);
  if (useTimer) timer.start("FarnebackFlowGaussHF"+i);
  var hvM=horizontalFilter(vM,filterKernel);
  if (useTimer) timer.end("FarnebackFlowGaussHF"+i);
  if (useTimer) timer.start("FarnebackFlowGaussUpdate"+i);
  var flow=hvM.combine(2,FarnebackUpdateFlowGaussianEF,flowFactor);
  if (useTimer) timer.end("FarnebackFlowGaussUpdate"+i);
  return flow;
}

function EmptyFlowEF(ind) { return [0,0]; }

//returns flow
function CalculateOpticalFlowFarneback(prev,next,options) {
  var levels=options.levels;
  var winSize=options.winSize;
  var sigma=options.sigma;
  var iterations=options.iterations;
  if (options.useTimer) timer.start("OpticalFlowFarneback");
  //TODO: for each level
  //TODO: OpenCV does GaussianBlur on prev&next prior to running this
  //R0&R1 is prev&next-10pix (5pix offset, polyN)
  if (options.useTimer) timer.start("FarnebackPolyExp");
  var R0=FarnebackPolyExp(prev);
  var R1=FarnebackPolyExp(next);
  if (options.useTimer) timer.end("FarnebackPolyExp");
  if (options.useTimer) timer.start("FarnebackInitFlow");
  var flow=new ParallelArray([R0.getShape()[0],R0.getShape()[1]],EmptyFlowEF);
  if (options.useTimer) timer.end("FarnebackInitFlow");
  for (var i=0;i<iterations;i++) {
    if (options.useTimer) timer.start("FarnebackUpdateMat"+i);
    var matM=FarnebackUpdateMatrices(R0,R1,flow,0);
    if (options.useTimer) timer.end("FarnebackUpdateMat"+i);
    if (options.useTimer) timer.start("FarnebackFlowGauss"+i);
    var flowFactor=options.flowFactorFinal;
    if (i<iterations-1) flowFactor=options.flowFactorIterations;
    flow=FarnebackUpdateFlowGaussian(matM,winSize,sigma,flowFactor,options.useTimer,i);
    if (options.useTimer) timer.end("FarnebackFlowGauss"+i);
  }
  if (options.useTimer) timer.end("OpticalFlowFarneback");
  return flow;
}
