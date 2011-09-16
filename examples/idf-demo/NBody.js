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

/*
 *   NBody.js
 *
 *   @description Main N-Body update and draw loop. Handles all vector data using traditional typed arrays or Intel's 
 *    parallel arrays depending on your selection.
 *  
 *  @origin  Stephan, Tatiana, and Rick from the Intel River Trail team.
 *   https://github.com/RiverTrail
 *
 *  @author vance@fashionbuddha.com adapted a boids algorithym to the River Trail parallel processing library.  
 */




var numBodies = 0;
var previousNumBodies = 0;
var implementation = "parallel";
var previousImplementation;


// average ma
var average = new Array();




"DO NOT use strict";
var NBody = {
    // Constants used below, I'm not yet sure what deltaTime and epsSqr should really be..
    "Constant": {
        "GROUP_SIZE": 5,    // irrelevent since it is due to lack of compiler optimzation reelated to tiling.
        "ITER": 5,
        "deltaTime": 1,     // 0.005 in their code.
        "epsSqr": 50,       // softening factor, when they compute, set to 50. 
        "initialVelocity": 8 // set to 0 to turn off
    },

    "init": function init(p_implementation) {

        justSwitched = true;   // tells the FPS counter to reset and recalculate the average

        NBody.private.stop = true; // stop the particles if already running

        // toggle buttons 
        if (p_implementation == "parallel") {
            document.getElementById("startParallel").disabled = true;
            document.getElementById("startSequential").disabled = false;
        }
        else {
            document.getElementById("startParallel").disabled = false;
            document.getElementById("startSequential").disabled = true;
        }
        document.getElementById("buttonStop").disabled = false;
        document.getElementById('bodies').disabled = true;

        // set the global implementation variable
        implementation = p_implementation;

        // grab the value from the drop down
        numBodies = parseInt(document.getElementById('bodies').value, 10);

        // this is a fresh start, just initialize
        if (previousImplementation == null || previousNumBodies == null) {
            NBody.setup();
            NBody.private.stop = false;
        }

        // body count changed so swap data or restart
        if (numBodies != previousNumBodies) {
            NBody.resetAndStart();
        } else {
            if (implementation != previousImplementation) {
                NBody.swapDataAndResume();
            } else {
                NBody.resume();
            }
        }

        // fire up the GLES render
        NBody.display.webGLStart();

        NBody.private.stop = false;

        previousNumBodies = numBodies;
        previousImplementation = implementation;


    }, // init called onload

    "resume": function resume() {
        NBody.private.stop = false;

    },



    "resetAndStart": function resetAndStart() {

        NBody.setup();
        initRender(true);
        NBody.private.stop = false;
    },

    "pause": function pause() {

        document.getElementById("startSequential").disabled = false;
        document.getElementById("startParallel").disabled = false;
        document.getElementById("buttonStop").disabled = true;
        document.getElementById('bodies').disabled = false;

        NBody.private.stop = true;

    },



    "stopAndReset": function stopAndReset() {

        document.getElementById("startSequential").disabled = false;
        document.getElementById("startParallel").disabled = false;
        document.getElementById("buttonStop").disabled = true;
        document.getElementById('bodies').disabled = false;

        NBody.setup();

        setTimeout(NBody.pause, 100);

    },





    "resetButtons": function resetButtons() {

        runConfig();

        document.getElementById("startSequential").disabled = false;
        document.getElementById("startParallel").disabled = false;
        document.getElementById("buttonStop").disabled = true;
        document.getElementById('bodies').disabled = false;
    },

    "animateTick": function animateTick() {
        // Use the indexedCombine since we need to get the pos and vel out of different arrays.
        if (implementation === "parallel") {

            NBody.animateTickParallel();
            return;
        }
        if (implementation === "sequential") {

            NBody.animateTickSequential();
            return;
        }

    },




    "time": 0,


    "swapDataAndResume": function swapDataAndResume() {
        justSwitched = true;

        NBody.private.stop = true;

        var i;
        var j;
        var float32Quad;

        var i;
        var j;
        var float32Quad;
        var velStart = 0.0;

        // Create normal arrays, populat them and then turn them into ParallelArrays.
        if (implementation === "sequential") {

            //use  typed arrays to make a "best case" scenario for traditional js

            NBody.private.posTA = new Float32Array(numBodies * 3);
            NBody.private.velTA = new Float32Array(numBodies * 6);

            // initialization of inputs //
            for (i = 0; i < numBodies; i++) {
                // This is a 1 dimensional array where each 3 elements represent, x, y, z
                NBody.private.posTA[i * 3 + 0] = NBody.private.pos.data[i * 4 + 0];
                NBody.private.posTA[i * 3 + 1] = NBody.private.pos.data[i * 4 + 1];
                NBody.private.posTA[i * 3 + 2] = NBody.private.pos.data[i * 4 + 2];

                // velocity requires two acceleration vars for attraction/repulsion
                NBody.private.velTA[i * 6 + 0] = NBody.private.vel.data[i * 8 + 0];
                NBody.private.velTA[i * 6 + 1] = NBody.private.vel.data[i * 8 + 1];
                NBody.private.velTA[i * 6 + 2] = NBody.private.vel.data[i * 8 + 2];

                NBody.private.velTA[i * 6 + 3] = NBody.private.vel.data[i * 8 + 4];
                NBody.private.velTA[i * 6 + 4] = NBody.private.vel.data[i * 8 + 5];
                NBody.private.velTA[i * 6 + 5] = NBody.private.vel.data[i * 8 + 6];

            }

            NBody.private.pos = null;
            NBody.private.vel = null;
            NBody.private.acc = null;

        } else {

            NBody.private.initVel = new Array(numBodies);
            NBody.private.initVelTA = new Float32Array(numBodies * 4);

            var initAsteroidPos = new Array(50);

            for (i = 0; i < 50; i++) {

                initAsteroidPos[i] = new ParallelArray([

                                                            NBody.private.posTA[i * 3 + 0],     // x
                                                            NBody.private.posTA[i * 3 + 1],
                                                            NBody.private.posTA[i * 3 + 2],

                                                            ]);
            }


            // initialization of inputs //
            for (i = 0; i < numBodies; i++) {


                NBody.private.initPos[i] = new ParallelArray([

                                                            NBody.private.posTA[i * 3 + 0],    // x
                                                            NBody.private.posTA[i * 3 + 1],    // y
                                                            NBody.private.posTA[i * 3 + 2],    // z                        
                                                            Math.floor((Math.random()) + 1)

                                                            ]);


                // velocity requires two acceleration vars for attraction/repulsion
                NBody.private.initVel[i] = new ParallelArray([

                                                            NBody.private.velTA[i * 6 + 0],          // x
                                                            NBody.private.velTA[i * 6 + 1],          // y
                                                            NBody.private.velTA[i * 6 + 2],          // z
                                                            0,
                                                            NBody.private.velTA[i * 6 + 3],          // x
                                                            NBody.private.velTA[i * 6 + 4],          // y
                                                            NBody.private.velTA[i * 6 + 5],          // z
                                                            0

                                                            ]);

            }

            NBody.private.velTA = null;
            NBody.private.posTA = null;

            NBody.private.asteroidPos = new ParallelArray(Float32Array, initAsteroidPos);

            NBody.private.pos = new ParallelArray(Float32Array, NBody.private.initPos);
            NBody.private.vel = new ParallelArray(Float32Array, NBody.private.initVel);
            NBody.private.acc = new ParallelArray(Float32Array, NBody.private.initAcc);

        }


        initRender(false);
        NBody.private.stop = false;


    },



    // They use width that operates on an indexed space.
    "setup": function setup() {
        var i;
        var j;
        var float32Quad;
        var velStart = 0.0;


        // Create normal arrays, populat them and then turn them into ParallelArrays.
        NBody.private.initPos = new Array(numBodies);
        NBody.private.initVel = new Array(numBodies);
        NBody.private.initPosTA = new Float32Array(numBodies * 3);
        NBody.private.initVelTA = new Float32Array(numBodies * 6);


        if (implementation === "sequential") {

            // initialization of inputs //
            for (i = 0; i < numBodies; i++) {
                // This is a 1 dimensional array where each 4 elements represent, x, y, z, and mass.
                NBody.private.initPosTA[i * 3 + 0] = Math.floor((Math.random()) * 40000);           // x
                NBody.private.initPosTA[i * 3 + 1] = Math.floor((Math.random()) * 20000);           // y
                NBody.private.initPosTA[i * 3 + 2] = Math.floor((Math.random() - .25) * 50000);           // z

                NBody.private.initVelTA[i * 6 + 0] = (Math.random() - 0.5) * NBody.Constant.initialVelocity;
                NBody.private.initVelTA[i * 6 + 1] = (Math.random() - 0.5) * NBody.Constant.initialVelocity;
                NBody.private.initVelTA[i * 6 + 2] = (Math.random()) * NBody.Constant.initialVelocity + 10;

                NBody.private.initVelTA[i * 6 + 3] = (Math.random() - 0.5) * NBody.Constant.initialVelocity;            // x2
                NBody.private.initVelTA[i * 6 + 4] = (Math.random() - 0.5) * NBody.Constant.initialVelocity;            // y2   
                NBody.private.initVelTA[i * 6 + 5] = (Math.random()) * NBody.Constant.initialVelocity;            // z2


            }
            NBody.private.posTA = NBody.private.initPosTA;
            NBody.private.velTA = NBody.private.initVelTA;
        } else {

            NBody.private.initVel = new Array(numBodies);
            NBody.private.initVelTA = new Float32Array(numBodies * 4);

            var initAsteroidPos = new Array(50);


            // initialization of inputs //
            for (i = 0; i < numBodies; i++) {


                NBody.private.initPos[i] = new ParallelArray([

                                                            Math.floor((Math.random()) * 15000) - 20000, // * Math.cos(i/numBodies),     // x
                                                            Math.floor((Math.random()) * -10000) - 90000,     // y
                                                            Math.floor((Math.random() - .25) * 15000) - 30000, // * Math.sin(i / numBodies), 
                                                            Math.floor((Math.random()) + 1)

                                                            ]);



                NBody.private.initVel[i] = new ParallelArray([

                                                            (Math.random() - 0.5) * NBody.Constant.initialVelocity,          // x
                                                            (Math.random() - 0.5) * (NBody.Constant.initialVelocity * 200),          // y
                                                            (Math.random() - 0.5) * (NBody.Constant.initialVelocity + 10),          // z
                                                            0,
                                                            (Math.random() - 0.5) * NBody.Constant.initialVelocity,          // x
                                                            (Math.random() - 0.5) * NBody.Constant.initialVelocity,          // y
                                                            (Math.random() - .15) * NBody.Constant.initialVelocity,          // z
                                                            0

                                                            ]);


            }

            NBody.private.asteroidPos = new ParallelArray(Float32Array, initAsteroidPos);

            NBody.private.pos = new ParallelArray(Float32Array, NBody.private.initPos);
            NBody.private.vel = new ParallelArray(Float32Array, NBody.private.initVel);
            NBody.private.acc = new ParallelArray(Float32Array, NBody.private.initAcc);

        }
        NBody.time = 0;
        NBody.private.stop = false;

        return 1;
    },


    "animateTickParallel": function animateTickParallel() {

        // increment (+=) velocity by accelleration
        var newVel = NBody.private.vel.combine(

                                     1,
                                     low_precision(NBody.bodyVelocityLoopified),
                                     NBody.private.pos,
                                     numBodies,
                                     NBody.Constant.deltaTime,
                                     NBody.Constant.epsSqr,
                                     NBody.time,
                                     NBody.private.asteroidPos

                                     );

        var testVar = 49;
        testVar = 0;

        // Update Particle Position (add vel)
        NBody.private.pos = NBody.private.pos.combine(

                                    1,
                                    low_precision(NBody.bodyPositionParallel),
                                    newVel,
                                    NBody.private.vel,
                                    NBody.private.width,
                                    NBody.time
        );


        NBody.private.vel = newVel;

        // used for timing of introduction and a basis for trigonometric motions 
        NBody.time++;
    },



    // Combine accelerations, add the net velocity to position
    "bodyPositionParallel": function bodyPositionParallel(index, allVels, allOldVels, bounds, time) {
        var x = 0;
        var y = 0;
        var z = 0;
        var m = 0;

        var velX = allVels.get(index).get(0);
        var velY = allVels.get(index).get(1);
        var velZ = allVels.get(index).get(2);

        var velX2 = allVels.get(index).get(4);
        var velY2 = allVels.get(index).get(5);
        var velZ2 = allVels.get(index).get(6);

        var netVelX = (velX - velX2);
        var netVelY = (velY - velY2);
        var netVelZ = (velZ - velZ2);


        m = 0;

        x = this.get(index).get(0) + (netVelX);
        y = this.get(index).get(1) + (netVelY);
        z = this.get(index).get(2) + (netVelZ);



        return [x, y, z, m];
    },



    // Perform the acceleration calculations
    "bodyVelocityLoopified": function bodyVelocityLoopified(index, pos, acc, deltaTime, epsSqr, time, asteroidPos) {
        var shape = this.getShape()[0];

        var newVel;
        var newX, newY, newZ, newM;
        var newX2, newY2, newZ2, newM2;

        var cX = Math.cos(time / 22) * -4200;
        var cY = Math.sin(time / 14) * 9200;
        var cZ = Math.sin(time / 27) * 6000;


        // pull to center
        var maxDistance = 3400;
        var pullStrength = .042;

        var speedLimit = 8;

        // zones
        var zone = 400;
        var repel = 100;
        var align = 300;
        var attract = 100;

        // change forces based on intro time
        if (time < 500) {
            speedLimit = 2000;
            var attractPower = 100.9;
        } else {
            speedLimit = .2;
            attractPower = 20.9;
        }

       
        var zoneSqrd = zone * zone + zone * zone + zone * zone;

        var accX = 0, accY = 0, accZ = 0;
        var accX2 = 0, accY2 = 0, accZ2 = 0;
        var i;

        var debug = 0;

        // define particle 1 center distance
        var dirToCenterX = cX - pos.get(index).get(0);
        var dirToCenterY = cY - pos.get(index).get(1);
        var dirToCenterZ = cZ - pos.get(index).get(2);

        var distanceSquaredTo = dirToCenterX * dirToCenterX + dirToCenterY * dirToCenterY + dirToCenterZ * dirToCenterZ;
        var distToCenter = Math.sqrt(distanceSquaredTo);

        // orient to center
        if (distToCenter > maxDistance) {

            var vel = (distToCenter - maxDistance) * pullStrength;
            if (time < 200)
                vel = .2;
            else vel = (distToCenter - maxDistance) * pullStrength;

            accX += (dirToCenterX / distToCenter) * vel;
            accY += (dirToCenterY / distToCenter) * vel;
            accZ += (dirToCenterZ / distToCenter) * vel;
        }



        for (i = 0; i < shape; i = i + 1) {

            // DIRS P1
            var rx = pos.get(i).get(0) - pos.get(index).get(0);
            var ry = pos.get(i).get(1) - pos.get(index).get(1);
            var rz = pos.get(i).get(2) - pos.get(index).get(2);
            var rm = pos.get(i).get(3) * 1.0;

            // make shure we are not testing the particle against its own position
            var areSame = 0;
            if (pos.get(i).get(0) == pos.get(index).get(0) && pos.get(i).get(1) == pos.get(index).get(1) && pos.get(i).get(2) == pos.get(index).get(2))
            
            areSame += 1;

            var distSqrd = rx * rx + ry * ry + rz * rz;

            // cant use eqals to test, only <= or >= WTF
            if (distSqrd < zoneSqrd && areSame <= 0) {

                var length = Math.sqrt(distSqrd);
                var percent = distSqrd / zoneSqrd;


                if (distSqrd < repel) {   //repel

                    var F = (repel / percent - 1) * .025;

                    var normalRx = (rx / length) * F;
                    var normalRy = (ry / length) * F;
                    var normalRz = (rz / length) * F;

                    accX = accX + normalRx;
                    accY = accY + normalRy;
                    accZ = accZ + normalRz;

                    accX2 = accX2 - normalRx;
                    accY2 = accY2 - normalRy;
                    accZ2 = accZ2 - normalRz;

                } else if (distSqrd < align) { //align

                    var threshDelta = align - repel;
                    var adjustedPercent = (percent - repel) / threshDelta;
                    var Q = (.5 - Math.cos(adjustedPercent * 3.14159265 * 2) * .5 + .5) * 100.9;


                    // get velocity 2
                    var velX2 = this.get(i).get(4);
                    var velY2 = this.get(i).get(5);
                    var velZ2 = this.get(i).get(6);

                    var velLength2 = Math.sqrt(velX2 * velX2 + velY2 * velY2 + velZ2 * velZ2);

                    // normalize vel2 and multiply by factor
                    velX2 = (velX2 / velLength2) * Q;
                    velY2 = (velY2 / velLength2) * Q;
                    velZ2 = (velZ2 / velLength2) * Q;

                    // get own velocity
                    var velX = this.get(i).get(0);
                    var velY = this.get(i).get(1);
                    var velZ = this.get(i).get(2);

                    var velLength = Math.sqrt(velX * velX + velY * velY + velZ * velZ);

                    // normalize own velocity
                    velX = (velX / velLength) * Q;
                    velY = (velY / velLength) * Q;
                    velZ = (velZ / velLength) * Q;

                    accX += velX2;
                    accY += velY2;
                    accZ += velZ2;

                    accX2 += velX;
                    accY2 += velY;
                    accZ2 += velZ;


                }
                if (distSqrd > attract) {        //attract

                    var threshDelta2 = 1 - attract;
                    var adjustedPercent2 = (percent - attract) / threshDelta2;
                    var C = (1 - (Math.cos(adjustedPercent2 * 3.14159265 * 2) * 0.5 + 0.5)) * attractPower;

                    // normalize the distance vector
                    var dx = (rx / (length)) * C;
                    var dy = (ry / (length)) * C;
                    var dz = (rz / (length)) * C;


                    debug = 1.1;


                    accX += dx;
                    accY += dy;
                    accZ += dz;

                    accX2 -= dx;
                    accY2 -= dy;
                    accZ2 -= dz;

                }

            }

        }

        // Speed limits

        if (time > 500) {
            var accSquared = accX * accX + accY * accY + accZ * accZ;
            if (accSquared > speedLimit) {

                accX = accX * .015;
                accY = accY * .015;
                accZ = accZ * .015;


            }

            var accSquared2 = accX2 * accX2 + accY2 * accY2 + accZ2 * accZ2;
            if (accSquared2 > speedLimit) {

                accX2 = accX2 * .015;
                accY2 = accY2 * .015;
                accZ2 = accZ2 * .015;
            }

        }


        // Caclulate new velocity
        newX = (this.get(index).get(0) * 1) + accX;
        newY = (this.get(index).get(1) * 1) + accY;
        newZ = (this.get(index).get(2) * 1) + accZ;
        newM = 0;

        newX2 = (this.get(index).get(4) * 1) + accX2;
        newY2 = (this.get(index).get(5) * 1) + accY2;
        newZ2 = (this.get(index).get(6) * 1) + accZ2;


        // intro state speed limit
        if (time < 500) {

            var acs = newX2 * newX2 + newY2 * newY2 + newZ2 * newZ2;
            if (acs > speedLimit) {

                newX2 = newX2 * .15;
                newY2 = newY2 * .15;
                newZ2 = newZ2 * .15;
            }

            var acs2 = newX * newX + newY * newY + newZ * newZ;
            if (acs2 > speedLimit) {

                newX = newX * .15;
                newY = newY * .15;
                newZ = newZ * .15;


            }

        }





        return [newX, newY, newZ, newM, newX2, newY2, newZ2, debug];
    },





    // Self and pos is a flat array of size index*4. An xyzm tuple starts at every 4th index.
    // self is a typed array of lenght numBodies*4, index ranges from 0 to numBodies.
    "bodyVelocityLoopifiedSequential": function bodyVelocityLoopifiedSequential(accell, index, pos, numBodies, deltaTime, epsSqr, time) {

        var newVel;
        var newX, newY, newZ, newM;
        var newX2, newY2, newZ2, newM2;

        var cX = Math.cos(time / 22) * -4200;
        var cY = Math.sin(time / 14) * 9200;
        var cZ = Math.sin(time / 27) * 6000;


        // pull to center
        var maxDistance = 3400;
        var pullStrength = .042;

        var speedLimit = 8;

        // zones
        var zone = 400;
        var repel = 100;
        var align = 300;
        var attract = 100;

        if (time < 500) {

            speedLimit = .01;
            var attractPower = 100.9;
        }
        else {

            speedLimit = .01;
            attractPower = 10.9;
        }


        var zoneSqrd = zone * zone + zone * zone + zone * zone;

        var accX = 0, accY = 0, accZ = 0;
        var accX2 = 0, accY2 = 0, accZ2 = 0;
        var i;

        var debug = 0;

        // define particle 1 center distance
        var dirToCenterX = cX - pos[index * 3 + 0];
        var dirToCenterY = cY - pos[index * 3 + 1];
        var dirToCenterZ = cZ - pos[index * 3 + 2];

        var distanceSquaredTo = dirToCenterX * dirToCenterX + dirToCenterY * dirToCenterY + dirToCenterZ * dirToCenterZ;
        var distToCenter = Math.sqrt(distanceSquaredTo);

        // orient to center
        if (distToCenter > maxDistance) {

            var vel = (distToCenter - maxDistance) * pullStrength;
            if (time < 200)
                vel = .2;
            else vel = (distToCenter - maxDistance) * pullStrength;

            accX += (dirToCenterX / distToCenter) * vel;
            accY += (dirToCenterY / distToCenter) * vel;
            accZ += (dirToCenterZ / distToCenter) * vel;
        }



        for (i = 0; i < numBodies; i = i + 1) {

            // DIRS P1
            var rx = pos[i * 3 + 0] - pos[index * 3 + 0];
            var ry = pos[i * 3 + 1] - pos[index * 3 + 1];
            var rz = pos[i * 3 + 2] - pos[index * 3 + 2];

            var areSame = 0;
            if (pos[i * 3 + 0] == pos[index * 3 + 0] && pos[i * 3 + 1] == pos[index * 3 + 1])
                areSame += 1;

            var distSqrd = rx * rx + ry * ry + rz * rz;

            // cant use eqals to test, only <= or >= WTF
            if (distSqrd < zoneSqrd && areSame <= 0) {


                var length = Math.sqrt(distSqrd);
                var percent = distSqrd / zoneSqrd;


                if (distSqrd < align) { //align

                    var threshDelta = align - repel;
                    var adjustedPercent = (percent - repel) / threshDelta;
                    var Q = (.5 - Math.cos(adjustedPercent * 3.14159265 * 2) * .5 + .5) * 100;


                    // get velocity 2
                    var velX2 = accell[i * 6 + 3];
                    var velY2 = accell[i * 6 + 4];
                    var velZ2 = accell[i * 6 + 5];

                    var velLength2 = Math.sqrt(velX2 * velX2 + velY2 * velY2 + velZ2 * velZ2);

                    // normalize vel2 and multiply by factor
                    velX2 = (velX2 / velLength2) * Q;
                    velY2 = (velY2 / velLength2) * Q;
                    velZ2 = (velZ2 / velLength2) * Q;

                    // get own velocity
                    var velX = accell[i * 6 + 0];
                    var velY = accell[i * 6 + 1];
                    var velZ = accell[i * 6 + 2];

                    var velLength = Math.sqrt(velX * velX + velY * velY + velZ * velZ);

                    // normalize own velocity
                    velX = (velX / velLength) * Q;
                    velY = (velY / velLength) * Q;
                    velZ = (velZ / velLength) * Q;

                    accX += velX2;
                    accY += velY2;
                    accZ += velZ2;

                    accX2 += velX;
                    accY2 += velY;
                    accZ2 += velZ;

                } else {        //attract

                    var threshDelta2 = 1 - align;
                    var adjustedPercent2 = (percent - align) / threshDelta2;
                    var C = (1 - (Math.cos(adjustedPercent2 * 3.14159265 * 2) * 0.5 + 0.5)) * attractPower;

                    // normalize the distance vector
                    var dx = (rx / (length)) * C;
                    var dy = (ry / (length)) * C;
                    var dz = (rz / (length)) * C;

                    debug = 1.1;

                    accX += dx;
                    accY += dy;
                    accZ += dz;

                    accX2 -= dx;
                    accY2 -= dy;
                    accZ2 -= dz;


                }

            }

        }

        // enforce speed limits
        var accSquared = accX * accX + accY * accY + accZ * accZ;
        if (accSquared > speedLimit) {

            accX = accX * .015;
            accY = accY * .015;
            accZ = accZ * .015;
        }

        var accSquared2 = accX2 * accX2 + accY2 * accY2 + accZ2 * accZ2;
        if (accSquared2 > speedLimit) {

            accX2 = accX2 * .015;
            accY2 = accY2 * .015;
            accZ2 = accZ2 * .015;
        }

        // Caclulate new velocity
        newX = accell[index * 6 + 0] + accX;
        newY = accell[index * 6 + 1] + accY;
        newZ = accell[index * 6 + 2] + accZ;


        newX2 = accell[index * 6 + 3] + accX2;
        newY2 = accell[index * 6 + 4] + accY2;
        newZ2 = accell[index * 6 + 5] + accZ2;


        return [newX, newY, newZ, newX2, newY2, newZ2];
    },




    "animateTickSequential": function animateTickSequential() {
        // This is the version that uses typed arrays and for loops in an attempt to 
        // demonstrate best of class with traditional JS.

        if (NBody.private.stop == true) return;


        var i;
        // Reach around the ParallelArray to the data field.
        var newVelPoint; // 6 element array with new velocity
        var newPosPoint; // 3 element array with new position
        var newVelTypedArray = new Float32Array(numBodies * 6);
        var newPosTypedArray = new Float32Array(numBodies * 3);
        // var newPos = new Float32Array(NBody.private.numBodies * 3);

        for (i = 0; i < numBodies; i++) {
            newVelPoint = NBody.bodyVelocityLoopifiedSequential(NBody.private.velTA, i, NBody.private.posTA, numBodies,
                                     NBody.Constant.deltaTime, NBody.Constant.epsSqr, NBody.time);
            newVelTypedArray[i * 6 + 0] = newVelPoint[0];
            newVelTypedArray[i * 6 + 1] = newVelPoint[1];
            newVelTypedArray[i * 6 + 2] = newVelPoint[2];

            newVelTypedArray[i * 6 + 3] = newVelPoint[3];
            newVelTypedArray[i * 6 + 4] = newVelPoint[4];
            newVelTypedArray[i * 6 + 5] = newVelPoint[5];


        }

        for (i = 0; i < numBodies; i++) {
            newPosPoint = NBody.bodyPositionSequential(NBody.private.posTA, i, newVelTypedArray, NBody.private.velTA, NBody.private.width);
            NBody.private.posTA[i * 3 + 0] = newPosPoint[0];
            NBody.private.posTA[i * 3 + 1] = newPosPoint[1];
            NBody.private.posTA[i * 3 + 2] = newPosPoint[2];

        }

        // Slip in and add the new typed arrays.
        // NBody.private.posTA = newPosTypedArray;
        NBody.private.velTA = newVelTypedArray;



        NBody.time++;
    },




    // self is NBody.pos.data or NBody.posTA 
    // self is a typed array of length numBodies*4, index ranges from 0 to numBodies.
    "bodyPositionSequential": function bodyPositionSequential(position, index, newVels, allOldVels, bounds) {
        var x = 0;
        var y = 0;
        var z = 0;



        var velX = newVels[index * 6 + 0];
        var velY = newVels[index * 6 + 1];
        var velZ = newVels[index * 6 + 2];

        var velX2 = newVels[index * 6 + 3];
        var velY2 = newVels[index * 6 + 4];
        var velZ2 = newVels[index * 6 + 5];

        var netX = (velX + velX2);
        var netY = (velY + velY2);
        var netZ = (velZ + velZ2);


        x = position[index * 3 + 0] + netX;
        y = position[index * 3 + 1] + netY;
        z = position[index * 3 + 2] + netZ;


        return [x, y, z];
    },








    "mouseRelease": function mouseRelease(i, j, x, y, z) {
    },

    "mousePressed": function mousePressed(ii, jj, x, y, z) {
    },
    "initPrivate": function initPrivate() {

        this.private.width = 256;
        this.private.setupTime = 0;             // < time taken to setup OpenCL resources and building kernel //
        this.private.kernelTime = 0;            // < time taken to run kernel and read result back //
        this.private.delT = 0.005;              // < dT (timestep) //
        this.private.espSqr = 50.0;             // < Softening Factor//
        this.private.asteroidPos = [];              // < initial position //
        this.private.initPos = [];              // < initial position //
        this.private.initAcc = [];              // < initial position //
        this.private.initVel = [];              // < initial velocity //
        this.private.pos = 0;                   // flat with new body position and mass. 4 elements (x,y,z,mass) repeated N times  //
        this.private.vel = [];                  // < Output velocity //
        this.private.refPos = [];               // < Reference position //
        this.private.refVel = [];               // < Reference velocity //
        this.private.context = 0;               // < CL context //
        this.private.devices = 0;               // < CL device list //
        this.private.updatedPos = 0;            // < Position of partciles //
        this.private.updatedVel = 0;            // < Velocity of partciles //
        this.private.commandQueue = 0;          // < CL command queue //
        this.private.program = 0;               // < CL program //
        this.private.kernel = 0;                // < CL kernel //
        this.private.numBodies = 0;
    },

    "private": {




        "bodies": 1000,
        "width": 256,
        "setupTime": 0,             // < time taken to setup OpenCL resources and building kernel //
        "kernelTime": 0,            // < time taken to run kernel and read result back //
        "delT": 0.005,              // < dT (timestep) //
        "espSqr": 50.0,             // < Softening Factor//
        "asteroidPos": [],          // < initial position  //
        "initAcc": [],              // < initial position //
        "initPos": [],              // < initial position //
        "initVel": [],              // < initial velocity //
        "pos": 0,                   // flat with new body position and mass. 4 elements (x,y,z,mass) repeated N times  //
        "vel": [],                  // < Output velocity //
        "refPos": [],               // < Reference position //
        "refVel": [],               // < Reference velocity //
        "context": 0,               // < CL context //
        "devices": 0,               // < CL device list //
        "updatedPos": 0,            // < Position of partciles //
        "updatedVel": 0,            // < Velocity of partciles //
        "commandQueue": 0,          // < CL command queue //
        "program": 0,               // < CL program //
        "kernel": 0,                // < CL kernel //
        "numBodies": 0
    }
}

