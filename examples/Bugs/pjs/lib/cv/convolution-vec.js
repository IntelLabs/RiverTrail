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

function horizontalFilter3DEF31(ind,src,k) {
  var y=ind[0];
  var x=ind[1];
  var z=ind[2];
  var r=src.get(y,x,z)*1.5839807750606872e-12;
  r+=src.get(y,x+1,z)*4.243285803501448e-11;
  r+=src.get(y,x+2,z)*9.060980340734575e-10;
  r+=src.get(y,x+3,z)*1.5422991440639634e-8;
  r+=src.get(y,x+4,z)*2.0925824209396728e-7;
  r+=src.get(y,x+5,z)*0.0000022631693526308854;
  r+=src.get(y,x+6,z)*0.000019510664444021286;
  r+=src.get(y,x+7,z)*0.00013407493396766756;
  r+=src.get(y,x+8,z)*0.0007344185696625024;
  r+=src.get(y,x+9,z)*0.003206714035824234;
  r+=src.get(y,x+10,z)*0.01116085180738214;
  r+=src.get(y,x+11,z)*0.030963851521461687;
  r+=src.get(y,x+12,z)*0.0684751727375629;
  r+=src.get(y,x+13,z)*0.1207068238123676;
  r+=src.get(y,x+14,z)*0.1696098358781806;
  r+=src.get(y,x+15,z)*0.189972514476891;
  r+=src.get(y,x+16,z)*0.1696098358781806;
  r+=src.get(y,x+17,z)*0.1207068238123676;
  r+=src.get(y,x+18,z)*0.0684751727375629;
  r+=src.get(y,x+19,z)*0.030963851521461687;
  r+=src.get(y,x+20,z)*0.01116085180738214;
  r+=src.get(y,x+21,z)*0.003206714035824234;
  r+=src.get(y,x+22,z)*0.0007344185696625024;
  r+=src.get(y,x+23,z)*0.00013407493396766756;
  r+=src.get(y,x+24,z)*0.000019510664444021286;
  r+=src.get(y,x+25,z)*0.0000022631693526308854;
  r+=src.get(y,x+26,z)*2.0925824209396728e-7;
  r+=src.get(y,x+27,z)*1.5422991440639634e-8;
  r+=src.get(y,x+28,z)*9.060980340734575e-10;
  r+=src.get(y,x+29,z)*4.243285803501448e-11;
  r+=src.get(y,x+30,z)*1.5839807750606872e-12;
  return r;
}

function horizontalFilter3DEF31_orig(ind,src,k) {
  var y=ind[0];
  var x=ind[1];
  var z=ind[2];
  var r=src.get(y,x,z)*k[0];
  r+=src.get(y,x+1,z)*k[1];
  r+=src.get(y,x+2,z)*k[2];
  r+=src.get(y,x+3,z)*k[3];
  r+=src.get(y,x+4,z)*k[4];
  r+=src.get(y,x+5,z)*k[5];
  r+=src.get(y,x+6,z)*k[6];
  r+=src.get(y,x+7,z)*k[7];
  r+=src.get(y,x+8,z)*k[8];
  r+=src.get(y,x+9,z)*k[9];
  r+=src.get(y,x+10,z)*k[10];
  r+=src.get(y,x+11,z)*k[11];
  r+=src.get(y,x+12,z)*k[12];
  r+=src.get(y,x+13,z)*k[13];
  r+=src.get(y,x+14,z)*k[14];
  r+=src.get(y,x+15,z)*k[15];
  r+=src.get(y,x+16,z)*k[16];
  r+=src.get(y,x+17,z)*k[17];
  r+=src.get(y,x+18,z)*k[18];
  r+=src.get(y,x+19,z)*k[19];
  r+=src.get(y,x+20,z)*k[20];
  r+=src.get(y,x+21,z)*k[21];
  r+=src.get(y,x+22,z)*k[22];
  r+=src.get(y,x+23,z)*k[23];
  r+=src.get(y,x+24,z)*k[24];
  r+=src.get(y,x+25,z)*k[25];
  r+=src.get(y,x+26,z)*k[26];
  r+=src.get(y,x+27,z)*k[27];
  r+=src.get(y,x+28,z)*k[28];
  r+=src.get(y,x+29,z)*k[29];
  r+=src.get(y,x+30,z)*k[30];
  return r;
}
function horizontalFilter(src,k) {
  var dim=src.getShape();
  var destDim=dim.slice(0);
  destDim[1]-=k.length-1;
  if (dim.length==2) {
    return new ParallelArray(destDim,horizontalFilterEF,src,k);
  } else if (dim.length==3) {
    if (k.length==31) {
      return new ParallelArray(destDim,horizontalFilter3DEF31,src,k);
    } else {
      return new ParallelArray(destDim,horizontalFilter3DEF,src,k);
    }
  } else {
    throw "horizontalFilter can only support 2D and 3D arrays";
  }
}

