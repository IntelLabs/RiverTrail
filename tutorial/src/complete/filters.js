/************************************
 Copyright (c) 2012, Intel Corporation
 All rights reserved.
 
 Redistribution and use in source and binary forms, with or without 
 modification, are permitted provided that the following conditions are met:

 - Redistributions of source code must retain the above copyright notice, 
   this list of conditions and the following disclaimer.
 - Redistributions in binary form must reproduce the above copyright notice, 
   this list of conditions and the following disclaimer in the documentation 
   and/or other materials provided with the distribution.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE 
 LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
 CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
 SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
 INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
 ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF 
 THE POSSIBILITY OF SUCH DAMAGE.
************************************/

/*
 * filters.js: Implementations of various filters.
 * @author: Jaswanth Sreeram
 */

function blend(a, b) {
        var val =  255 - (((255 - a) * (255 - b)) >> 8);
        return val;
}
function dubois_blend_right(r, g, b) {
        /* For green magenta anaglyph, use the following coefficients*/
        //var mr = [0.529, -0.016, 0.009, 0.705, -0.015, 0.075, 0.024, -0.065, 0.937];
        var mr = [-0.011,  0.377, -0.026, -0.032,  0.761, -0.093, -0.007,  0.009,  1.234];
        var ret = [0,0,0];
        ret[0] = mr[0] * r + mr[3] * g + mr[6] * b;
        ret[1] = mr[1] * r + mr[4] * g + mr[7] * b;
        ret[2] = mr[2] * r + mr[5] * g + mr[8] * b;
        return ret;
}
function dubois_blend_left(r, g, b) {
        /* For green magenta anaglyph, use the following coefficients*/
        //var ml = [-0.062, 0.284, -0.015, -0.158, 0.668, -0.027, -0.039, 0.143, 0.021];
        var ml = [0.437, -0.062, -0.048, 0.449, -0.062, -0.050, 0.164, -0.024, -0.017];
        var ret = [0,0,0];
        ret[0] = ml[0] * r + ml[3] * g + ml[6] * b;
        ret[1] = ml[1] * r + ml[4] * g + ml[7] * b;
        ret[2] = ml[2] * r + ml[5] * g + ml[8] * b;
        return ret;
}
function isSkin(r, g, b) {
    var sum = (r + g + b);
    var oor = r/sum;
    var oog = g/sum;
    var oob = b/sum;
    if(oob > 0.3) return 0;
    var f1r = -1.376*oor*oor + 1.0743*oor + 0.2;
    var f2r = -0.776*oor*oor + 0.5601*oor + 0.18;
    var white = (oor-0.33)*(oor-0.33) + (oog - 0.33)*(oog-0.33);
    var theta_nu = 0.5*((r-g)+(r-b));
    var theta_de = Math.sqrt((r-g)*(r-g) + (r-b)*(g-b));
    var theta = Math.acos(theta_nu/theta_de);
    var h = 0;
    if(b <=g) {
        h = theta;
    }
    else {
        h = 360-theta;
    }
    if((oog < f1r) && (oog > f2r) && (white > 0.001) && (h > 240 || h <=20)) { 
        return 1;
    }
    return 0;
}

function isSkinYCrCb(xr, xg, xb) {
    var sum = (xr + xg + xb);
    var r = xr/sum;
    var g = xg/sum;
    var b = xb/sum;

    var y = 0.299 * r + 0.587 * g + 0.114 * b;
    var cb = -0.168736 * r + -0.331264 * g + 0.5 * b;
    var cr = 0.5 * r + -0.418688 * g + -0.081312 * b;

    if( (y >= 0) && (y <= 1) && (cb >= -0.15) && (cb <= 0.05) && (cr >= 0.05) && (cr < 0.2)) 
        return 1;
    return 0;

}

