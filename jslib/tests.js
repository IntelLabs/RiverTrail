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

// To run the River Trail tests:

// 1. install the 'nodeunit' npm package with `npm install nodeunit`

// 2. in `node_modules/nodeunit`, run `make browser`

// 3. if step (2) fails because uglify is missing, run `npm install
// uglify-js` in `node_modules/nodeunit` (it will be installed under
// `node_modules/nodeunit/node_modules`, which is what you want)

// 4. load up 'tests.html' in Firefox


// For now, these are just the first few tests from the tutorial.

this.ParallelArrayTests = {
    'pa0': function(test) {
        var pa0 = new ParallelArray();

        test.expect(2);
        test.equal(pa0.toString(), "[]", "create an empty ParallelArray");
        test.equal(pa0.shape.toString(), "0", "with shape 0");
        test.done();
    },

    'pa1': function(test) {
        var pa1 = new ParallelArray([ [0,1], [2,3], [4,5] ]);

        test.expect(2);
        test.equal(pa1.toString(),
                   "[0, 1, 2, 3, 4, 5]",
                   "create a ParallelArray out of a nested JS array");
        test.equal(pa1.shape.toString(), "3,2", "with shape 3,2");
        test.done();
    },

    'pa2': function(test) {
        var pa1 = new ParallelArray([ [0,1], [2,3], [4,5] ]);
        var pa2 = new ParallelArray(pa1);

        test.expect(2);
        test.equal(pa2.toString(),
                   "[0, 1, 2, 3, 4, 5]",
                   "create a ParallelArray from another ParallelArray");
        test.equal(pa2.shape.toString(), "3,2", "with shape 3,2");
        test.done();
    },

    'pa3': function(test) {
        var pa3 = new ParallelArray([0,1], [2,3]);

        test.expect(2);
        test.equal(pa3.toString(),
                   "[0, 1, 2, 3]",
                   "create a nested ParallelArray from two arrays");
        test.equal(pa3.shape.toString(), "2,2", "with shape 2,2");
        test.done();
    },

    'pa6': function(test) {
        var pa6 = new ParallelArray(3, function (i) { return [i, i+1]; });

        test.expect(2);
        test.equal(pa6.toString(),
                   "[0, 1, 1, 2, 2, 3]",
                   "create a ParallelArray using the comprehension constructor");
        test.equal(pa6.shape.toString(), "3,2", "with shape 3,2");
        test.done();
    },

    'pa7': function(test) {
        var pa7 = new ParallelArray([3,2], function (iv) { return iv[0] * iv[1]; });

        test.expect(2);
        test.equal(pa7.toString(),
                   "[0, 0, 0, 1, 0, 2]",
                   "create a ParallelArray with a shape vector");
        test.equal(pa7.shape.toString(), "3,2", "with shape 3,2");
        test.done();
    },


    'pa8': function(test) {
        var pa8 = new ParallelArray(document.createElement("canvas"));

        // canvas elements default to width 300 and height 150

        test.expect(4);
        test.equal(typeOf(pa8),
                   "object",
                   "create a ParallelArray from a canvas element");
        test.equal(pa8.shape[0], "150", "with height 150");
        test.equal(pa8.shape[1], "300", "and width 300");
        test.equal(pa8.shape[2], "4", "and RGBA values for each pixel");
        test.done();
    },

};

this.mapTests = {
    'm0': function(test) {
        var source = new ParallelArray([1,2,3,4,5]);
        var plusOne = source.map(function inc(v) { return v+1; });

        test.expect(2);
        test.equal(plusOne.toString(), "[2, 3, 4, 5, 6]", "add 1 to every element in a ParallelArray");
        test.equal(plusOne.shape.toString(), "5", "with shape 5");
        test.done();
    },

};

this.flattenTests = {
    'f0': function(test) {
        var pa = new ParallelArray([ [1,2], [3,4] ]);
        var paFlat = pa.flatten();

        test.expect(4);
        test.equal(pa.shape.toString(), "2,2", "given a 2x2 ParallelArray");
        test.equal(paFlat.toString(), "[1, 2, 3, 4]", "flatten it");
        test.equal(paFlat.shape.toString(), "4", "to one dimension with four elements");
        test.equal(paFlat.get(0).toString(), "1", "where 1 is the first element");
        test.done();
    },

    'f1': function(test) {
        var pa = new ParallelArray([ [ [1, 1], [2, 2] ], [ [3, 3], [4, 4] ] ]);
        var paFlat = pa.flatten();

        test.expect(4);
        test.equal(pa.shape.toString(), "2,2,2", "given a 2x2x2 ParallelArray");
        test.equal(paFlat.toString(), "[1, 1, 2, 2, 3, 3, 4, 4]", "flatten it");
        test.equal(paFlat.shape.toString(), "4,2", "to two dimensions");
        test.equal(paFlat.get(0).toString(), "[1, 1]", "where [1, 1] is the first element");
        test.done();
    },

};

this.issueTests = {
    'issue48': function(test) {
        var pa = new ParallelArray([0,1,2,3,4], [10,11,12,13,14], [20,21,22,23,24]);

        test.expect(3);
        test.equal(pa.get(1).toString(), "[10, 11, 12, 13, 14]", "get the array at index 1 of a nested ParallelArray");
        test.equal(pa.get(1).map(function(e) { return e; }).toString(), "[10, 11, 12, 13, 14]", "and map the identity function over it");
        test.equal(pa.get(1).map(function(e) { return e+1; }).toString(), "[11, 12, 13, 14, 15]", "and map the increment function over it");
        test.done();
    },

};
