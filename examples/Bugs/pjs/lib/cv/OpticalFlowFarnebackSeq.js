//TODO: make this into class and init all temp arrays appropriately
function FarnebackPolyExpSeq(src,v0,v1,v2,dest) {
  var n=5;//(g.length-1)/2;
  //Precomputed by OpenCV for polyN=5 polySigma=1.2
  var ig11=0.694486393023049,ig03=-0.347453530622514,ig33=0.241301747286859,ig55=0.482311346219923;
  var ig=[ig11,ig03,ig33,ig55];
  var g=[5.64693182241172e-05,0.00128523574676365,0.0146069535985589,0.0828978195786476,0.234927147626877,0.332452744245529,0.234927147626877,0.0828978195786476,0.0146069535985589,0.00128523574676365,5.64693182241172e-05]; //[-5,5]
  var xg=[-0.000282346591120586,-0.00514094298705459,-0.0438208617269993,-0.165795639157295,-0.234927147626877,0,0.234927147626877,0.165795639157295,0.0438208617269993,0.00514094298705459,0.000282346591120586];
  var xxg=[0.00141173298470676,0.0205637719482183,0.131462588906288,0.33159127831459,0.234927147626877,0,0.234927147626877,0.33159127831459,0.131462588906288,0.0205637719482183,0.00141173298470676];

  verticalFilter2DInnerSeq(src,g,v0);
  verticalFilter2DInnerSeq(src,xg,v1);
  verticalFilter2DInnerSeq(src,xxg,v2);
  if (dest.depth!=5||dest.height!=v0.height||dest.width!=v0.width-g.length+1) throw "dest dimensions are wrong";

  for (var yd=0;yd<dest.height;yd++) {
    for (var xd=0;xd<dest.width;xd++) {
      var y=yd;
      var x=xd+n;

      //same notation as in OpenCV FarnebackPolyExp horizontal part of convolution
      var g0=g[n+0];
      var b1=v0.data[((y)*v0.width)+(x)]*g0;
      var b2=0;
      var b3=v1.data[((y)*v1.width)+(x)]*g0;
      var b4=0;
      var b5=v2.data[((y)*v2.width)+(x)]*g0;
      var b6=0;
      for (var k=1;k<=n;k++) {
        var tg=v0.data[((y)*v0.width)+(x+k)]+v0.data[((y)*v0.width)+(x-k)];
        g0=g[n+k];
        b1+=tg*g0;
        b4+=tg*xxg[n+k];
        b2+=(v0.data[((y)*v0.width)+(x+k)]-v0.data[((y)*v0.width)+(x-k)])*xg[n+k];
        b3+=(v1.data[((y)*v1.width)+(x+k)]+v1.data[((y)*v1.width)+(x-k)])*g0;
        b6+=(v1.data[((y)*v1.width)+(x+k)]-v1.data[((y)*v1.width)+(x-k)])*xg[n+k];
        b5+=(v2.data[((y)*v2.width)+(x+k)]+v2.data[((y)*v2.width)+(x-k)])*g0;
      }
      var ig11=ig[0];
      var ig03=ig[1];
      var ig33=ig[2];
      var ig55=ig[3];

      dest.data[(yd*dest.width+xd)*dest.depth]=b3*ig11;
      dest.data[(yd*dest.width+xd)*dest.depth+1]=b2*ig11;
      dest.data[(yd*dest.width+xd)*dest.depth+2]=b1*ig03 + b5*ig33;
      dest.data[(yd*dest.width+xd)*dest.depth+3]=b1*ig03 + b4*ig33;
      dest.data[(yd*dest.width+xd)*dest.depth+4]=b6*ig55;
    }
  }
}

