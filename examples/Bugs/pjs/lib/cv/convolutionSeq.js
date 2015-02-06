function horizontalFilter2DInnerSeq(src,k,dest) {
  var w=src.width-k.length+1;
  if (dest.width!=w) throw "horizontalFilterInnerSeq: dest must have width of src-k+1";
  if (dest.height!=src.height) throw "horizontalFilterInnerSeq: dest must have height of src";
  for (var yd=0;yd<dest.height;yd++) {
    for (var xd=0;xd<dest.width;xd++) {
      var r=0;
      for (var i=0;i<k.length;i++) {
        r+=src.data[yd*src.width+xd+i]*k[i];
      }
      dest.data[yd*dest.width+xd]=r;
    }
  }
}
function horizontalFilter3DInnerSeq(src,k,dest) {
  var w=src.width-k.length+1;
  if (dest.width!=w) throw "horizontalFilterInnerSeq: dest must have width of src-k+1";
  if (dest.height!=src.height) throw "horizontalFilterInnerSeq: dest must have height of src";
  if (dest.depth!=src.depth) throw "horizontalFilterInnerSeq: dest must have depth of src";
  for (var yd=0;yd<dest.height;yd++) {
    for (var xd=0;xd<dest.width;xd++) {
      for (var d=0;d<dest.depth;d++) {
        var r=0;
        for (var i=0;i<k.length;i++) {
          r+=src.data[(yd*src.width+xd+i)*src.depth+d]*k[i];
        }
        dest.data[(yd*dest.width+xd)*dest.depth+d]=r;
      }
    }
  }
}
function verticalFilter2DInnerSeq(src,k,dest) {
  var h=src.height-k.length+1;
  if (dest.height!=h) throw "verticalFilterInnerSeq: dest must have height of src-k+1";
  if (dest.width!=src.width) throw "verticalFilterInnerSeq: dest must have width of src";
  for (var yd=0;yd<dest.height;yd++) {
    for (var xd=0;xd<dest.width;xd++) {
      var r=0;
      for (var i=0;i<k.length;i++) {
        r+=src.data[(yd+i)*src.width+xd]*k[i];
      }
      dest.data[yd*dest.width+xd]=r;
    }
  }
}
function verticalFilter3DInnerSeq(src,k,dest) {
  var h=src.height-k.length+1;
  if (dest.height!=h) throw "verticalFilterInnerSeq: dest must have height of src-k+1";
  if (dest.width!=src.width) throw "verticalFilterInnerSeq: dest must have width of src";
  if (dest.depth!=src.depth) throw "verticalFilterInnerSeq: dest must have depth of src";
  for (var yd=0;yd<dest.height;yd++) {
    for (var xd=0;xd<dest.width;xd++) {
      for (var d=0;d<dest.depth;d++) {
        var r=0;
        for (var i=0;i<k.length;i++) {
          r+=src.data[((yd+i)*src.width+xd)*src.depth+d]*k[i];
        }
        dest.data[(yd*dest.width+xd)*dest.depth+d]=r;
      }
    }
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

function padBorder2DSeq(src,dest) {
  var border=(dest.width-src.width)/2;
  if (border%1!=0) throw "padBorder: dest must be 2*i wider than src";
  if (border!=(dest.height-src.height)/2) throw "padBorder: border must be uniform on all sides";
  if (dest.data.length!=dest.width*dest.height||src.data.length!=src.width*src.height) throw "padBorder: dest and src must be 2D";
  for (var yd=0;yd<dest.height;yd++) {
    var ys=yd-border;
    if (ys<0) ys=0;
    if (ys>=src.height) ys=src.height-1;
    for (var xd=0;xd<dest.width;xd++) {
      var xs=xd-border;
      if (xs<0) xs=0;
      if (xs>=src.width) xs=src.width-1;
      dest.data[yd*dest.width+xd]=src.data[ys*src.width+xs];
    }
  }
}

function padBorder3DSeq(src,dest) {
  var border=(dest.width-src.width)/2;
  if (border%1!=0) throw "padBorder: dest must be 2*i wider than src";
  if (border!=(dest.height-src.height)/2) throw "padBorder: border must be uniform on all sides";
  if (dest.depth!=src.depth) throw "padBorder: dest must have same depth as src";
  for (var yd=0;yd<dest.height;yd++) {
    var ys=yd-border;
    if (ys<0) ys=0;
    if (ys>=src.height) ys=src.height-1;
    for (var xd=0;xd<dest.width;xd++) {
      var xs=xd-border;
      if (xs<0) xs=0;
      if (xs>=src.width) xs=src.width-1;
      for (var d=0;d<dest.depth;d++) {
        dest.data[(yd*dest.width+xd)*dest.depth+d]=src.data[(ys*src.width+xs)*src.depth+d];
      }
    }
  }
}
