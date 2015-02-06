function resizeFastEF(ind,src,yStepC,xStepC) {
  var yStep=yStepC.length-1;//GetSpecializedConst(yStepC);
  var xStep=xStepC.length-1;//GetSpecializedConst(xStepC);
  var yStart=ind[0]*yStep;
  var xStart=ind[1]*xStep;
  var numPix=xStep*yStep;
  var total=0;
  for (var yOffset=0;yOffset<yStep;yOffset++) {
    for (var xOffset=0;xOffset<xStep;xOffset++) {
      total+=src.get(yStart+yOffset,xStart+xOffset);
    }
  }
  return total/numPix;
}
function resizeImage(img,size) {
  var dim=img.getShape();
  if (dim.length!=2) throw "only 2D grayscale images are currently supported";
  if (size.length!=2) throw "destination size must be 2D";
  var step=[dim[0]/size[0],dim[1]/size[1]];
  if (step[0]%1!=0||step[1]%1!=0) throw "interpolation not implemented, can only resize to smaller size that is 1/int of the original";
  return new ParallelArray(size,resizeFastEF,img,SpecializeConst(step[0]),SpecializeConst(step[1]));
}

function grayscaleResizeFast4EF1(ind,src) {
  var yStep=4;//yStepC.length-1;//GetSpecializedConst(yStepC);
  var xStep=4;//xStepC.length-1;//GetSpecializedConst(xStepC);
  var yStart=ind[0]*yStep;
  var xStart=ind[1]*xStep;
  var total=0;
  for (var yOffset=0;yOffset<yStep;yOffset++) {
    for (var xOffset=0;xOffset<xStep;xOffset++) {
      var v=src.get(yStart+yOffset,xStart+xOffset);
      total+=0.299/16*v.get(0)+0.587/16*v.get(1)+0.114/16*v.get(1);
    }
  }
  return total;
}

function grayscaleResizeImage1(img,size) {
  var dim=img.getShape();
  if (dim.length!=3) throw "only 3D RGBA images are currently supported";
  if (size.length!=2) throw "destination size must be 2D";
  var step=[dim[0]/size[0],dim[1]/size[1]];
  if (step[0]%1!=0||step[1]%1!=0) throw "interpolation not implemented, can only resize to smaller size that is 1/int of the original";
  if (step[0]!=4||step[1]!=4) throw "only 1/4 size on x,y allowed for now";
  return new ParallelArray(size,grayscaleResizeFast4EF1,img);
}

function grayscaleResizeFastEF2(ind,src,yStepC,xStepC) {
  var yStep=yStepC.length-1;//GetSpecializedConst(yStepC);
  var xStep=xStepC.length-1;//GetSpecializedConst(xStepC);
  var yStart=ind[0]*yStep;
  var xStart=ind[1]*xStep;
  var numPix=xStep*yStep;
  var total=0;
  for (var yOffset=0;yOffset<yStep;yOffset++) {
    for (var xOffset=0;xOffset<xStep;xOffset++) {
      var v=src.get(yStart+yOffset,xStart+xOffset);
      total+=0.299/numPix*v.get(0)+0.587/numPix*v.get(1)+0.114/numPix*v.get(1);
    }
  }
  return total;
}

function grayscaleResizeImage2(img,size) {
  var dim=img.getShape();
  if (dim.length!=3) throw "only 3D RGBA images are currently supported";
  if (size.length!=2) throw "destination size must be 2D";
  var step=[dim[0]/size[0],dim[1]/size[1]];
  if (step[0]%1!=0||step[1]%1!=0) throw "interpolation not implemented, can only resize to smaller size that is 1/int of the original";
  return new ParallelArray(size,grayscaleResizeFastEF2,img,SpecializeConst(step[0]),SpecializeConst(step[1]));
}

//v should be scaled by 1/(yStep*xStep)
function dotResizeFastEF(ind,src,yStepC,xStepC,v) {
  var yStep=yStepC.length-1;//GetSpecializedConst(yStepC);
  var xStep=xStepC.length-1;//GetSpecializedConst(xStepC);
  var yStart=ind[0]*yStep;
  var xStart=ind[1]*xStep;
  var total=0;
  for (var yOffset=0;yOffset<yStep;yOffset++) {
    for (var xOffset=0;xOffset<xStep;xOffset++) {
      var c=src.get(yStart+yOffset,xStart+xOffset);
      for (var i=0;i<v.length;i++) {
        total+=v[i]*c.get(i);
      }
    }
  }
  return total;
}

function grayscaleResizeImage3(img,size) {
  var dim=img.getShape();
  if (dim.length!=3) throw "only 3D RGBA images are currently supported";
  if (size.length!=2) throw "destination size must be 2D";
  var step=[dim[0]/size[0],dim[1]/size[1]];
  if (step[0]%1!=0||step[1]%1!=0) throw "interpolation not implemented, can only resize to smaller size that is 1/int of the original";
  //if (step[0]!=4||step[1]!=4) throw "only 1/4 size on x,y allowed for now";
  var scale=1/(step[0]*step[1]);
  var v=[0.299*scale,0.587*scale,0.114*scale];
  return new ParallelArray(size,dotResizeFastEF,img,SpecializeConst(step[0]),SpecializeConst(step[1]),v);
}

function grayscaleResizeMultImage(img,size,multFactor) {
  var dim=img.getShape();
  var dim=img.getShape();
  if (dim.length!=3) throw "only 3D RGBA images are currently supported";
  if (size.length!=2) throw "destination size must be 2D";
  var step=[dim[0]/size[0],dim[1]/size[1]];
  if (step[0]%1!=0||step[1]%1!=0) throw "interpolation not implemented, can only resize to smaller size that is 1/int of the original";
  //if (step[0]!=4||step[1]!=4) throw "only 1/4 size on x,y allowed for now";
  var scale=multFactor/(step[0]*step[1]);
  var v=[0.299*scale,0.587*scale,0.114*scale];
  return new ParallelArray(size,dotResizeFastEF,img,SpecializeConst(step[0]),SpecializeConst(step[1]),v);
}