function FarnebackUpdateMatricesSeq(R0,R1,flow,matM) {
  if (flow.depth!=2) throw "flow dimensions are wrong";
  if (matM.depth!=5||matM.height!=flow.height||matM.width!=flow.width) throw "matM dimensions are wrong";

  var height=flow.height;
  var width=flow.width;

  for (var y=0;y<matM.height;y++) {
    for (var x=0;x<matM.width;x++) {
      var dx=flow.data[(y*flow.width+x)*flow.depth];
      var dy=flow.data[(y*flow.width+x)*flow.depth+1];
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
    
        //OpenCV ptr is R1[y1,x1];
        r2 = a00*R1.data[(((y1)*R1.width)+(x1))*R1.depth+(0)]+a01*R1.data[(((y1)*R1.width)+(x1+1))*R1.depth+(0)]+a10*R1.data[(((y1+1)*R1.width)+(x1))*R1.depth+(0)]+a11*R1.data[(((y1+1)*R1.width)+(x1+1))*R1.depth+(0)];
        r3 = a00*R1.data[(((y1)*R1.width)+(x1))*R1.depth+(1)]+a01*R1.data[(((y1)*R1.width)+(x1+1))*R1.depth+(1)]+a10*R1.data[(((y1+1)*R1.width)+(x1))*R1.depth+(1)]+a11*R1.data[(((y1+1)*R1.width)+(x1+1))*R1.depth+(1)];
        r4 = a00*R1.data[(((y1)*R1.width)+(x1))*R1.depth+(2)]+a01*R1.data[(((y1)*R1.width)+(x1+1))*R1.depth+(2)]+a10*R1.data[(((y1+1)*R1.width)+(x1))*R1.depth+(2)]+a11*R1.data[(((y1+1)*R1.width)+(x1+1))*R1.depth+(2)];
        r5 = a00*R1.data[(((y1)*R1.width)+(x1))*R1.depth+(3)]+a01*R1.data[(((y1)*R1.width)+(x1+1))*R1.depth+(3)]+a10*R1.data[(((y1+1)*R1.width)+(x1))*R1.depth+(3)]+a11*R1.data[(((y1+1)*R1.width)+(x1+1))*R1.depth+(3)];
        r6 = a00*R1.data[(((y1)*R1.width)+(x1))*R1.depth+(4)]+a01*R1.data[(((y1)*R1.width)+(x1+1))*R1.depth+(4)]+a10*R1.data[(((y1+1)*R1.width)+(x1))*R1.depth+(4)]+a11*R1.data[(((y1+1)*R1.width)+(x1+1))*R1.depth+(4)];
    
        //OpenCV R0 is R0[y,0]
        r4 = (R0.data[(((y)*R0.width)+(x))*R0.depth+(2)] + r4)*0.5;
        r5 = (R0.data[(((y)*R0.width)+(x))*R0.depth+(3)] + r5)*0.5;
        r6 = (R0.data[(((y)*R0.width)+(x))*R0.depth+(4)] + r6)*0.25;
      } else {
        r2 = 0.0;
        r3 = 0.0;
        r4 = R0.data[(((y)*R0.width)+(x))*R0.depth+(2)];
        r5 = R0.data[(((y)*R0.width)+(x))*R0.depth+(3)];
        r6 = R0.data[(((y)*R0.width)+(x))*R0.depth+(4)]*0.5;
      }
      r2 = (R0.data[(((y)*R0.width)+(x))*R0.depth+(0)] - r2)*0.5;
      r3 = (R0.data[(((y)*R0.width)+(x))*R0.depth+(1)] - r3)*0.5;
      r2 += r4*dy + r6*dx;
      r3 += r6*dy + r5*dx;
    
      matM.data[(y*matM.width+x)*matM.depth]=r4*r4+r6*r6;
      matM.data[(y*matM.width+x)*matM.depth+1]=(r4+r5)*r6;
      matM.data[(y*matM.width+x)*matM.depth+2]=(r5*r5)+(r6*r6);
      matM.data[(y*matM.width+x)*matM.depth+3]=(r4*r2)+(r6*r3);
      matM.data[(y*matM.width+x)*matM.depth+4]=(r6*r2)+(r5*r3);
    }
  }
}

