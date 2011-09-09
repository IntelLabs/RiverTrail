/*
 * Copyright (c) 2011, Intel Corporation
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice, 
 *   this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice, 
 *   this list of conditions and the following disclaimer in the documentation 
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE 
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF 
 * THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

/**
The algorithm used in this example is based on the following paper, which also appeared in
ACM SIGGRAPH 2007.
Shai Avidan and Ariel Shamir. 2007. Seam carving for content-aware image resizing. 
ACM Trans. Graph. 26, 3, Article 10 (July 2007). 
DOI=10.1145/1276377.1276390 http://doi.acm.org/10.1145/1276377.1276390
**/

//
// global data definitions
//

var sobelX = [[-1.0, 0.0, 1.0],
              [-2.0, 0.0, 2.0],
              [-1.0, 0.0, 1.0]];

var sobelY = [[1.0, 2.0, 1.0],
              [0.0, 0.0, 0.0],
              [-1.0, -2.0, -1.0]];

//
// Kernel functions
//

function grayKernel(idx) {
    var g = 0.299 * this.get(idx).get(0) + 0.587 * this.get(idx).get(1) + 0.114 * this.get(idx).get(2);
    return g;
}

var edgeKernel = function edgeKernel(index, sobelX, sobelY, maxX, maxY) {
    var shape = this.getShape();
    var width = shape[1];
    var height = shape[0];
    var y = index[0];
    var x = index[1];

    var totalX = 0;
    var totalY = 0;

    // we need to hint the compiler that maxX <= width 
    // and maxY <= height, as otherwise the static 
    // bounds check analysis will fail
    if (maxX > width) {
        maxX = width;
    } 
    if (maxY > height) {
        maxY = height;
    }
    for (var offY = -1; offY <= 1; offY++) {
        var newY = y + offY;
        for (var offX = -1; offX <= 1; offX++) {
            var newX = x + offX;
            if (newX >= 0 && newX < maxX && newY >= 0 && newY < maxY) {
                totalX += this.get([newY, newX]) * sobelX[offY + 1][offX + 1];
                totalY += this.get([newY, newX]) * sobelY[offY + 1][offX + 1];
            }
        }
    }
    var total = Math.floor((Math.abs(totalX) + Math.abs(totalY)) / 8.0);
    return total;
}

function energyKernelCombine(idx, prev, maxX) {
    // find minimum above
    var p = prev.get(idx);
    if (idx > 0 && prev.get(idx - 1) < p) {
        p = prev.get(idx - 1);
    }
    if (idx < maxX && prev.get(idx + 1) < p) {
        p = prev.get(idx + 1);
    }

    return this.get(idx) + p;
}

function newArray(nrows, ncols) {
  var a = new Array(nrows);
  for (var i = 0; i < nrows; i++) {
    a[i] = new Array(ncols);
  }
  return a;
}

function computeEnergy(inPA, maxX) {
  var imageHeight = inPA.getShape()[0];
  var imageWidth = inPA.getShape()[1];
  var energy = newArray(imageHeight, imageWidth);
  var data = inPA.getData();
  energy[0][0] = 0;
  for (var y = 0; y < imageHeight; y++) {
    for (var x = 0; x < maxX; x++) {
      var e = data[y*imageWidth + x]; 

      // find min of energy above
      if (y >= 1) {
	var p = energy[y-1][x];
	if (x > 0 && energy[y-1][x-1] < p)
	  p = energy[y-1][x-1];
	if (x < (maxX - 1) && energy[y-1][x+1] < p)
	  p = energy[y-1][x+1];
	e += p;
      }
      energy[y][x] = e;
    }
    //for (var x = maxX; x < imageWidth; x++) {
    //  energy[y][x] = 0;
    //}
  }
  return energy;
}

function findMinIdx(vect, maxX) {
    var result = 0;
    var min = vect[0];
    var minidx = 0;
    for (var pos = 1; pos < maxX; pos++) {
        if (vect[pos] < min) {
            min = vect[pos];
            minidx = pos;
        }
    }
    return minidx;
}

