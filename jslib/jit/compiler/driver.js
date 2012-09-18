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

"use strict";
//
// Create top level compiler object
//

// This pattern is used when we want to hide internal detail and have only one such variable.
// It basically hides everything in the local scope of the function, executes the function and
// returns only the external needed outside of the function.

if (RiverTrail === undefined) {
    var RiverTrail = {};
}

RiverTrail.compiler = (function () {
    // This is the compiler driver proper. 
    
    // The ast is opaque at this point so the Narcissus constants aren't needed.
    var inferPAType = RiverTrail.Helper.inferPAType;
    
    // whether to use kernel caching or not
    var useKernelCaching = true;
    // whether to cache OpenCL buffers
    var useBufferCaching = true;

    var suppressOpenCL = false;

    var openCLContext; 
    var dpoInterface; 
    var dpoPlatform;
    try {
        dpoInterface = new DPOInterface();
        dpoPlatform = dpoInterface.getPlatform(); 
        openCLContext = dpoPlatform.createContext();
    } catch (e) {
        console.log ("Cannot initialise OpenCL interface. Please check the whether the extension was installed and try again.");
        throw Error("Cannot initialise OpenCL Interface: " + JSON.stringify(e));
    }

    // check whether we have the right version of the extension; as the user has some extension installed, he probably wants to use
    // the right one for this library, so we alert him
    if (dpoInterface.version !== 2) {
        alert("This webpage requires a newer version of the RiverTrail Firefox extension. Please visit http://github.com/rivertrail/rivertrail/downloads.");
        throw Error("RiverTrail extension out of date");
    }

    // main hook to start the compilation/execution process for running a construct using OpenCL
    // paSource -> 'this' inside kernel
    // f -> function to run
    // construct -> [combine|map|comprehension|comprehensionScalar]
    // rankOrShape -> either rank of iterationspace or in case of comprehension and comprehensionScalar the shape of the iterationspace
    // args -> additional arguments to the kernel
    var compileAndGo = function compileAndGo (paSource, f, construct, rankOrShape, args, enable64BitFloatingPoint) {
        var paResult = null;
        var kernelString;
        var lowPrecision;
        var ast;
        var i;
        // If f is a low_precision wrapped function, unwrap it first
        if (f instanceof low_precision.wrapper) {
            lowPrecision = true;
            f = f.unwrap();
        } else {
            lowPrecision = !enable64BitFloatingPoint;
        }
        var defaultNumberType = lowPrecision ? "float": "double";

        // First convert all array arguments into suitable flat representations that can be passed to
        // the OpenCL side

        args = Array.prototype.map.call(args, 
                                     function (object) {
                                         if (object instanceof Array) {
                                             if ((typeof(openCLContext.canBeMapped) === 'function') && (openCLContext.canBeMapped(object))) {
                                                 // we have found a JavaScript array that can be directly mapped, so we keep it
                                                 return object;
                                             } else {
                                                 return new RiverTrail.Helper.FlatArray( lowPrecision ? Float32Array : Float64Array, object);
                                             }
                                         } else {
                                             return object;
                                         }});

        var argumentTypes = constructArgTypes(construct, args, rankOrShape, defaultNumberType);

        if (f.openCLCache !== undefined) {
            if (useKernelCaching) {
                var cacheEntry = getCacheEntry(f, construct, paSource, argumentTypes, lowPrecision, rankOrShape);
                // try and find a matching kernel from previous runs
                if (cacheEntry != null) {
                    paResult = RiverTrail.compiler.runOCL(paSource, cacheEntry.kernel, cacheEntry.ast, f, 
                                      construct, rankOrShape, args, argumentTypes, lowPrecision, 
                                      enable64BitFloatingPoint, useBufferCaching, useKernelCaching);
                    return paResult;
                }
            } else {
                // remove cache 
                f.openCLCache = undefined;
            }
        } 
        //
        // NOTE: we only get here if caching has failed!
        // We need to pass in argumentTypes.
        //
        if (useKernelCaching && (f.openCLCache === undefined)) {
            // create empty cache
            f.openCLCache = [];
        }
                        
        try {
            ast = parse(paSource, construct, rankOrShape, f.toString(), args, lowPrecision); // parse, no code gen
            kernelString = RiverTrail.compiler.codeGen.compile(ast, paSource, rankOrShape, construct); // Creates an OpenCL kernel function
        } catch (e) {
            RiverTrail.Helper.debugThrow(e);
        }
        
        if (RiverTrail.compiler.verboseDebug) {    
            console.log("::parseGenRunOCL:kernelString: ", kernelString);
            console.log("::parseGenRunOCL:args: ", JSON.stringify(args));
        }

        if (suppressOpenCL) {
            console.log("Not executing OpenCL returning 'this' parseGenRunOCL:surpressOpenCL: ", suppressOpenCL);
            paResult = this;
        } else {
            // what arg should be used, args seems correct.?
            try {
                paResult = RiverTrail.compiler.runOCL(paSource, kernelString, ast, f, construct, rankOrShape, args, 
                                                argumentTypes, lowPrecision, enable64BitFloatingPoint, useBufferCaching, useKernelCaching);
            } catch (e) {
                try {
                    RiverTrail.Helper.debugThrow(e + RiverTrail.compiler.openCLContext.buildLog);
                } catch (e2) {
                    RiverTrail.Helper.debugThrow(e); // ignore e2. If buildlog throws, there simply is none.
                }
            }
        }
        // NOTE: Do not add general code here. This is not the only exit from this function!
        return paResult;
    };

    //
    // Driver method to steer compilation process
    //
    function parse(paSource, construct, rankOrShape, kernel, args, lowPrecision) {
        var ast = RiverTrail.Helper.parseFunction(kernel);
        var rank = rankOrShape.length || rankOrShape;
        try {
            RiverTrail.Typeinference.analyze(ast, paSource, construct, rank, args, lowPrecision);
            RiverTrail.RangeAnalysis.analyze(ast, paSource, construct, rankOrShape, args);
            RiverTrail.RangeAnalysis.propagate(ast);
            RiverTrail.InferBlockFlow.infer(ast);
            RiverTrail.InferMem.infer(ast);
        } catch (e) {
            RiverTrail.Helper.debugThrow(e);
        }
        return ast;
    }
    
    var getCacheEntry = function (f, construct, paSource, argumentTypes, lowPrecision, rankOrShape) {
        var argumentMatches = function (argTypeA, argTypeB) {
            return ((argTypeA.inferredType === argTypeB.inferredType) &&
                    equalsShape(argTypeA.dimSize, argTypeB.dimSize));
        };
        var argumentsMatch = function (argTypesA, argTypesB) {
            if (argTypesA.length !== argTypesB.length) return false;
            return argTypesA.every(function (eA, idx) { return argumentMatches(eA, argTypesB[idx]); });
        };
        var i;
        var entry;
        // try and find a matching kernel from previous runs
        for (i = 0; i < f.openCLCache.length; i++) {
            entry = f.openCLCache[i];
            if ((construct === entry.construct) &&
                (lowPrecision === entry.lowPrecision) &&
                (entry.source === f) &&
                argumentsMatch(argumentTypes, entry.argumentTypes) &&
                (((construct !== "comprehension") && (construct !== "comprehensionScalar") && argumentMatches(RiverTrail.Helper.inferPAType(paSource), entry.paType)) || equalsShape(rankOrShape, entry.iterSpace))
               ) {
                return f.openCLCache[i];
            }
        }
        return null;
    };

    var constructArgTypes = function (construct, args, rankOrShape, defaultNumberType) {
        var argumentTypes = [];
        var i;
        if (construct == "combine") {
            // the kernel is called with an index as first argument, which has type int [rankOrShape]
            // and an extra isIndex attribute to differentiate it from the rest
            argumentTypes.push({ inferredType: "int", dimSize: [rankOrShape], attributes: { isIndex: true} });
        } else if (construct == "comprehension") {
            // the kernel is called with an index as first argument, which has type int[rankOrShape.length]
            // and an extra isIndex attribute to differentiate it from the rest
            argumentTypes.push({ inferredType: "int", dimSize: [rankOrShape.length], attributes: { isIndex: true} });
        } else if (construct == "comprehensionScalar") {
            // the kernel is called with an index as first argument, which has type int
            // and an extra isIndex attribute to differentiate it from the rest
            argumentTypes.push({ inferredType: "int", dimSize: [], attributes: { isIndex: true} });
        }

        //
        // Push the types for all other arguments
        // This simple iterates through the array in order, pushing the types.
        //

        for (i = 0; i < args.length; i++) {
            var argument = args[i];
            if (argument instanceof ParallelArray) {
                argumentTypes.push(inferPAType(argument));
            } else if (argument instanceof RiverTrail.Helper.FlatArray) {
                argumentTypes.push({ inferredType: defaultNumberType, dimSize: argument.shape});
            } else if (argument instanceof Array) {
                // SAH: if an array makes it here without being transformed into a flat array, it
                //      must be a dense, homogeneous JavaScript array. Those are always double arrays
                //      and we assume the shape can be derived by looking at the first element in
                //      each dimension.
                // NOTE: I use /* jsval */ double as type to make sure these are not confused with 
                //       ordinary arrays when checking for matching signatures.
                argumentTypes.push({ inferredType: "/* jsval */ double", dimSize: function makeShape(a, r) { if (a instanceof Array) { r.push(a.length); makeShape(a[0], r); } return r;}(argument, []) });
            } else if (RiverTrail.Helper.isTypedArray(argument)) {
                argumentTypes.push({ inferredType: RiverTrail.Helper.inferTypedArrayType(argument), dimSize: [argument.length] });
            } else if (argument instanceof RiverTrail.Helper.Integer) {
                // These are special integer values used for offsets and the like. 
                argumentTypes.push({ inferredType: "int", dimSize: [] });
            } else if (typeof (argument) === "number") {
                // scalar values are treated as floats
                argumentTypes.push({ inferredType: defaultNumberType, dimSize: [] });
            } else if (argument instanceof Number) {
                // numbers are floats
                argumentTypes.push({ inferredType: defaultNumberType, dimSize: [] });
            } else {
                throw new Error("Type derivation for argument not implemented yet");
            }
        }
        return argumentTypes;
    };
    function astTypeConverter (key, value) {
        if (key === 'type' && (typeof value === 'number') ) { 
            if (opTypeNames[tokens[value]]) {
                return opTypeNames[tokens[value]];
            }
            // only do numbers since JSON recurses on returned value.
            return tokens[value];
        }
        if (key === 'tokenizer'  ) {
            return '-- hidden --';
        }
        if (key === 'flowTo') {
            return '-- cyclic --';
        }
        return value;
    }   

    //
    // Method to dump the current ast
    //
    function dumpAst(ast) {
        if (RiverTrail.compiler.verboseDebug) {
            console.log(JSON.stringify(ast, astTypeConverter));
        }
        if (RiverTrail.compiler.debug) {
            console.log(RiverTrail.Helper.wrappedPP(ast));
        }
    }
    
    var equalsShape = function equalsShape (shapeA, shapeB) {
        return ((shapeA.length == shapeB.length) &&
                Array.prototype.every.call(shapeA, function (a,idx) { return a == shapeB[idx];}));
    };
    
// end code from parallel array
    return {
        verboseDebug: false,
        debug: false,
        compileAndGo: compileAndGo,
        openCLContext: openCLContext
    };
}());