function FarnebackUpdateFlowGaussianSeq(matM,blockSize,blockSigma,padM,vM,hvM,flow,useTimer,i) {
  if (flow.depth!=2) throw "flow dimensions are wrong";
  if (matM.depth!=5||matM.height!=flow.height||matM.width!=flow.width) throw "matM dimensions are wrong";
  var m=(blockSize-1)/2;
  if (m%1!=0) throw "blockSize must be odd";
  var sigma=m*0.3;
  if (blockSigma!=undefined) { sigma=blockSigma; }
  var filterKernel=GetGaussianKernel(blockSize,sigma);
  if (useTimer) timer.start("FarnebackFlowGaussPadSeq"+i);
  padBorder3DSeq(matM,padM);
  if (useTimer) timer.end("FarnebackFlowGaussPadSeq"+i);
  if (useTimer) timer.start("FarnebackFlowGaussVFSeq"+i);
  verticalFilter3DInnerSeq(padM,filterKernel,vM);
  if (useTimer) timer.end("FarnebackFlowGaussVFSeq"+i);
  if (useTimer) timer.start("FarnebackFlowGaussHFSeq"+i);
  horizontalFilter3DInnerSeq(vM,filterKernel,hvM);
  if (useTimer) timer.end("FarnebackFlowGaussHFSeq"+i);

  if (useTimer) timer.start("FarnebackFlowGaussUpdateSeq"+i);
  for (var y=0;y<flow.height;y++) {
    for (var x=0;x<flow.width;x++) {
      var g11=hvM.data[(y*hvM.width+x)*hvM.depth];
      var g12=hvM.data[(y*hvM.width+x)*hvM.depth+1];
      var g22=hvM.data[(y*hvM.width+x)*hvM.depth+2];
      var h1=hvM.data[(y*hvM.width+x)*hvM.depth+3];
      var h2=hvM.data[(y*hvM.width+x)*hvM.depth+4];
      var idet=1.0/((g11*g22)-(g12*g12)+0.001);
      flow.data[(y*flow.width+x)*flow.depth]=((g11*h2)-(g12*h1))*idet;
      flow.data[(y*flow.width+x)*flow.depth+1]=((g22*h1)-(g12*h2))*idet;
    }
  }
  if (useTimer) timer.end("FarnebackFlowGaussUpdateSeq"+i);
}

//TODO: put above methods into OpticalFlowFarnebackSeq.prototype

function OpticalFlowFarnebackSeq(options) {
  this.options=options;
  this.initialized=false;
}
OpticalFlowFarnebackSeq.prototype={
  process:function(prev,next) {
    if (!this.initialized) this.init(prev);
    var options=this.options;
    var levels=options.levels;
    var winSize=options.winSize;
    var sigma=options.sigma;
    var iterations=options.iterations;
    if (options.useTimer) timer.start("OpticalFlowFarnebackSeq");
    //TODO: for each level
    //TODO: OpenCV does GaussianBlur on prev&next prior to running this
    //R0&R1 is prev&next-10pix (5pix offset, polyN)
    if (options.useTimer) timer.start("FarnebackPolyExpSeq");
    FarnebackPolyExpSeq(prev,this.v0,this.v1,this.v2,this.R0);
    FarnebackPolyExpSeq(next,this.v0,this.v1,this.v2,this.R1);
    if (options.useTimer) timer.end("FarnebackPolyExpSeq");
    if (options.useTimer) timer.start("FarnebackInitFlowSeq");
    for (var i=0;i<this.flow.data.length;i++) this.flow.data[i]=0.0;
    if (options.useTimer) timer.end("FarnebackInitFlowSeq");
    for (var i=0;i<iterations;i++) {
      if (options.useTimer) timer.start("FarnebackUpdateMatSeq"+i);
      FarnebackUpdateMatricesSeq(this.R0,this.R1,this.flow,this.matM);
      if (options.useTimer) timer.end("FarnebackUpdateMatSeq"+i);
      if (options.useTimer) timer.start("FarnebackFlowGaussSeq"+i);
      FarnebackUpdateFlowGaussianSeq(this.matM,winSize,sigma,this.padM,this.vM,this.hvM,this.flow,options.useTimer,i);
      if (options.useTimer) timer.end("FarnebackFlowGaussSeq"+i);
    }
    if (options.useTimer) timer.end("OpticalFlowFarnebackSeq");
    return this.flow;
  },
  init:function(frame) {
    var fw=frame.width;
    var fh=frame.height;
    var w=fw-10;
    var h=fh-10;
    var p=this.options.winSize-1;
    this.v0=new JSArray2D(fw,h,Float32Array);
    this.v1=new JSArray2D(fw,h,Float32Array);
    this.v2=new JSArray2D(fw,h,Float32Array);
    this.R0=new JSArray3D(w,h,5,Float32Array);
    this.R1=new JSArray3D(w,h,5,Float32Array);
    this.flow=new JSArray3D(w,h,2,Float32Array);
    this.matM=new JSArray3D(w,h,5,Float32Array);
    this.padM=new JSArray3D(w+p,h+p,5,Float32Array);
    this.vM=new JSArray3D(w+p,h,5,Float32Array);
    this.hvM=new JSArray3D(w,h,5,Float32Array);
  },
};