function dofaceparallel(input, w, h, image_pa, frm, ctx, ow, oh) {
    var row_sums_pa = new ParallelArray(h, rowSum, input, w, h);
    var col_sums_pa = new ParallelArray(w, colSum, input, w, h);

    var row_threshold = w/6;
    var col_threshold = h/5;
    var face_row_start; var inface = false;
    var face_row_end;
    row_sums_pa.materialize();
    row_sums = row_sums_pa.data;
    for(var i = 0; i < h; i++) {
        if(row_sums[i] >= row_threshold) {
            if(!face_row_start) {
                face_row_start = i;
                inface = true;
            }
        }
        else if(inface) {
            face_row_end = i;
            inface = false;
            break;
        } 
    }

    col_sums_pa.materialize();
    col_sums = col_sums_pa.data;
    var face_col_start; inface = false;
    var face_col_end;
    for(var i = 0; i < w; i++) {
        if(col_sums[i] >= col_threshold) {
            if(!face_col_start) {
                face_col_start = i;
                inface = true;
            }
        }
        else if(inface) {
            face_col_end = i;
            inface = false;
            break;
        }
    }
    writePAtoCanvasContext(image_pa, frm, ctx);
    ctx.strokeStyle = "rgba(20,254,0,1)";
    ctx.lineWidth = 5;
    ctx.strokeRect(face_col_start, face_row_start, 100, 100);
    return;

}
function rowSum(index, pix, w, h) {
    var i = index; var j = 0;
    var sum = 0;
    for(j = 0; j < w; j++) {
        if(pix[i][j] > 0) 
            sum += 1;
    }
    return sum;
}

function colSum(index, pix, w, h) {
    var i = index; var j = 0;
    var sum = 0;
    for(j = 0; j < h; j++) {
        if(pix[j][i] > 0)
            sum += 1;
        //sum += pix[j][i]
    }
    return sum;
}

