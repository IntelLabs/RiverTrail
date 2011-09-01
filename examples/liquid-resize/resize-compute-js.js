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

function newArray(nrows, ncols) {
    var a = new Array(nrows);
    for (var i = 0; i < nrows; i++) {
        a[i] = new Array(ncols);
    }
    return a;
}

// Find first index of a pixel in the data array

function getPixelIndex(x, y) {return (y*virtualWidth + x)*4;}

function grayScaleJS(buf, context) {
    var buf1 = context.createImageData(buf.width, buf.height);
    var data = buf.data;
    var data1 = buf1.data;

    var i;
    for (i = 0; i < data.length; i+=4) {
        var r = data[i];
        var g = data[i+1];
        var b = data[i+2];
        var lum = (0.299*r + 0.587*g + 0.114*g);
        data1[i] = lum;
        data1[i+1] = lum;
        data1[i+2] = lum;
        data1[i+3] = 255;
    }
    return buf1;
}


// Edge detection; returns data with detected edges

function detectEdgesJS(buf, context) {
    var data = buf.data;
    var buf1 = context.createImageData(buf.width, buf.height);
    var data1 = buf1.data;
    var sobelX =  [[-1.0,  0.0, 1.0],
                    [-2.0, 0.0, 2.0],
                    [-1.0, 0.0, 1.0]];
    var sobelY = [[1.0,  2.0, 1.0],
                    [0.0, 0.0, 0.0],
                    [-1.0, -2.0, -1.0]];

    var imageHeight = buf.height;
    var imageWidth = buf.width;

    for (var y = 0; y < imageHeight; y++) {
        for (var x = 0; x < imageWidth; x++) {
            // process pixel
            var totalX = 0;
            var totalY = 0;
            for (var offY = -1; offY <= 1; offY++) {
                var newY = y + offY;
                for (var offX = -1; offX <= 1; offX++) {
                    var newX = x + offX;
                    if ((newX >= 0) && (newX < imageWidth) 
                        && (newY >= 0) && (newY < imageHeight)) {
                        var pointIndex = (x + offX + (y + offY) * buf.width) * 4;
                        totalX += data[pointIndex] * sobelX[offY+1][offX+1];
                        totalY += data[pointIndex] * sobelY[offY+1][offX+1];
                    }
                }
            }
            var total = Math.floor((Math.abs(totalX) + Math.abs(totalY))/8.0);
            var index = (x + y * buf.width) * 4;
            data1[index] = total;
            data1[index+1] = total;
            data1[index+2] = total;
            data1[index+3] = 255;
        }
    }
    return buf1;
}

var maxEnergy = 0;

// Compute energy and return an array
  
function computeEnergyJS(buf) {
    var imageHeight = buf.height;
    var imageWidth = buf.width;
    var energy = newArray(imageHeight, imageWidth);
    energy[0][0] = 0;
    var data = buf.data;
    for (var y = 0; y < imageHeight; y++) {
        for (var x = 0; x < imageWidth; x++) {
            var e = data[(x + y * buf.width) * 4];

            // find min of energy above
            if (y >= 1) {
                var p = energy[y-1][x];
                if (x > 0 && energy[y - 1][x - 1] < p) {
                    p = energy[y - 1][x - 1];
                }
                if (x < (imageWidth - 1) && energy[y - 1][x + 1] < p) {
                    p = energy[y - 1][x + 1];
                }
                e += p;
            }
            energy[y][x] = e;
            //if (e > maxEnergy)
            //maxEnergy = e;
        }
    }
    return energy;
}

function findPathJS(energy) {
    var imageHeight = energy.length;
    var imageWidth = energy[0].length;
    var path = new Array(imageHeight);
    var y = imageHeight - 1;
    var minPos = 0;
    var minEnergy = energy[y][minPos];

    for (var x = 1; x < imageWidth; x++) {
        if (energy[y][x] < minEnergy) {
            minEnergy = energy[y][x];
            minPos = x;
        }
    }
    path[y] = minPos;
    for (y = imageHeight - 2; y >=0; y--) {
        minEnergy = energy[y][minPos];
        var line = energy[y];
        var p = minPos;
        if (p >= 1 && line[p-1] < minEnergy) {
            minPos = p-1; minEnergy = line[minPos];
        }
        if (p < imageWidth - 1 && line[p+1] < minEnergy) {
            minPos = p+1; minEnergy = line[minPos];
        }
        path[y] = minPos;
    }
    return path;
}


/* cut path from the image data */

function cutPathHorizontallyJS(buf, path) {
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
        data[lastIndex] = data[lastIndex + 1] = data[lastIndex + 2] = 0;  
    }

    return buf;
}

function cutPathVerticallyJS(buf, path) {
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

function transposeJS(buf, context) {
    var buf1 = context.createImageData(buf.height, buf.width);
    var data = buf.data;
    var data1 = buf1.data;
    var ypos = 0;
    for (var y = 0; y < buf.height; y++) {
        for (var x = 0; x < buf.width; x++) {
            data1[x*buf1.width*4 + y*4] = data[y*buf.width*4 + x*4];
            data1[x*buf1.width*4 + y*4 +1] = data[y*buf.width*4 + x*4 +1];
            data1[x*buf1.width*4 + y*4 +2] = data[y*buf.width*4 + x*4 +2];
            data1[x*buf1.width*4 + y*4 +3] = data[y*buf.width*4 + x*4 +3];
        }
        //ypos += buf.width*4;
    }

    return buf1;
}

function reduceOneHorizontalJS(canvas) {
    var context = canvas.getContext("2d");
    var buf = context.getImageData(0, 0, virtualWidth, virtualHeight);
    var t1 = new Date();
    var gray = grayScaleJS(buf, context);
    var edges = detectEdgesJS(gray, context);
    var t2 = new Date();
    parallelComponentTime += (t2 - t1);
    var energy = computeEnergyJS(edges);
    var path = findPathJS(energy);
    var image = cutPathHorizontallyJS(buf, path);
    context.putImageData(image, 0, 0);
}

function reduceOneVerticalJS(canvas) {
    var context = canvas.getContext("2d");
    var buf = context.getImageData(0, 0, virtualWidth, virtualHeight);
    var t1 = new Date();
    var gray = grayScaleJS(transposeJS(buf, context), context);
    var edges = detectEdgesJS(gray, context);
    var t2 = new Date();
    parallelComponentTime += (t2 - t1);
    var energy = computeEnergyJS(edges);
    var path = findPathJS(energy);
    var image = cutPathVerticallyJS(buf, path);
    context.putImageData(image, 0, 0);
}
