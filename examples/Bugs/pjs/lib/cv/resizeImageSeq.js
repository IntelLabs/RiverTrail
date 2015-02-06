function resizeImageSeq(src,dest) {
  if (src.width*src.height!=src.data.length||dest.width*dest.height!=dest.data.length) throw "only 2D grayscale images are currently supported";
  var xStep=src.width/dest.width;
  var yStep=src.height/dest.height;
  var numPix=xStep*yStep;
  if (xStep%1!=0||yStep%1!=0) throw "interpolation not implemented, can only resize to smaller size that is 1/int of the original";
  for (var yd=0;yd<dest.height;yd++) {
    for (var xd=0;xd<dest.width;xd++) {
      var yStart=yd*yStep;
      var xStart=xd*xStep;
      var total=0;
      for (var y=yStart;y<yStart+yStep;y++) {
        for (var x=xStart;x<xStart+xStep;x++) {
          total+=src.data[y*src.width+x];
        }
      }
      dest.data[yd*dest.width+xd]=total/numPix;
    }
  }
}

function grayscaleResizeImageSeq2(src,dest) {
  if (src.width*src.height*4!=src.data.length||dest.width*dest.height!=dest.data.length) throw "src must be RGBA, dest must be 2D grayscale";
  var xStep=src.width/dest.width;
  var yStep=src.height/dest.height;
  var numPix=xStep*yStep;
  if (xStep%1!=0||yStep%1!=0) throw "interpolation not implemented, can only resize to smaller size that is 1/int of the original";
  for (var yd=0;yd<dest.height;yd++) {
    for (var xd=0;xd<dest.width;xd++) {
      var yStart=yd*yStep;
      var xStart=xd*xStep;
      var total=0;
      for (var y=yStart;y<yStart+yStep;y++) {
        for (var x=xStart;x<xStart+xStep;x++) {
          total+=0.299*src.data[(y*src.width+x)*src.depth]+0.587*src.data[(y*src.width+x)*src.depth+1]+0.114*src.data[(y*src.width+x)*src.depth+2];
        }
      }
      dest.data[yd*dest.width+xd]=total/numPix;
    }
  }
}

function grayscaleResizeMultImageSeq(src,dest,multFactor) {
	  if (src.width*src.height*4!=src.data.length||dest.width*dest.height!=dest.data.length) throw "src must be RGBA, dest must be 2D grayscale";
	  var xStep=src.width/dest.width;
	  var yStep=src.height/dest.height;
	  var numPix=xStep*yStep;
	  if (xStep%1!=0||yStep%1!=0) throw "interpolation not implemented, can only resize to smaller size that is 1/int of the original";
	  for (var yd=0;yd<dest.height;yd++) {
	    for (var xd=0;xd<dest.width;xd++) {
	      var yStart=yd*yStep;
	      var xStart=xd*xStep;
	      var total=0;
	      for (var y=yStart;y<yStart+yStep;y++) {
	        for (var x=xStart;x<xStart+xStep;x++) {
	          total+=0.299*src.data[(y*src.width+x)*src.depth]+0.587*src.data[(y*src.width+x)*src.depth+1]+0.114*src.data[(y*src.width+x)*src.depth+2];
	        }
	      }
	      dest.data[yd*dest.width+xd]=multFactor*total/numPix;
	    }
	  }
	}