function computePath(array, maxX, maxY) {
    var lineLength = array[0].length;
    var minidx = findMinIdx(array[maxY - 1], maxX);
    var path = new Array(maxY);

    var idx = minidx;
    for (var pos = maxY - 2; pos >= 0; pos--) {
        var min = idx;
        var line = array[pos];
        var val = line[idx];
        if (idx > 0 && line[idx - 1] < val) {
            min = idx - 1;
            val = line[idx - 1];
        }
        if (idx < (maxX - 1) && line[idx + 1] < val) {
            min = idx + 1;
            //val = line.get(idx + 1);
        }
        path[pos] = min;
        idx = min;
    }
    return path;
}

function grayscaleCore(inPA) {
    return inPA.combineSeq(2, grayKernel);
}

function grayscaleCoreOCL(inPA) {
    return inPA.combine(2, grayKernel);
}

// Takes a single pixel PA and returns a single Pixel PA - ie a 2D array with a single data point per pixel.
function edgesCore(singlePixelPA, maxX, maxY) {
    var edgePA = singlePixelPA.combineSeq(2, edgeKernel, sobelX, sobelY, maxX, maxY);
    return edgePA;
}
function edgesCoreOCL(singlePixelPA, maxX, maxY) {
    var edgePA = singlePixelPA.combine(2, edgeKernel, sobelX, sobelY, maxX, maxY);
    return edgePA;
}

// Takes a singlePixelPA and returns a singelPixelPA
function energyCore(singlePixelPA, maxX) {
    var energyPA = singlePixelPA.scan(function (prev, innerMaxX) { return this.combineSeq(energyKernelCombine, prev, innerMaxX); }, maxX);
    return energyPA;
}

var dropHorizontalKernel = function dropHorizontalKernel(dropIdx, pathPA) {
    var idx_0 = dropIdx[0];
    var idx_1 = dropIdx[1];
    var length = this.getShape()[1];
    var drop = pathPA.get(idx_0);
    if (idx_1 < drop) {
        //return this.get(dropIdx); this line does not work due to an address space clash
        return [this.get(idx_0, idx_1, 0), this.get(idx_0, idx_1, 1), this.get(idx_0, idx_1, 2), this.get(idx_0, idx_1, 3)];
    } else if (idx_1 === length - 1) {
        return [0, 0, 0, 255];
    } else {
        //return this.get([idx_0, idx_1+1]);
        return [this.get(idx_0, idx_1 + 1, 0), this.get(idx_0, idx_1 + 1, 1), this.get(idx_0, idx_1 + 1, 2), this.get(idx_0, idx_1 + 1, 3)];
    }
}

var dropVerticalKernel = function dropVerticalKernel(dropIdx, pathPA) {
    var idx_0 = dropIdx[0];
    var idx_1 = dropIdx[1];
    var length = this.getShape()[0];
    var drop = pathPA.get(idx_1);
    if (idx_0 < drop) {
        //return this.get(dropIdx); this line does not work due to an address space clash
        return [this.get(idx_0, idx_1, 0), this.get(idx_0, idx_1, 1), this.get(idx_0, idx_1, 2), this.get(idx_0, idx_1, 3)];
    } else if (idx_0 === length - 1) {
        return [0, 0, 0, 255];
    } else {
        //return this.get([idx_0+1, idx_1]);
        return [this.get(idx_0 + 1, idx_1, 0), this.get(idx_0 + 1, idx_1, 1), this.get(idx_0 + 1, idx_1, 2), this.get(idx_0 + 1, idx_1, 3)];
    }
}


/* cut path from the image data */

