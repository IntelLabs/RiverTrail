function horizontalFilterEF(ind,src,k) {
  var y=ind[0];
  var x=ind[1];
  var r=0;
  for (var i=0;i<k.length;i++) {
    r+=src.get(y,x+i)*k[i];
  }
  return r;
}
function horizontalFilter3DEF(ind,src,k) {
  var y=ind[0];
  var x=ind[1];
  var z=ind[2];
  var r=0;
  for (var i=0;i<k.length;i++) {
    r+=src.get(y,x+i,z)*k[i];
  }
  return r;
}
function horizontalFilter(src,k) {
  var dim=src.getShape();
  var destDim=dim.slice(0);
  destDim[1]-=k.length-1;
  if (dim.length==2) {
    return new ParallelArray(destDim,horizontalFilterEF,src,k);
  } else if (dim.length==3) {
    return new ParallelArray(destDim,horizontalFilter3DEF,src,k);
  } else {
    throw "horizontalFilter can only support 2D and 3D arrays";
  }
}

function verticalFilterEF(ind,src,k) {
  var y=ind[0];
  var x=ind[1];
  var r=0;
  for (var i=0;i<k.length;i++) {
    r+=src.get(y+i,x)*k[i];
  }
  return r;
}
function verticalFilter3DEF(ind,src,k) {
  var y=ind[0];
  var x=ind[1];
  var z=ind[2];
  var r=0;
  for (var i=0;i<k.length;i++) {
    r+=src.get(y+i,x,z)*k[i];
  }
  return r;
}
function verticalFilter(src,k) {
  var dim=src.getShape();
  var destDim=dim.slice(0);
  destDim[0]-=k.length-1;
  if (dim.length==2) {
    return new ParallelArray(destDim,verticalFilterEF,src,k);
  } else if (dim.length==3) {
    return new ParallelArray(destDim,verticalFilter3DEF,src,k);
  } else {
    throw "verticalFilter can only support 2D and 3D arrays";
  }
}

function GetGaussianKernel(size,sigma) {
  //default sigma if not specified is like in OpenCV: (size-3)*0.15+0.8
  if (sigma<=0) { sigma=(size-3)*0.15+0.8; }
  var a=new Array(size);
  var sum=0;
  var scale2X=-0.5/(sigma*sigma);
  for (var i=0;i<size;i++) {
    var x=i-((size-1)*0.5);
    a[i]=Math.exp(scale2X*x*x);
    sum+=a[i];
  }
  var f=1.0/sum;
  for (var i=0;i<size;i++) { a[i]*=f; }
  return a;
}

function padBorderEF(ind,src,borderC,srcHeightC,srcWidthC) {
  var border=borderC.length-1;//GetSpecializedConst(borderC);
  var srcHeight=srcHeightC.length-1;//GetSpecializedConst(srcHeightC);
  var srcWidth=srcWidthC.length-1;//GetSpecializedConst(srcWidthC);
  var y=ind[0];
  var x=ind[1];
  y-=border;
  x-=border;
  if (y<0) { y=0; }
  if (y>=srcHeight) { y=srcHeight-1; }
  if (x<0) { x=0; }
  if (x>=srcWidth) { x=srcWidth-1; }
  return src.get(y,x);
}
function padBorder3DEF(ind,src,borderC,srcHeightC,srcWidthC) {
  var border=borderC.length-1;//GetSpecializedConst(borderC);
  var srcHeight=srcHeightC.length-1;//GetSpecializedConst(srcHeightC);
  var srcWidth=srcWidthC.length-1;//GetSpecializedConst(srcWidthC);
  var y=ind[0];
  var x=ind[1];
  var z=ind[2];
  y-=border;
  x-=border;
  if (y<0) { y=0; }
  if (y>=srcHeight) { y=srcHeight-1; }
  if (x<0) { x=0; }
  if (x>=srcWidth) { x=srcWidth-1; }
  return src.get(y,x,z);
}
//adds border on 4 sides, copies first&last row&col to the border
function padBorder(src,border) {
  var dim=src.getShape();
  var destDim=dim.slice(0);
  destDim[0]+=2*border;
  destDim[1]+=2*border;
  if (dim.length==2) {
    return new ParallelArray(destDim,padBorderEF,src,SpecializeConst(border),SpecializeConst(dim[0]),SpecializeConst(dim[1]));
  } else if (dim.length==3) {
    return new ParallelArray(destDim,padBorder3DEF,src,SpecializeConst(border),SpecializeConst(dim[0]),SpecializeConst(dim[1]));
  } else {
    throw "padBorder can only support 2D and 3D arrays";
  }
}

function padPAEF(ind,src,srcDim,val) {
  var inbound=1;
  for (var d=0;d<ind.length;d++) {
    if (ind[d]>=srcDim[d]) { inbound=0; }
  }
  if (inbound==1) { return src.get(ind); }
  return val;
}
function padPA(src,dim,val) {
  return new ParallelArray(dim,padPAEF,src,src.getShape(),val);
}