function verticalFilterEF_0(ind, src) {
  var y=ind[0];
  var x=ind[1];
  var r=0;
  r += src.get(y, x)*5.64693182241172e-05;
  r += src.get(y+1, x)*0.00128523574676365;
  r += src.get(y+2, x)*0.0146069535985589;
  r += src.get(y+3, x)*0.0828978195786476;
  r += src.get(y+4, x)*0.234927147626877;
  r += src.get(y+5, x)*0.332452744245529;
  r += src.get(y+6, x)*0.234927147626877;
  r += src.get(y+7, x)*0.0828978195786476;
  r += src.get(y+8, x)*0.0146069535985589;
  r += src.get(y+9, x)*0.00128523574676365;
  r += src.get(y+10, x)*5.64693182241172e-05;
  return r;
}
function verticalFilterEF_1(ind, src) {
  var y=ind[0];
  var x=ind[1];
  var r=0;
  r += src.get(y, x)*-0.000282346591120586;
  r += src.get(y+1, x)*-0.00514094298705459;
  r += src.get(y+2, x)*-0.0438208617269993;
  r += src.get(y+3, x)*-0.165795639157295;
  r += src.get(y+4, x)*-0.234927147626877;
  //r += src.get(y+5, x)*0;
  r += src.get(y+6, x)*0.234927147626877;
  r += src.get(y+7, x)*0.165795639157295;
  r += src.get(y+8, x)*0.0438208617269993;
  r += src.get(y+9, x)*0.00514094298705459;
  r += src.get(y+10, x)*0.000282346591120586;
  return r;
}

