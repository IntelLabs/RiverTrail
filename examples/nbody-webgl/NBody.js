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

"DO NOT use strict";
var NBody = {
    // Constants used below, I'm not yet sure what deltaTime and epsSqr should really be..
    "Constant": {
        "GROUP_SIZE": 5,    // irrelevent since it is due to lack of compiler optimzation reelated to tiling.
        "ITER": 5,
        "deltaTime": 1,     // 0.005 in their code.
        "epsSqr": 50,       // softening factor, when they compute, set to 50. 
        "initialVelocity": 1 // set to 0 to turn off
    },

    "init": function init(canvasWidth, bodies) {
        // lock down state
        document.getElementById("btnNBody").disabled = true;
        document.getElementById("buttonStop").disabled = false;
        document.getElementById('implementation').disabled = true;
        document.getElementById('bodies').disabled = true;

        NBody.private.canvasWidth = canvasWidth;
        var implementation = document.getElementById('implementation').value;
        var c = document.getElementById('webgl-canvas');
        NBody.initPrivate();
        //alert(c.height + ' ' + c.width);
        c.height = NBody.private.canvasWidth;
        c.width = NBody.private.canvasWidth;
        //alert(c.height + ' ' + c.width);
        NBody.private.bodies = parseInt(document.getElementById('bodies').value, 10);
        NBody.private.stop = false;
        NBody.setup(NBody.private.canvasWidth, NBody.private.bodies, implementation); // 
        NBody.display.webGLStart(implementation);
    }, // init called onload

    "stop": function stop() {
        NBody.private.stop = true;
        NBody.display.stopDisplay();
        document.getElementById("btnNBody").disabled = false;
        document.getElementById("buttonStop").disabled = true;
        document.getElementById('implementation').disabled = false;
        document.getElementById('bodies').disabled = false;
    },
    "resetButtons": function resetButtons() {
        document.getElementById("btnNBody").disabled = false;
        document.getElementById("buttonStop").disabled = true;
        document.getElementById('implementation').disabled = false;
        document.getElementById('bodies').disabled = false;
    },

    "animateTick": function animateTick(implementation) {
        // Use the indexedCombine since we need to get the pos and vel out of different arrays.
        // Don't use the OCL version since there is a nested combine in NBody.bodyVelocity.
        if (implementation === "parallel") {
            NBody.animateTickParallel();
            return;
        }
        if (implementation === "sequential") {
            NBody.animateTickSequential();
            return;
        }
        if (implementation === "parallelNoOCL") {
            NBody.animateTickParallelNoOCL();
            return;
        }
    },

    "animateTickParallel": function animateTickParallel() {
        // Use the indexedCombine since we need to get the pos and vel out of different arrays.
        // Don't use the OCL version since there is a nested combine in NBody.bodyVelocity.
        var newVel = NBody.private.vel.combine(1, low_precision(NBody.bodyVelocityLoopified), //Loopified,              // elemental functions
                                     NBody.private.pos, NBody.private.numBodies,
                                     NBody.Constant.deltaTime, NBody.Constant.epsSqr);
        NBody.private.pos = NBody.private.pos.combine(1, low_precision(NBody.bodyPosition), newVel, NBody.private.vel, NBody.private.width);
        NBody.private.vel = newVel;
    },

    "animateTickSequential": function animateTickSequential() {
        // This is the version that uses typed arrays and for loops in an attempt to 
        // demonstrate best of class with traditional JS.
        // console.log("In Sequential");
        var i;
        // Reach around the ParallelArray to the data field.
        var newVelPoint; // 4 element array with new velocity
        var newPosPoint; // 4 element array with new position
        var newVelTypedArray = new Float32Array(NBody.private.numBodies * 4);
        var newPosTypedArray = new Float32Array(NBody.private.numBodies * 4);
        var newPos = new Float32Array(NBody.private.numBodies * 4);

        for (i = 0; i < NBody.private.numBodies; i++) {
            newVelPoint = NBody.bodyVelocityLoopifiedNoThis(NBody.private.velTA, i, NBody.private.posTA, NBody.private.numBodies,
                                     NBody.Constant.deltaTime, NBody.Constant.epsSqr);
            newVelTypedArray[i * 4 + 0] = newVelPoint[0];
            newVelTypedArray[i * 4 + 1] = newVelPoint[1];
            newVelTypedArray[i * 4 + 2] = newVelPoint[2];
            newVelTypedArray[i * 4 + 3] = newVelPoint[3];
        }

        for (i = 0; i < NBody.private.numBodies; i++) {
            newPosPoint = NBody.bodyPositionNoThis(NBody.private.posTA, i, newVelTypedArray, NBody.private.velTA, NBody.private.width);
            newPosTypedArray[i * 4 + 0] = newPosPoint[0];
            newPosTypedArray[i * 4 + 1] = newPosPoint[1];
            newPosTypedArray[i * 4 + 2] = newPosPoint[2];
            newPosTypedArray[i * 4 + 3] = newPosPoint[3];
        }
        // Slip in and add the new typed arrays.
        NBody.private.posTA = newPosTypedArray;
        NBody.private.velTA = newVelTypedArray;
    },

    "animateTickParallelNoOCL": function animateTickParallelNoOCL() {
        // Use the indexedCombine since we need to get the pos and vel out of different arrays.
        // Don't use the OCL version since there is a nested combine in NBody.bodyVelocity.
        // use low_precision(NBody.bodyVelocityLoopified) so we stay in float32
        var newVel = NBody.private.vel.combineSeq(1, NBody.bodyVelocityLoopified, //Loopified,              // elemental functions
                                     NBody.private.pos, NBody.private.numBodies,
                                     NBody.Constant.deltaTime, NBody.Constant.epsSqr);
        NBody.private.pos = NBody.private.pos.combineSeq(1, NBody.bodyPosition, newVel, NBody.private.vel, NBody.private.width);
        NBody.private.vel = newVel;
    },

    // They use width that operates on an indexed space.
    "setup": function setup(canvasWidth, bodies, implementation) {
        var i;
        var j;
        var float32Quad;
        var velStart = 0.0;

        NBody.private.width = canvasWidth;
        NBody.private.numBodies = bodies;
        // Create normal arrays, populat them and then turn them into ParallelArrays.
        NBody.private.initPos = new Array(NBody.private.numBodies);
        NBody.private.initVel = new Array(NBody.private.numBodies);
        NBody.private.initPosTA = new Float32Array(NBody.private.numBodies * 4);
        NBody.private.initVelTA = new Float32Array(NBody.private.numBodies * 4);

        if (implementation === "sequential") {

            // initialization of inputs //
            for (i = 0; i < NBody.private.numBodies; i++) {
                var baseI = i * 4;
                // This is a 1 dimensional array where each 4 elements represent, x, y, z, and mass.
                NBody.private.initPosTA[baseI + 0] = Math.floor(Math.random() * NBody.private.width + 1);     // x
                NBody.private.initPosTA[baseI + 1] = Math.floor(Math.random() * NBody.private.width + 1);          // y
                NBody.private.initPosTA[baseI + 2] = Math.floor(Math.random() * NBody.private.width + 1);          //z but only x and y are plotted.                                     // z
                NBody.private.initPosTA[baseI + 3] = Math.floor((Math.random() * 165) + 1); //165 is great           // mass for 3 use 1000
                NBody.private.initVelTA[baseI + 0] = (Math.random() - 0.5) * NBody.Constant.initialVelocity;
                NBody.private.initVelTA[baseI + 1] = (Math.random() - 0.5) * NBody.Constant.initialVelocity;
                NBody.private.initVelTA[baseI + 2] = (Math.random() - 0.5) * NBody.Constant.initialVelocity;
                NBody.private.initVelTA[baseI + 3] = 0;
            }
            NBody.private.posTA = NBody.private.initPosTA;
            NBody.private.velTA = NBody.private.initVelTA;
        } else {
            // initialization of inputs //
            for (i = 0; i < NBody.private.numBodies; i++) {
                // This is a 1 dimensional array where each 4 elements represent, x, y, z, and mass.
                NBody.private.initPos[i] = new ParallelArray([Math.floor(Math.random() * NBody.private.width + 1),     // x
                                       Math.floor(Math.random() * NBody.private.width + 1),          // y
                                       Math.floor(Math.random() * NBody.private.width + 1),          //z but only x and y are plotted.                                     // z
                                       Math.floor((Math.random() * 165) + 1)]); //165 is great           // mass for 3 use 1000
                NBody.private.initVel[i] = new ParallelArray([(Math.random() - 0.5) * NBody.Constant.initialVelocity,      // x
                                            (Math.random() - 0.5) * NBody.Constant.initialVelocity,          // y
                                            (Math.random() - 0.5) * NBody.Constant.initialVelocity,          // z
                                            0]);        // mass
            }
            NBody.private.pos = new ParallelArray(Float32Array, NBody.private.initPos);
            NBody.private.vel = new ParallelArray(Float32Array, NBody.private.initVel);
        }
        return 1;
    },
    /////////////////////////
    // NBody elemental function.
    ////////////////////////
    // Finally the kernel.s
    //
    // Each work-item invocation of this kernel, calculates the position for 
    // one particle
    //
    /////////////////////////
    // Called using combineSeq
    "calcAcc": function calcAcc(index, myPos, epsSqr) {
        // var result;
        //var otherBodyPos = this.get(index); // You are mapping across all _other_ bodies.
        // Calculate acceleartion caused by particle j on particle i
        //float4 r = localPos[j] - myPos;
        var rx = this.get(index).get(0) - myPos.get(0);
        var ry = this.get(index).get(1) - myPos.get(1);
        var rz = this.get(index).get(2) - myPos.get(2);
        var rm = this.get(index).get(3);
        var distSqr = rx * rx + ry * ry + rz * rz;
        distSqr = distSqr * rm;
        var invDist = 1.0 / Math.sqrt(distSqr + epsSqr);
        var invDistCube = invDist * invDist * invDist;
        var s = this.get(index).get(3) * invDistCube;
        // no mass since acc is independent of mass.
        return [s * rx, s * ry, s * rz, 0];
    },

    "addVelocity": function addVelocity(vec2) {
        return new ParallelArray([this.get(0) + vec2.get(0),
            this.get(1) + vec2.get(1), this.get(2) + vec2.get(2), 0]);
    },

    // We split this into 2 pieces, the first calculates the new velocity of the body, the second one
    // calculates the new position.
    // This algebra is amazing - A. Capp.

    "bodyVelocity": function bodyVelocity(index, pos, numBodies, deltaTime, epsSqr) {
        var vel = this;
        var newVel;
        var myPos = pos.get(index);
        var newX, newY, newZ, newM;
        // calculate acceleration effect due to each body
        // a[i->j] = m[j] * r[i->j] / (r^2 + epsSqr)^(3/2)
        var j;
        // Get a Parallel Array of contributing attractions.

        var accComponents = pos.combine(1, NBody.calcAcc, myPos, epsSqr);
        // Reduce to a single attraction.
        var acc = accComponents.reduce(NBody.addVelocity);

        // Caclulate new velocity
        newX = vel.get(index).get(0) + acc.get(0) * deltaTime;
        newY = vel.get(index).get(1) + acc.get(1) * deltaTime;
        newZ = vel.get(index).get(2) + acc.get(2) * deltaTime;
        newM = 0;
        var dampenVel = false; // Set to true if you want to set a speed limit on the particles.
        if (dampenVel) {
            // clamp between -5 and 5.
            newX = (newX > 5) ? 5 : (newX < -5) ? -5 : newX;
            newY = (newY > 5) ? 5 : (newY < -5) ? -5 : newY;
            newZ = (newZ > 5) ? 5 : (newZ < -5) ? -5 : newZ;
        }
        newVel = new ParallelArray([newX, newY, newZ, newM]);
        // Return a negative velocity. 
        return newVel;
    },

    "bodyVelocityLoopified": function bodyVelocityLoopified(index, pos, numBodies, deltaTime, epsSqr) {
        var newVel;
        var newX, newY, newZ, newM;
        // calculate acceleration effect due to each body
        // a[i->j] = m[j] * r[i->j] / (r^2 + epsSqr)^(3/2)
        // Get a Parallel Array of contributing attractions.

        var accX = 0, accY = 0, accZ = 0;
        var i;
        var shape = this.getShape()[0];
        // for (i = 0; i < numBodies; i++) { // post decrement doesn't work for floats/doubles in C99, hack until we know i is an int.
        for (i = 0; i < shape; i= i + 1) {
            var rx = pos.get(i).get(0) - pos.get(index).get(0);
            var ry = pos.get(i).get(1) - pos.get(index).get(1);
            var rz = pos.get(i).get(2) - pos.get(index).get(2);
            var rm = pos.get(i).get(3) * 1.0;
            // float distSqr = r.x * r.x  +  r.y * r.y  +  r.z * r.z;
            var distSqr = rx * rx + ry * ry + rz * rz;
            distSqr = distSqr * rm;
            // float invDist = 1.0f / sqrt(distSqr + epsSqr);
            var invDist = 1.0 / Math.sqrt(distSqr + epsSqr);
            // float invDistCube = invDist * invDist * invDist;
            var invDistCube = invDist * invDist * invDist;
            // float s = localPos[j].w * invDistCube;
            var s = pos.get(i).get(3) * invDistCube;
            // result = [s * rx, s * ry, s * rz, 0]; // no mass since acc is independent of mass.
            accX += s * rx;
            accY += s * ry;
            accZ += s * rz;
        }

        // Calculate new velocity
        newX = (this.get(index).get(0) + accX * deltaTime);
        //if ((accX * deltaTime) == 0.0) {
        //    newX = this.get(index).get(0);
        //}
        newY = (this.get(index).get(1) + accY * deltaTime);
        //if (newY == 0.0) {
        //    newY = this.get(index).get(1);
        //}
        newZ = (this.get(index).get(2) + accZ * deltaTime);
        newM = 0;
        /*
        var dampenVel = false; // Set to true if you want to set a speed limit on the particles.
        if (dampenVel) {
        // clamp between -5 and 5.
        newX = (newX > 5) ? 5 : newX;
        newX = (newX < -5) ? -5 : newX;
        newY = (newY > 5) ? 5 : newY;
        newY = (newY < -5) ? -5 : newY;
        newZ = (newZ > 5) ? 5 : newZ;
        newZ = (newZ < -5) ? -5 : newZ;
        }
        */


        return [newX, newY, newZ, newM];
    },

    "bodyVelocityLoopifiedxx": function bodyVelocityLoopifiedxx(index, pos, numBodies, deltaTime, epsSqr) {
        var newVel;
        var newX, newY, newZ, newM;
        // calculate acceleration effect due to each body
        // a[i->j] = m[j] * r[i->j] / (r^2 + epsSqr)^(3/2)
        // Get a Parallel Array of contributing attractions.

        var accX = 0, accY = 0, accZ = 0;
        var i;
        // for (i = 0; i < numBodies; i++) { // post decrement doesn't work for floats/doubles in C99, hack until we know i is an int.
        for (i = 0; i < numBodies; i++) {
            var rx = pos.get(i).get(0) - pos.get(index).get(0);
            var ry = pos.get(i).get(1) - pos.get(index).get(1);
            var rz = pos.get(i).get(2) - pos.get(index).get(2);
            var rm = pos.get(i).get(3) * 1.0; // force to a double with this * 1.0
            // float distSqr = r.x * r.x  +  r.y * r.y  +  r.z * r.z;
            var distSqr = rx * rx + ry * ry + rz * rz;
            distSqr = distSqr * rm;
            // float invDist = 1.0f / sqrt(distSqr + epsSqr);
            var invDist = 1.0 / Math.sqrt(distSqr + epsSqr);
            // float invDistCube = invDist * invDist * invDist;
            var invDistCube = invDist * invDist * invDist;
            // float s = localPos[j].w * invDistCube;
            var s = pos.get(i).get(3) * invDistCube;
            // result = [s * rx, s * ry, s * rz, 0]; // no mass since acc is independent of mass.
            accX += s * rx;
            accY += s * ry;
            accZ += s * rz;
        }

        // Caclulate new velocity
        newX = (this.get(index).get(0) + accX * deltaTime);
        newY = (this.get(index).get(1) + accY * deltaTime);
        newZ = (this.get(index).get(2) + accZ * deltaTime);
        newM = 0;

        var dampenVel = false; // Set to true if you want to set a speed limit on the particles.
        if (dampenVel) {
            if (newX > 5) {
                newX = 5;
            } else if (newX < -5) {
                newX = -5;
            }

            if (newY > 5) {
                newY = 5;
            } else if (newY < -5) {
                newY = -5;
            }

            if (newZ > 5) {
                newZ = 5;
            } else if (newZ < -5) {
                newZ = -5;
            }
        }

        return [newX, newY, newZ, newM];
    },

    // Self and pos is a flat array of size index*4. An xyzm tuple starts at every 4th index.
    // self is a typed array of lenght numBodies*4, index ranges from 0 to numBodies.
    "bodyVelocityLoopifiedNoThis": function bodyVelocityLoopifiedNoThis(self, index, pos, numBodies, deltaTime, epsSqr) {
        var newVel;
        var newX, newY, newZ, newM;
        // calculate acceleration effect due to each body
        // a[i->j] = m[j] * r[i->j] / (r^2 + epsSqr)^(3/2)
        // Get a Parallel Array of contributing attractions.

        var accX = 0, accY = 0, accZ = 0;
        var i;
        var baseIndex = index * 4;
        for (i = 0; i < numBodies; i = i + 4) {
            var rx = pos[i + 0] - pos[baseIndex + 0];
            var ry = pos[i + 1] - pos[baseIndex + 1];
            var rz = pos[i + 2] - pos[baseIndex + 2];
            var rm = pos[i + 3];

            //            var rx = pos.get(i).get(0) - pos.get(index).get(0);
            //            var ry = pos.get(i).get(1) - pos.get(index).get(1);
            //            var rz = pos.get(i).get(2) - pos.get(index).get(2);
            //            var rm = pos.get(i).get(3);
            // float distSqr = r.x * r.x  +  r.y * r.y  +  r.z * r.z;
            var distSqr = rx * rx + ry * ry + rz * rz;
            distSqr = distSqr * rm;
            // float invDist = 1.0f / sqrt(distSqr + epsSqr);
            var invDist = 1.0 / Math.sqrt(distSqr + epsSqr);
            // float invDistCube = invDist * invDist * invDist;
            var invDistCube = invDist * invDist * invDist;
            // float s = localPos[j].w * invDistCube;
            var s = pos[i + 3] * invDistCube;
            // result = [s * rx, s * ry, s * rz, 0]; // no mass since acc is independent of mass.
            accX += s * rx;
            accY += s * ry;
            accZ += s * rz;
        }

        // Caclulate new velocity
        newX = (self[baseIndex + 0] + accX * deltaTime);
        newY = (self[baseIndex + 1] + accY * deltaTime);
        newZ = (self[baseIndex + 2] + accZ * deltaTime);
        newM = 0;
        /*
        var dampenVel = false; // Set to true if you want to set a speed limit on the particles.
        if (dampenVel) {
        // clamp between -5 and 5.
        newX = (newX > 5) ? 5 : newX;
        newX = (newX < -5) ? -5 : newX;
        newY = (newY > 5) ? 5 : newY;
        newY = (newY < -5) ? -5 : newY;
        newZ = (newZ > 5) ? 5 : newZ;
        newZ = (newZ < -5) ? -5 : newZ;
        }
        */

        var dampenVel = false; // Set to true if you want to set a speed limit on the particles.
        if (dampenVel) {
            if (newX > 5) {
                newX = 5;
            } else if (newX < -5) {
                newX = -5;
            }

            if (newY > 5) {
                newY = 5;
            } else if (newY < -5) {
                newY = -5;
            }

            if (newZ > 5) {
                newZ = 5;
            } else if (newZ < -5) {
                newZ = -5;
            }
        }

        return [newX, newY, newZ, newM];
    },
    // Adjust position based on average of new and old velocity.
    // Called using combineSeq

    "bodyPositionOrig": function bodyPositionOrig(index, allVels, allOldVels, bounds) {
        var x = 0;
        var y = 0;
        var z = 0;
        var m = 0;
        var pos = this.get(index);
        var vel = allVels.get(index);
        var oldVel = allOldVels.get(index);
        //var newPos;
        // Put deltaT back in.
        /*        
        newPos.x = ((400 + pos.x + (vel.x + oldVel.x)/2)) % 400;        
        newPos.y = ((400 + pos.y + (vel.y + oldVel.y)/2)) % 400;
        newPos.z = ((400 + pos.z + (vel.z + oldVel.z)/2)) % 400;
        */
        x = ((pos.get(0) + (vel.get(0) + oldVel.get(0)) / 2));
        x = (x + bounds) % bounds;
        y = ((pos.get(1) + (vel.get(1) + oldVel.get(1)) / 2));
        y = (y + bounds) % bounds;
        z = ((pos.get(2) + (vel.get(2) + oldVel.get(2)) / 2));
        z = (z + bounds) % bounds;
        m = pos.get(3);
        //507 
        return [x, y, z, m];
        //        newPos = new ParallelArray([x, y, z, m]);
        //        return newPos;
    },

    "bodyPosition": function bodyPosition(index, allVels, allOldVels, bounds) {
        var x = 0;
        var y = 0;
        var z = 0;
        var m = 0;
        //var pos = this.get(index);
        //var vel = allVels.get(index);
        //var oldVel = allOldVels.get(index);
        //var newPos;
        // Put deltaT back in.
        /*        
        newPos.x = ((400 + pos.x + (vel.x + oldVel.x)/2)) % 400;        
        newPos.y = ((400 + pos.y + (vel.y + oldVel.y)/2)) % 400;
        newPos.z = ((400 + pos.z + (vel.z + oldVel.z)/2)) % 400;
        */
        x = ((this.get(index).get(0) + (allVels.get(index).get(0) + allOldVels.get(index).get(0)) / 2));

        // x = (x + bounds) % bounds;
        y = ((this.get(index).get(1) + (allVels.get(index).get(1) + allOldVels.get(index).get(1)) / 2));

        z = ((this.get(index).get(2) + (allVels.get(index).get(2) + allOldVels.get(index).get(2)) / 2));

        m = this.get(index).get(3);

        return [x, y, z, m];
        //        newPos = new ParallelArray([x, y, z, m]);
        //        return newPos;
    },

    "bodyPositionWithBounds": function bodyPositionWithBonds(index, allVels, allOldVels, bounds) {
        var x = 0;
        var y = 0;
        var z = 0;
        var m = 0;
        //var pos = this.get(index);
        //var vel = allVels.get(index);
        //var oldVel = allOldVels.get(index);
        //var newPos;
        // Put deltaT back in.
        /*        
        newPos.x = ((400 + pos.x + (vel.x + oldVel.x)/2)) % 400;        
        newPos.y = ((400 + pos.y + (vel.y + oldVel.y)/2)) % 400;
        newPos.z = ((400 + pos.z + (vel.z + oldVel.z)/2)) % 400;
        */
        var outOfBounds = false;
        x = ((this.get(index).get(0) + (allVels.get(index).get(0) + allOldVels.get(index).get(0)) / 2));
        if (x > bounds) {
            // x = bounds * 2 - x;
            outOfBounds = true;
        }
        if (x < -bounds) {
            // x = -bounds * 2 - x;
            outOfBounds = true;
        }
        // x = (x + bounds) % bounds;
        y = ((this.get(index).get(1) + (allVels.get(index).get(1) + allOldVels.get(index).get(1)) / 2));
        //y = (y + bounds) % bounds;
        if (y > bounds) {
            // y = bounds * 2 - y;
            outOfBounds = true;
        }
        if (y < -bounds) {
            // y = -bounds * 2 - y;
            outOfBounds = true;
        }
        z = ((this.get(index).get(2) + (allVels.get(index).get(2) + allOldVels.get(index).get(2)) / 2));
        //z = (z + bounds) % bounds;
        if (z > bounds) {
            // z = bounds * 2 - y;
            outOfBounds = true;
        }
        if (z < -bounds) {
            // z = -bounds * 2 - y;
            outOfBounds = true;
        }
        m = this.get(index).get(3);
        if (outOfBounds) {
            // return [bounds / 2, bounds / 2, bounds / 2, m];
        }
        return [x, y, z, m];
        //        newPos = new ParallelArray([x, y, z, m]);
        //        return newPos;
    },
    // self is NBody.pos.data or NBody.posTA 
    // self is a typed array of length numBodies*4, index ranges from 0 to numBodies.
    "bodyPositionNoThis": function bodyPositionNoThis(self, index, allVelsTA, allOldVelsTA, bounds) {
        var x = 0;
        var y = 0;
        var z = 0;
        var m = 0;
        //var pos = this.get(index);
        //var vel = allVels.get(index);
        //var oldVel = allOldVels.get(index);
        //var newPos;
        // Put deltaT back in.
        /*        
        newPos.x = ((400 + pos.x + (vel.x + oldVel.x)/2)) % 400;        
        newPos.y = ((400 + pos.y + (vel.y + oldVel.y)/2)) % 400;
        newPos.z = ((400 + pos.z + (vel.z + oldVel.z)/2)) % 400;
        */
        var baseIndex = index * 4;
        var outOfBounds = false;
        x = ((self[baseIndex + 0] + (allVelsTA[baseIndex + 0] + allOldVelsTA[baseIndex + 0]) / 2));
        if (x > bounds) {
            // x = bounds * 2 - x;
            outOfBounds = true;
        }
        if (x < -bounds) {
            // x = -bounds * 2 - x;
            outOfBounds = true;
        }
        // x = (x + bounds) % bounds;
        y = ((self[baseIndex + 1] + (allVelsTA[baseIndex + 1] + allOldVelsTA[baseIndex + 1]) / 2));
        //y = (y + bounds) % bounds;
        if (y > bounds) {
            // y = bounds * 2 - y;
            outOfBounds = true;
        }
        if (y < -bounds) {
            // y = -bounds * 2 - y;
            outOfBounds = true;
        }
        z = ((self[baseIndex + 2] + (allVelsTA[baseIndex + 2] + allOldVelsTA[baseIndex + 2]) / 2));
        //z = (z + bounds) % bounds;
        if (z > bounds) {
            // z = bounds * 2 - y;
            outOfBounds = true;
        }
        if (z < -bounds) {
            // z = -bounds * 2 - y;
            outOfBounds = true;
        }
        m = self[baseIndex + 3];
        if (outOfBounds) {
            // return [bounds / 2, bounds / 2, bounds / 2, m];
        }
        return [x, y, z, m];
        //        newPos = new ParallelArray([x, y, z, m]);
        //        return newPos;
    },


    "mouseRelease": function mouseRelease(i, j, x, y, z) {
    },

    "mousePressed": function mousePressed(ii, jj, x, y, z) {
    },
    "initPrivate": function initPrivate() {
        this.private.canvasWidth = 800;
        this.private.bodies = 1000;
        this.private.width = 256;
        this.private.setupTime = 0;             // < time taken to setup OpenCL resources and building kernel //
        this.private.kernelTime = 0;            // < time taken to run kernel and read result back //
        this.private.delT = 0.005;              // < dT (timestep) //
        this.private.espSqr = 50.0;             // < Softening Factor//
        this.private.initPos = [];              // < initial position //
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
        "canvasWidth": 800,
        "bodies": 1000,
        "width": 256,
        "setupTime": 0,             // < time taken to setup OpenCL resources and building kernel //
        "kernelTime": 0,            // < time taken to run kernel and read result back //
        "delT": 0.005,              // < dT (timestep) //
        "espSqr": 50.0,             // < Softening Factor//
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