var Filters = function() {

    function lighten_parallel(index, frame, w, h, grey_factor) {
        var i = index[0]; var j = index[1];
        var r = frame[i][j][0] * grey_factor;
        var g = frame[i][j][1] * grey_factor;
        var b = frame[i][j][2] * grey_factor;

        return [r, g, b, 255];
    }
    function lighten_sequential(frame, len, w, h, grey_factor, ctx) {
        var pix = frame.data;
        var r, g, b;
        for(var i = 0; i < len; i = i + 4) {
            r = pix[i]*grey_factor;
            g = pix[i+1]*grey_factor;
            b = pix[i+2]*grey_factor;

            if(r>255) r = 255;
            if(g>255) g = 255;
            if(b>255) b = 255;
            if(r<0) r = 0;
            if(g<0) g = 0;
            if(b<0) b = 0;

            pix[i] = r;
            pix[i+1] = g;
            pix[i+2] = b;

        }
        ctx.putImageData(frame, 0, 0);
    };

    function color_adjust_parallel(index, frame, w, h, ri, gi, bi) {
        var i = index[0]; var j = index[1];
        var r = frame[i][j][0] * ri;
        var g = frame[i][j][1] * gi;
        var b = frame[i][j][2] * bi;
        return [r, g, b, 255];
    }

    function color_adjust_sequential(frame, len, w, h, ri, gi, bi, ctx) {
        var pix = frame.data;
        var r, g, b;
        for(var i = 0; i < len; i = i + 4) {

            r = pix[i] * ri;
            g = pix[i+1] * gi;
            b = pix[i+2] * bi;

            if(r>255) r = 255;
            if(g>255) g = 255;
            if(b>255) b = 255;
            if(r<0) r = 0;
            if(g<0) g = 0;
            if(b<0) b = 0;

            pix[i] = r;
            pix[i+1] = g;
            pix[i+2] = b;
        }
        ctx.putImageData(frame, 0, 0);
    }

    function face_detect_parallel(index, frame, w, h) {
        var m = index[0]; var n = index[1];
        var kernel = [[1,4,7,4,1], [4,16,26,16,4], [7,26,41,26,7],[4,16,26,16,4],[1,1,1,1,1]];
        var norm_factor = 273;
        var kernel_width = (kernel.length-1)/2; // how many elements in each direction
        var frame_shape = frame.getShape();
        var neighbor_sum_r = 0;
        var neighbor_sum_g = 0;
        var neighbor_sum_b = 0;

        var x, y;
        var weight;
        for(var i = -1*kernel_width; i <= kernel_width; i++) {
            for(var j = -1*kernel_width; j <= kernel_width; j++) {
                x = m+i; y = n+j;
                x = (x < 0 || x > frame_shape[0]-1) ? 0 : x;
                y = (y < 0 || y > frame_shape[1]-1) ? 0 : y;
                weight = kernel[i+kernel_width][j+kernel_width];
                neighbor_sum_r += frame[x][y][0] * weight;
                neighbor_sum_g += frame[x][y][1] * weight;
                neighbor_sum_b += frame[x][y][2] * weight;
                
            }
        }
        var skin = isSkinYCrCb(neighbor_sum_r/norm_factor, neighbor_sum_g/norm_factor, neighbor_sum_b/norm_factor);
        return skin*255;
    }

    function smooth_sequential(pix, len, w, h) {
        var new_pix = new Array(len);
        var kernel = [[1,4,7,4,1], [4,16,26,16,4], [7,26,41,26,7],[4,16,26,16,4],[1,1,1,1,1]];
        var norm_factor = 273;
        var kernel_width = (kernel.length-1)/2; // how many elements in each direction
        var neighbor_sum = [0, 0, 0];
        for(var n = 0; n < len; n = n + 4) {

            neighbor_sum[0] = 0;
            neighbor_sum[1] = 0;
            neighbor_sum[2] = 0;

            for(var i = -1*kernel_width; i <= kernel_width; i++) {
                for(var j = -1*kernel_width; j <= kernel_width; j++) {
                    var offset =  n+(i*4*w)+(j*4);
                    if(offset < 0 || offset > len-4)  offset = 0;

                    
                    neighbor_sum[0] += pix[offset]*kernel[i+kernel_width][j+kernel_width];
                    neighbor_sum[1] += pix[offset+1]*kernel[i+kernel_width][j+kernel_width];
                    neighbor_sum[2] += pix[offset+2]*kernel[i+kernel_width][j+kernel_width];
                }
            }
            new_pix[n] = neighbor_sum[0]/norm_factor;
            new_pix[n+1] = neighbor_sum[1]/norm_factor;
            new_pix[n+2] = neighbor_sum[2]/norm_factor;
            new_pix[n+3] = pix[n+3];
        }
        return new_pix;
    } 


    function face_detect_sequential(frame, len, w, h, ctx) {
        var pix = frame.data;
        var smoothed_pix = smooth_sequential(pix, len, w, h);
        var row_sums = new Array(h);
        var col_sums = new Array(w);
        for(var i = 0; i < h; i++) {
            row_sums[i] = 0;
        }
        for(i = 0; i < w; i++)
            col_sums[i] = 0;


        var row_index = 0; var r, g, b;
        var skin = false;
        for(var i = 0; i < len; i = i + 4) {
            r = smoothed_pix[i]; g = smoothed_pix[i+1]; b = smoothed_pix[i+2];
            //if(isSkin(r, g, b)) {
            if(isSkinYCrCb(r, g, b)) {
                var ri = Math.floor(i/(4*w));
                var ci = (i-ri*w*4)/4;
                row_sums[ri] += 1;
                col_sums[ci] += 1;
            }
            /* All face pixels would be white by now. For debugging, set
             * all the non-face pixels to black.
             */
            /*
            else {
                pix[i] = 0;
                pix[i+1] = 0;
                pix[i+2] = 0;
                pix[i+3] = 255;
            }
            */
        }

        var row_threshold = (w)/6;
        var col_threshold = (h)/5;
        var face_row_start; var inface = false;
        var face_row_end;
	
        for(var i = 0; i < h; i++) {
            if(row_sums[i] >= row_threshold) {
                if(!face_row_start) {
                    face_row_start = i;
                    inface = true;
                }
            }
            else if(inface) {
                face_row_end = i;
                inface = false;
                break;
            }
        }

        var face_col_start; inface = false;
        var face_col_end;
        for(var i = 0; i < w; i++) {
            if(col_sums[i] >= col_threshold) {
                if(!face_col_start) {
                    face_col_start = i;
                    inface = true;
                }
            }
            else if(inface) {
                face_col_end = i;
                inface = false;
                break;
            }
        }
        ctx.putImageData(frame, 0,0);
        ctx.strokeStyle = "rgba(165,254,0,1)";
        ctx.lineWidth=5;
	    ctx.strokeRect(face_col_start, face_row_start, 100, 100);
        return;
    }
    
    function blend_lighten(a, b) {
        return (b > a) ? b : a;
    }

    function A3D_parallel(index, frame, w, h, dist) {
        var i = index[0]; var j = index[1];
        var k = j - dist;
        var r1, g1, b1, r2, g2, b2;
        var rb, gb, bb;
        if(k < 0) k = j;
        r1 = frame[i][j][0]; g1 = frame[i][j][1]; b1 = frame[i][j][2];
        r2 = frame[i][k][0]; g2 = frame[i][k][1]; b2 = frame[i][k][2];
        var left = dubois_blend_left(r1, g1, b1);
        var right = dubois_blend_right(r2, g2, b2);
        rb = left[0] + right[0] + 0.5;
        gb = left[1] + right[1] + 0.5;
        bb = left[2] + right[2] + 0.5;
        return [rb, gb, bb, 255];
    }

    function A3D_sequential(frame, len, w, h, dist, ctx) {
        var pix = frame.data;
        var new_pix = new Array(len);
        var r1, g1, b1;
        var r2, g2, b2;
        var rb, gb, bb;
        for(var i = 0 ; i < len; i = i+4) {
            var j = i-(dist*4);
            if(Math.floor(j/(w*4)) !== Math.floor(i/(w*4))) j = i;
                r1 = pix[i]; g1 = pix[i+1]; b1 = pix[i+2];
                r2 = pix[j]; g2 = pix[j+1]; b2 = pix[j+2];

                var left = dubois_blend_left(r1, g1, b1);
                var right = dubois_blend_right(r2, g2, b2);
                rb = left[0] + right[0] + 0.5;
                gb = left[1] + right[1] + 0.5;
                bb = left[2] + right[2] + 0.5;
                
                new_pix[i] = rb;
                new_pix[i+1] = gb;
                new_pix[i+2] = bb;
                new_pix[i+3] = pix[i+3];
        }
        for(var i = 0 ; i < len; i = i+1) {
            pix[i] = new_pix[i];
        }
        ctx.putImageData(frame, 0, 0);

    }

    function sepia_sequential(frame, len, w, h, ctx) {
        var pix = frame.data;
        var avg = 0; var r = 0, g = 0, b = 0;
        for(var i = 0 ; i < len; i = i+4) {
            r = (pix[i] * 0.393 + pix[i+1] * 0.769 + pix[i+2] * 0.189);
            g = (pix[i] * 0.349 + pix[i+1] * 0.686 + pix[i+2] * 0.168);
            b = (pix[i] * 0.272 + pix[i+1] * 0.534 + pix[i+2] * 0.131);

            if(r>255) r = 255;
            if(g>255) g = 255;
            if(b>255) b = 255;
            if(r<0) r = 0;
            if(g<0) g = 0;
            if(b<0) b = 0;

            pix[i] = r;
            pix[i+1] = g;
            pix[i+2] = b;
        }
        ctx.putImageData(frame, 0, 0);
    }

    function sepia_parallel(index, frame, w, h) {
        var i = index[0]; var j = index[1];
        var oor = frame[i][j][0];
        var oog = frame[i][j][1];
        var oob = frame[i][j][2];


        var r = oor*0.393 + oog*0.769 + oob*0.189;
        var g = oor*0.349 + oog*0.686 + oob*0.168;
        var b = oor*0.272 + oog*0.534 + oob*0.131;

        return [r, g, b, 255];
    }

    function desaturate_parallel(index, frame, w, h) {
        var i = index[0]; var j = index[1];
        var avg = (frame[i][j][0] + frame[i][j][1] + frame[i][j][2])/3;
        return [avg, avg, avg, 255];
    }

    function desaturate_sequential(frame, len, w, h, ctx) {
        var pix = frame.data;
        var avg;
        for(var i = 0; i < len; i = i+4) {
            avg = (pix[i]+pix[i+1]+pix[i+2])/3;
            pix[i] = avg;
            pix[i+1] = avg;
            pix[i+2] = avg;
        }
        ctx.putImageData(frame, 0, 0);
    }

    function sharpen_parallel(index, frame, w, h) {
        var ekernel = [[0,0,0,0,0], [0,0,-1,0,0], [0,-1,5,-1,0], [0,0,-1,0,0], [0,0,0,0,0]];
        var m = index[0]; var n = index[1];
        var kernel_width = (ekernel.length-1)/2; // how many elements in each direction
        var neighbor_sum = [0,0,0,255];
        var frame_shape = frame.getShape();
        var x, y; var weight;
        for(var i = -1*kernel_width; i <= kernel_width; i++) {
            for(var j = -1*kernel_width; j <= kernel_width; j++) {

                x = m+i; y = n+j;
                
                x = (x < 0 || x > frame_shape[0]-1) ? 0 : x;
                y = (y < 0 || y > frame_shape[1]-1) ? 0 : y;
                
                weight = ekernel[i+kernel_width][j+kernel_width];

                neighbor_sum[0] += frame[x][y][0] * weight;
                neighbor_sum[1] += frame[x][y][1] * weight;
                neighbor_sum[2] += frame[x][y][2] * weight;
            }
        }
        return neighbor_sum;
    }

    function sharpen_sequential(frame, len, w, h, ctx) {
        var pix = frame.data
        var kernel = [[0,0,0,0,0], [0,0,-1,0,0], [0,-1,5,-1,0], [0,0,-1,0,0], [0,0,0,0,0]];
        var new_pix = new Array(len);
        var kernel_width = (kernel.length-1)/2; // how many elements in each direction
        var neighbor_sum = [0, 0, 0];
        var weight;
        for(var n = 0; n < len; n = n + 4) {

            neighbor_sum[0] = 0;
            neighbor_sum[1] = 0;
            neighbor_sum[2] = 0;

            for(var i = -1*kernel_width; i <= kernel_width; i++) {
                for(var j = -1*kernel_width; j <= kernel_width; j++) {
                    var offset =  n+(i*4*w)+(j*4);
                    if(offset < 0 || offset > len-4)  offset = 0;
                    weight = kernel[i+kernel_width][j+kernel_width];
                    neighbor_sum[0] += pix[offset] * weight;
                    neighbor_sum[1] += pix[offset+1] * weight;
                    neighbor_sum[2] += pix[offset+2] * weight;

                }
            }
            new_pix[n] = neighbor_sum[0];
            new_pix[n+1] = neighbor_sum[1];
            new_pix[n+2] = neighbor_sum[2];
            new_pix[n+3] = pix[n+3];

        }

        for(var n = 0 ; n < len; n++) {
            var val = new_pix[n];
            if(val < 0) val = 0;
            if(val > 255) val = 255;
            pix[n] = val;
        }
        ctx.putImageData(frame, 0, 0);
    }

    function edge_detect_sequential(frame, len, w, h, ctx) {
        var pix = frame.data
        var kernel = [[1,1,1,1,1], [1,2,2,2,1], [1,2,-32,2,1], [1,2,2,2,1], [1,1,1,1,1]];
        var new_pix = new Array(len);
        var kernel_width = (kernel.length-1)/2; // how many elements in each direction
        var neighbor_sum = [0, 0, 0];
        var weight;
        for(var n = 0; n < len; n = n + 4) {

            neighbor_sum[0] = 0;
            neighbor_sum[1] = 0;
            neighbor_sum[2] = 0;

            for(var i = -1*kernel_width; i <= kernel_width; i++) {
                for(var j = -1*kernel_width; j <= kernel_width; j++) {
                    var offset =  n+(i*4*w)+(j*4);
                    if(offset < 0 || offset > len-4)  offset = 0;
                    weight = kernel[i+kernel_width][j+kernel_width];
                    neighbor_sum[0] += pix[offset] * weight;
                    neighbor_sum[1] += pix[offset+1] * weight;
                    neighbor_sum[2] += pix[offset+2] * weight;
                }
            }
            new_pix[n] = neighbor_sum[0];
            new_pix[n+1] = neighbor_sum[1];
            new_pix[n+2] = neighbor_sum[2];
            new_pix[n+3] = pix[n+3];
        }

       for(var n = 0 ; n < len; n++) {
           var val = new_pix[n];
           if(val < 0) val = 0;
           if(val > 255) val = 255;
           pix[n] = val;
       }
       ctx.putImageData(frame, 0, 0);
    }

    function edge_detect_sequential_unrolled(frame, len, w, h, ctx) {
        var pix = frame.data;
        var new_pix = new Array(len);
        var c = -1/8; var weight = 1/c;

        for(var n = 0 ; n < len; n=n+4) {
            var previ = (n < 4*w) ? n : n-(w*4);
            var nexti = (n > (h-1)*w*4) ? n : n+(w*4);
            var prevj = (n < 4) ? n : n - 4;
            var nextj = (n > len-4-1) ? n : n+4;

            // Hoist w*4 and (h-1)*w*4 out of the loop
            var upperleft = (n < (w*4)+4) ? n : n - (w*4) - 4;
            var lowerleft = (n > (h-1)*w*4) ? n : n + (w*4) - 4;
            var upperright = (n < (w*4)) ? n : n - (w*4) + 4;
            var lowerright = (n > (h-1)*w*4) ? n : n + (w*4) + 4;

            var r = weight*(pix[n] + (pix[previ] + pix[nexti] + pix[prevj] + pix[nextj] + 
                        pix[upperleft] + pix[lowerleft] + pix[upperright] + pix[lowerright])*c);
            var g = weight*(pix[n+1] + (pix[previ+1] + pix[nexti+1] + pix[prevj+1] + pix[nextj+1] + 
                        pix[upperleft+1] + pix[lowerleft+1] + pix[upperright+1] + pix[lowerright+1])*c);
            var b = weight*(pix[n+2] + (pix[previ+2] + pix[nexti+2] + pix[prevj+2] + pix[nextj+2] + 
                        pix[upperleft+2] + pix[lowerleft+2] + pix[upperright+2] + pix[lowerright+2])*c);

            new_pix[n] = (r < 0) ? 0 : ( (r > 255) ? 255 : r) ;
            new_pix[n+1] = (g < 0) ? 0 : ( (g > 255) ? 255 : g) ;
            new_pix[n+2] = (b < 0) ? 0 : ( (b > 255) ? 255 : b) ;
            new_pix[n+3] = 255;
        }
        for(var n = 0 ; n < len; n++) {
            pix[n] = new_pix[n];
        }
        ctx.putImageData(frame, 0, 0);
    }

    function edge_detect_parallel(index, frame, w, h) {
        var ekernel = [[1,1,1,1,1], [1,2,2,2,1], [1,2,-32,2,1], [1,2,2,2,1], [1,1,1,1,1]];
        var m = index[0]; var n = index[1];
        var kernel_width = (ekernel.length-1)/2; // how many elements in each direction
        var neighbor_sum = [0,0,0,255];
        var frame_shape = frame.getShape();

        var x, y;
        var weight;
        for(var i = -1*kernel_width; i <= kernel_width; i++) {
            for(var j = -1*kernel_width; j <= kernel_width; j++) {

                x = m+i; y = n+j;

                x = (x < 0 || x > frame_shape[0]-1) ? 0 : x;
                y = (y < 0 || y > frame_shape[1]-1) ? 0 : y;

                weight = ekernel[i+kernel_width][j+kernel_width];
                neighbor_sum[0] += frame[x][y][0] * weight;
                neighbor_sum[1] += frame[x][y][1] * weight;
                neighbor_sum[2] += frame[x][y][2] * weight;
            }
        }
        return neighbor_sum;
    }

    function edge_detect_parallel_unrolled(index, frame, w, h) {

        var c = -1/8; var weight = 1/c;
        var i = index[0]; var j = index[1];

        var previ = (i==0)?i:i-1;
        var nexti = (i==h-1)?i:i+1;
        var prevj = (j==0)?j:j-1;
        var nextj = (j==w-1)?j:j+1;

        // Hoist all the multiplies
        var r = weight*(frame[i][j][0] + (frame[nexti][j][0] + frame[previ][j][0] +
                    frame[i][nextj][0] + frame[i][prevj][0] + frame[previ][prevj][0] +
                    frame[nexti][prevj][0] + frame[previ][nextj][0] + frame[nexti][nextj][0])*c) ;

        var g = weight*(frame[i][j][1] + (frame[nexti][j][1] + frame[previ][j][1] +
                    frame[i][nextj][1] + frame[i][prevj][1] + frame[previ][prevj][1] +
                    frame[nexti][prevj][1] + frame[previ][nextj][1] + frame[nexti][nextj][1])*c) ;

        var b = weight*(frame[i][j][2] + (frame[nexti][j][2] + frame[previ][j][2] +
                    frame[i][nextj][2] + frame[i][prevj][2] + frame[previ][prevj][2] +
                    frame[nexti][prevj][2] + frame[previ][nextj][2] + frame[nexti][nextj][2])*c) ;

        r = (r < 0) ? 0 : ( (r > 255) ? 255 : r) ;
        g = (g < 0) ? 0 : ( (g > 255) ? 255 : g) ;
        b = (b < 0) ? 0 : ( (b > 255) ? 255 : b) ;
        return [r, g, b, 255];
    }

    return {
        "sepia_sequential" : sepia_sequential,
        "desaturate_sequential" : desaturate_sequential,
        "lighten_sequential" : lighten_sequential,
        "color_adjust_sequential" : color_adjust_sequential,
        "edge_detect_sequential" : edge_detect_sequential,
        "sharpen_sequential" : sharpen_sequential,
        "face_detect_sequential" : face_detect_sequential,
        "A3D_sequential" : A3D_sequential,

        "sepia_parallel" : sepia_parallel,
        "desaturate_parallel" : desaturate_parallel,
        "lighten_parallel" : lighten_parallel,
        "color_adjust_parallel" : color_adjust_parallel,
        "edge_detect_parallel" : edge_detect_parallel,
        "sharpen_parallel" : sharpen_parallel,
        "face_detect_parallel" : face_detect_parallel,
        "A3D_parallel" : A3D_parallel
    };
    }();