function cutPathHorizontally(buf, path) {
  var imageHeight = buf.height;
  var imageWidth = buf.width;
  var data = buf.data;
  var y;
  for (y = 0; y < imageHeight; y++) { // for all rows
    var cutX = path[y];
    var blendX = (cutX == 0 ? cutX + 1 : cutX - 1);
    var cutIndex = (cutX + y * buf.width) * 4; // getPixelIndex(cutX, y);
    var blendIndex = (blendX + y * buf.width) * 4; //getPixelIndex(blendX, y);
    data[cutIndex] = (data[cutIndex] + data[blendIndex])/2;
    data[cutIndex+1] = (data[cutIndex+1] + data[blendIndex+1])/2;
    data[cutIndex+2] = (data[cutIndex+2] + data[blendIndex+2])/2;
    
    var lastIndex = (imageWidth - 2 + y * buf.width) * 4; // getPixelIndex(imageWidth - 2, y);

    for (var i = cutIndex + 4; i < lastIndex; i += 4) {
      data[i] = data[i+4];
      data[i+1] = data[i+5];
      data[i+2] = data[i+6];
    }
    
    lastIndex += 4; // last pixel in a row
    data[lastIndex] = data[lastIndex+1] = data[lastIndex + 2] = 0;
  }

  return buf;
}

function cutPathVertically(buf, path) {
  var imageHeight = buf.height;
  var imageWidth = buf.width;
  var rowStride = imageWidth * 4;
  var data = buf.data;
  var x;
  for (x = 0; x < imageWidth; x++) { // for all cols
    var cutY = path[x];
    var blendY = (cutY == 0 ? cutY + 1 : cutY - 1);
    var cutIndex = (x + cutY * buf.width) * 4; //getPixelIndex(x, cutY);
    var blendIndex = (x + blendY * buf.width) * 4; //getPixelIndex(x, blendY);
    data[cutIndex] = (data[cutIndex] + data[blendIndex])/2;
    data[cutIndex+1] = (data[cutIndex+1] + data[blendIndex+1])/2;
    data[cutIndex+2] = (data[cutIndex+2] + data[blendIndex+2])/2;
    
    var lastIndex = (x + (imageHeight - 2) * buf.width) * 4; //getPixelIndex(x, imageHeight - 2);

    for (var i = cutIndex + rowStride; i < lastIndex; i += rowStride) {
      data[i] = data[i+rowStride];
      data[i+1] = data[i+rowStride+1];
      data[i+2] = data[i+rowStride+2];
    }
    
    lastIndex += rowStride; // last pixel in a column
    data[lastIndex] = data[lastIndex+1] = data[lastIndex + 2] = 0;
  }

  return buf;
}

var buildOneElement = function buildOneElement(idx, aPA) { 
    return [aPA.get(idx[1], idx[0], 0),
            aPA.get(idx[1], idx[0], 1),
            aPA.get(idx[1], idx[0], 2),
            aPA.get(idx[1], idx[0], 3)]; 
}

function transpose(aPA) {
    return new ParallelArray([aPA.getShape()[1], aPA.getShape()[0]], buildOneElement, aPA);
}  

function reduceOneHorizontal(canvas) {
    var inPA = new ParallelArray(canvas);
    var t1 = new Date();
    var grayPA = inPA.combine(2, low_precision(grayKernel));
    var edgePA = grayPA.combine(2, low_precision(edgeKernel), sobelX, sobelY, virtualWidth, virtualHeight);
    var t2 = new Date();
    parallelComponentTime += (t2 - t1);
    var energy = computeEnergy(edgePA, virtualWidth);
    var path = computePath(energy, virtualWidth, virtualHeight);
    var context = canvas.getContext("2d");
    var buf = context.getImageData(0,0,virtualWidth,virtualHeight);
    var res = cutPathHorizontally(buf, path);
    context.putImageData(res, 0, 0);
}

function reduceOneVertical(canvas) {
    var inPA = new ParallelArray(canvas);
    var t1 = new Date();
    var inPAT = transpose(inPA);
    var grayPA = inPAT.combine(2, low_precision(grayKernel));
    var edgePA = grayPA.combine(2, low_precision(edgeKernel), sobelX, sobelY, virtualHeight, virtualWidth);
    var t2 = new Date();
    parallelComponentTime += (t2 - t1);
    var energy = computeEnergy(edgePA, virtualHeight);
    var path = computePath(energy, virtualHeight, virtualWidth);
    var context = canvas.getContext("2d");
    var buf = context.getImageData(0,0,virtualWidth,virtualHeight);
    var res = cutPathVertically(buf, path);
    context.putImageData(res, 0, 0);
}
