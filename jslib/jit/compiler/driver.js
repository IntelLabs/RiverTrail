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

    const suppressOpenCL = false;

    var openCLContext; 
    var dpoInterface; 
    var dpoPlatform;
    try {
        dpoInterface = new DPOInterface();
        dpoPlatform = dpoInterface.getPlatform(); 
        openCLContext = dpoPlatform.createContext();
    } catch (e) {
        console.log ("Cannot initialise OpenCL interface. Please check the extension's options and try again.");
        throw Error("Cannot initialise OpenCL Interface: " + JSON.stringify(e));
    }

    // main hook to start the compilation/execution process for running a construct using OpenCL
    // paSource -> 'this' inside kernel
    // f -> function to run
    // construct -> [combine|combineN|map|comprehension]
    // rankOrShape -> either rank of iterationspace or in case of comprehension the shape of the iterationspace
    // args -> additional arguments to the kernel
    var compileAndGo = function compileAndGo (paSource, f, construct, rankOrShape, args, enable64BitFloatingPoint) {
        var paResult = null;
        var kernelString;
        var lowPrecision;
        var ast;
        var rawArgs = args;
        var i;
        // If f is a low_precision wrapped function, unwrap it first
        if (f instanceof low_precision.wrapper) {
            lowPrecision = true;
            f = f.unwrap();
        } else {
            lowPrecision = !enable64BitFloatingPoint;
        }
        const defaultNumberType = lowPrecision ? "float": "double";

        // First convert all arguments to ParallelArray representation. As we need to have shape and type
        // information anyhow, this has little overhead to only converting the data to a typed array.
        // I use the prototype here as args might not be a real array.

        args = Array.prototype.map.call(args, 
                                     function (object) {
                                         if (object instanceof ParallelArray) {
                                             return object;
                                         } else if (object instanceof Array) {
                                             var result = new ParallelArray( lowPrecision ? Float32Array : Float64Array, object);
                                             result._wasArray = true;
                                             return result;
                                         } else if (isTypedArray(object)) {
                                             var result = new ParallelArray( object);
                                             result._wasArray = true;
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
            ast = parse(paSource, construct, rankOrShape.length || rankOrShape, f.toString(), rawArgs, lowPrecision); // parse, no code gen
            kernelString = RiverTrail.compiler.codeGen(ast, paSource, rankOrShape, construct); // Creates an OpenCL kernel function
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
                    RiverTrail.Helper.debugThrow(e + e2);
                }
            }
        }
        // NOTE: Do not add general code here. This is not the only exit from this function!
        return paResult;
    };

    //
    // Driver method to steer compilation process
    //
    function parse(paSource, construct, rank, kernel, args, lowPrecision) {
        var parser = Narcissus.parser;
        var kernelJS = kernel.toString();
        var ast = parser.parse(kernelJS);        
        try {
            RiverTrail.Typeinference.analyze(ast.children[0], paSource, construct, rank, args, lowPrecision);
            RiverTrail.RangeAnalysis.analyze(ast.children[0], paSource, construct, rank, args);
            RiverTrail.RangeAnalysis.propagate(ast.children[0]);
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
                ((construct === "comprehension") && (rankOrShape = entry.iterSpace) ||
                  argumentMatches(RiverTrail.Helper.inferPAType(paSource), entry.paType)
                )
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
            // the kernel is called with an index as first argument, which has type int []
            // and an extra isIndex attribute to differentiate it from the rest
            argumentTypes.push({ inferredType: "int", dimSize: [], attributes: { isIndex: true} });
        } else if (construct == "combineN") {
            // the kernel is called with an index as first argument, which has type int [rankOrShape]
            // and an extra isIndex attribute to differentiate it from the rest
            argumentTypes.push({ inferredType: "int", dimSize: [rankOrShape], attributes: { isIndex: true} });
        } else if (construct == "comprehension") {
            // the kernel is called with an index as first argument, which has type int[rankOrShape.length]
            // and an extra isIndex attribute to differentiate it from the rest
            argumentTypes.push({ inferredType: "int", dimSize: [rankOrShape.length], attributes: { isIndex: true} });
        }

        //
        // Push the types for all other arguments
        // This simple iterates through the array in order, pushing the types.
        //

        for (i = 0; i < args.length; i++) {
            var argument = args[i];
            if (argument instanceof ParallelArray) {
                argumentTypes.push(inferPAType(argument));
            } else if (argument instanceof Array) {
                // SAH: treating all non-PA arrays as float requires a check for regularity and 
                //      homogeneity! This is done in the transfer code.
                argumentTypes.push({ inferredType: defaultNumberType, dimSize: [argument.length] });
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
                console.log("parseGenRun:482 argument:", argument, " argTypes: ", argTypes);
                throw new CompilerBug("parseGenRun:482 - type derivation for argument not implemented yet");
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
        if ((key === 'flowTo') || (key === 'flowFrom')) {
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
    
    // This is used to check whether an object is a typed array. On first invocation, this
    // method specialises itself depending on whether the browser supports typed arrays or not.
    var isTypedArray = function isTypedArray(arr) {
        if ((typeof(Float32Array) == "function") && (typeof(Float32Array.prototype) == "object")) {
            ParallelArray.prototype.isTypedArray = function (arr) {
                return ((arr instanceof Float32Array) || (arr instanceof Float64Array) ||
                        (arr instanceof Int8Array) || (arr instanceof Int16Array) ||
                        (arr instanceof Int32Array) || (arr instanceof Uint8Array) ||
                        (arr instanceof Uint16Array) || (arr instanceof Uint32Array) ||
                        ((typeof(Uint8ClampedArray) == "function") && (arr instanceof Uint8ClampedArray)));
            };
        } else {
            ParallelArray.prototype.isTypedArray = function( arr) {
                return false;
            }
        }
        return ParallelArray.prototype.isTypedArray(arr);
    };
    

    var equalsShape = function equalsShape (shapeA, shapeB) {
        return ((shapeA.length == shapeB.length) &&
                Array.prototype.every.call(shapeA, function (a,idx) { return a == shapeB[idx];}));
    };
    
    // I create three names for Error here so that we can, should we ever wish
    // distinguish both or have our own implementation for exceptions
    var errorHelper = function errorHelper(e) {
        throw (e);
    };

    var CompilerError = errorHelper;
    var CompilerBug = errorHelper;     // something went wrong although it should not
    var CompilerAbort = errorHelper;   // exception thrown to influence control flow, e.g., misspeculation

// end code from parallel array
    return {
        verboseDebug: false,
        debug: false,
        compileAndGo: compileAndGo,
        openCLContext: openCLContext
    };
}());