function verticalFilterEF_2(ind, src) {
  var y=ind[0];
  var x=ind[1];
  var r=0;
  r += src.get(y, x)*0.00141173298470676;
  r += src.get(y+1, x)*0.0205637719482183;
  r += src.get(y+2, x)*0.131462588906288;
  r += src.get(y+3, x)*0.33159127831459;
  r += src.get(y+4, x)*0.234927147626877;
  //r += src.get(y+5, x)*0;
  r += src.get(y+6, x)*0.234927147626877;
  r += src.get(y+7, x)*0.33159127831459;
  r += src.get(y+8, x)*0.131462588906288;
  r += src.get(y+9, x)*0.0205637719482183;
  r += src.get(y+10, x)*0.00141173298470676;
  return r;
}
function verticalFilterEF_unrolled(ind,src,k) {
  var y=ind[0];
  var x=ind[1];
  var r=0;
  r += src.get(y, x)*k[0];
  r += src.get(y+1, x)*k[1];
  r += src.get(y+2, x)*k[2];
  r += src.get(y+3, x)*k[3];
  r += src.get(y+4, x)*k[4];
  r += src.get(y+5, x)*k[5];
  r += src.get(y+6, x)*k[6];
  r += src.get(y+7, x)*k[7];
  r += src.get(y+8, x)*k[8];
  r += src.get(y+9, x)*k[9];
  r += src.get(y+10, x)*k[10];
  return r;

}
function verticalFilterEF_orig(ind,src,k) {
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

function verticalFilter3DEF31(ind,src,k) {
  var y=ind[0];
  var x=ind[1];
  var z=ind[2];
  var r=src.get(y,x,z)*1.5839807750606872e-12;
  r+=src.get(y+1,x,z)*4.243285803501448e-11;
  r+=src.get(y+2,x,z)*9.060980340734575e-10;
  r+=src.get(y+3,x,z)*1.5422991440639634e-8;
  r+=src.get(y+4,x,z)*2.0925824209396728e-7;
  r+=src.get(y+5,x,z)*0.0000022631693526308854;
  r+=src.get(y+6,x,z)*0.000019510664444021286;
  r+=src.get(y+7,x,z)*0.00013407493396766756;
  r+=src.get(y+8,x,z)*0.0007344185696625024;
  r+=src.get(y+9,x,z)*0.003206714035824234;
  r+=src.get(y+10,x,z)*0.01116085180738214;
  r+=src.get(y+11,x,z)*0.030963851521461687;
  r+=src.get(y+12,x,z)*0.0684751727375629;
  r+=src.get(y+13,x,z)*0.1207068238123676;
  r+=src.get(y+14,x,z)*0.1696098358781806;
  r+=src.get(y+15,x,z)*0.189972514476891;
  r+=src.get(y+16,x,z)*0.1696098358781806;
  r+=src.get(y+17,x,z)*0.1207068238123676;
  r+=src.get(y+18,x,z)*0.0684751727375629;
  r+=src.get(y+19,x,z)*0.030963851521461687;
  r+=src.get(y+20,x,z)*0.01116085180738214;
  r+=src.get(y+21,x,z)*0.003206714035824234;
  r+=src.get(y+22,x,z)*0.0007344185696625024;
  r+=src.get(y+23,x,z)*0.00013407493396766756;
  r+=src.get(y+24,x,z)*0.000019510664444021286;
  r+=src.get(y+25,x,z)*0.0000022631693526308854;
  r+=src.get(y+26,x,z)*2.0925824209396728e-7;
  r+=src.get(y+27,x,z)*1.5422991440639634e-8;
  r+=src.get(y+28,x,z)*9.060980340734575e-10;
  r+=src.get(y+29,x,z)*4.243285803501448e-11;
  r+=src.get(y+30,x,z)*1.5839807750606872e-12;
  return r;
}

function verticalFilter3DEF31_orig(ind,src,k) {
  var y=ind[0];
  var x=ind[1];
  var z=ind[2];
  var r=src.get(y,x,z)*k[0];
  r+=src.get(y+1,x,z)*k[1];
  r+=src.get(y+2,x,z)*k[2];
  r+=src.get(y+3,x,z)*k[3];
  r+=src.get(y+4,x,z)*k[4];
  r+=src.get(y+5,x,z)*k[5];
  r+=src.get(y+6,x,z)*k[6];
  r+=src.get(y+7,x,z)*k[7];
  r+=src.get(y+8,x,z)*k[8];
  r+=src.get(y+9,x,z)*k[9];
  r+=src.get(y+10,x,z)*k[10];
  r+=src.get(y+11,x,z)*k[11];
  r+=src.get(y+12,x,z)*k[12];
  r+=src.get(y+13,x,z)*k[13];
  r+=src.get(y+14,x,z)*k[14];
  r+=src.get(y+15,x,z)*k[15];
  r+=src.get(y+16,x,z)*k[16];
  r+=src.get(y+17,x,z)*k[17];
  r+=src.get(y+18,x,z)*k[18];
  r+=src.get(y+19,x,z)*k[19];
  r+=src.get(y+20,x,z)*k[20];
  r+=src.get(y+21,x,z)*k[21];
  r+=src.get(y+22,x,z)*k[22];
  r+=src.get(y+23,x,z)*k[23];
  r+=src.get(y+24,x,z)*k[24];
  r+=src.get(y+25,x,z)*k[25];
  r+=src.get(y+26,x,z)*k[26];
  r+=src.get(y+27,x,z)*k[27];
  r+=src.get(y+28,x,z)*k[28];
  r+=src.get(y+29,x,z)*k[29];
  r+=src.get(y+30,x,z)*k[30];
  return r;
}

function verticalFilter(src,k, type_id) {
  var dim=src.getShape();
  var destDim=dim.slice(0);
  destDim[0]-=k.length-1;
  if (dim.length==2) {
      if(type_id === 0) {
        return new ParallelArray(destDim,verticalFilterEF_0,src);
      }
      else if(type_id === 1) {
        return new ParallelArray(destDim,verticalFilterEF_1,src);
      }
      else if(type_id === 2) {
        return new ParallelArray(destDim,verticalFilterEF_2,src);
      }
      else { // unknown type_id, just use the default elemental fn.
        return new ParallelArray(destDim,verticalFilterEF_orig,src, k);
      }
  } else if (dim.length==3) {
    if (k.length==31) {
      if(k[6] !== 0.000019510664444021286) {
        alert("Found unexpected coefficient!!");
      }
      return new ParallelArray(destDim,verticalFilter3DEF31,src,k);
    } else {
      return new ParallelArray(destDim,verticalFilter3DEF,src,k);
    }
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
