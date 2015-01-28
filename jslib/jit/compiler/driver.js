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
    // whether to specialize kernels up to values for frequent arguments
    var useValueSpec = true;
    // how many different values to track for specialisation before falling back to megamorphic
    var polymorphLimit = 2;
    // how recently active does this spec need to be
    var specDepth = 1;
    // how long to watch for values before starting to specialize
    var specWarmUp = 2;
    // max size of value to specialize for
    var maxValSpecLen = 16;
    // whether to cache OpenCL buffers
    var useBufferCaching = true;

    var suppressOpenCL = false;

    var reportVectorized = false;

    // Create an OpenCL context on the extension side.
    RiverTrail.runtime.initContext();

    var isTypedArray = RiverTrail.Helper.isTypedArray;

    var equalsSpecValue = function equalsSpecValue(a,b) {
        var l,r;
        // both might be null
        if (a === b) 
            return true;
        // or just one is null
        if ((a === null) || (b === null))
            return false;
        // this should always be true, as both have the same type (in the type inference sense)
        if (a.type !== b.type)
            return false;
        switch (a.type) {
            case 'number':
                return a.val === b.val;
            case 'array':
                l = a.val; r = b.val;
                for (var cnt = 0; cnt < r.length; cnt++) {
                    if (l[cnt] !== r[cnt])
                        return false;
                }
                return true;
            case 'flatarray':
            case 'parallelarray':
                l = a.val.data; r = b.val.data;
                // make sure that both hold data
                if ((l.length === undefined) || (r.length === undefined))
                    return false;
                for (var cnt = 0; cnt < r.length; cnt++) {
                    if (l[cnt] !== r[cnt])
                        return false;
                }
                return true;
            default:
                return false;
        }
    };

    // main hook to start the compilation/execution process for running a construct using OpenCL
    // paSource -> 'this' inside kernel
    // f -> function to run
    // construct -> [combine|map|comprehension|comprehensionScalar]
    // rankOrShape -> either rank of iterationspace or in case of comprehension and comprehensionScalar the shape of the iterationspace
    // args -> additional arguments to the kernel
    var compileAndGo = function compileAndGo (paSource, f, construct, rankOrShape, args, enable64BitFloatingPoint) {
        "use strict";
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
                                             if ((typeof(canBeMapped) === 'function') && (canBeMapped(object))) {
                                                 // we have found a JavaScript array that can be directly mapped, so we keep it
                                                 return object;
                                             } else {
                                                 return new RiverTrail.Helper.FlatArray( lowPrecision ? Float32Array : Float64Array, object);
                                             }
                                         } else {
                                             return object;
                                         }});

        var argumentTypes = constructArgTypes(construct, args, rankOrShape, defaultNumberType);

        // this stores information on the value we see
        var specVector = null;
        if (useValueSpec) {
            specVector = args.map(function (v) { 
                    if (typeof(v) === 'number') {
                        return {val: v, type: 'number', seen: 1};
                    } else if (isTypedArray(v) && (v.length < maxValSpecLen)) {
                        // we can only get flat arrays here, so no need to check what the actual values are
                        return {val: v, type: 'array', seen: 1};
                    } else if ((v instanceof RiverTrail.Helper.FlatArray) && (v.shape.length <= 2) && (v.shape[0] * (v.shape[1] | 1) < maxValSpecLen)) {
                        return {val: v, type: 'flatarray', seen: 1};
                    } else if ((v instanceof ParallelArray) && (v.shape.length <= 2) && (v.shape[0] * (v.shape[1] | 1) < maxValSpecLen)) {
                        return {val: v, type: 'parallelarray', seen: 1};
                    } else {
                        return null;
                    }
                });
        } 
        // spec stores what we actually want to specialize for
        var spec = null;
        var cacheEntry = null;

        if (f.openCLCache !== undefined) {
            if (useKernelCaching) {
                cacheEntry = getCacheEntry(f, construct, paSource, argumentTypes, lowPrecision, rankOrShape);
                // try and find a matching kernel from previous runs
                if (cacheEntry != null) {
                    cacheEntry.uses++;
                    if (useValueSpec) {
                        // record value frequencies
                        cacheEntry.vals = cacheEntry.vals.map(function (v,i) {
                            "use strict";
                            if (v === null) {
                                return v; // megamorphic
                            } else {
                                var elem = specVector[i];
                                if (v[0] === elem) {
                                    // both null, nothing to be done
                                    return v;
                                } else if ((v[0] !== null) &&
                                           (elem !== null) &&
                                           equalsSpecValue(elem,v[0])) {
                                    // it is the first element
                                    v[0].seen++;
                                    return v;
                                } else {
                                    // search through all other elements
                                    if (elem === null) {
                                        for (var pos = 1; pos < v.length; pos++) {
                                            if (v[pos] === null) {
                                                v[pos] = v[pos-1];
                                                v[pos-1] = null;
                                                return v;
                                            }
                                        }
                                        v.push(null);
                                    } else {
                                        // search for a value
                                        for (var pos = 1; pos <v.length; pos++) {
                                            if ((v[pos] !== null) && equalsSpecValue(v[pos], elem)) {
                                                var swap = v[pos];
                                                v[pos] = v[pos-1];
                                                v[pos-1] = swap;
                                                swap.seen++;
                                                return v;
                                            }
                                        }
                                        v.push(elem);
                                    }
                                    if (v.length > polymorphLimit) {
                                        return null;
                                    } else {
                                        return v;
                                    }
                                }
                            }
                        });
                    }
                                
                    // there is always at least a match
                    var kSpec = findBestMatch(cacheEntry, specVector);
                    spec = doWeNeedBetter(cacheEntry, kSpec, specVector);

                    if (!spec) {
                        // execute what we have
                        paResult = RiverTrail.compiler.runOCL(paSource, kSpec.kernel, cacheEntry.ast, 
                                       construct, rankOrShape, args, argumentTypes, lowPrecision, 
                                       useBufferCaching);
                        return paResult;
                    }
                    // fall through with our spec vector to recompilation below
                }
            } else {
                // remove cache 
                f.openCLCache = undefined;
            }
        } 
        //
        // NOTE: we only get here if caching has failed!
        //       this means we have seen new types OR a have to do a better specialization!
        //
        if (useKernelCaching && (f.openCLCache === undefined)) {
            // create empty cache
            f.openCLCache = [];
        }
                        
        try {
            ast = parse(paSource, construct, rankOrShape, f.toString(), args, lowPrecision, spec); // parse, no code gen
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
            return this;
        } 

        var kernelName = ast.name;
        var kernel;
        if (!kernelName) {
            throw new Error("Invalid ast: Function expected at top level");
        }

        try {
            if (enable64BitFloatingPoint) {
                // enable 64 bit extensions
                kernelString = "#pragma OPENCL EXTENSION cl_khr_fp64 : enable\n" + kernelString;
            }
            kernel = RiverTrail.runtime.compileKernel(kernelString, "RT_" + kernelName);
        } catch (e) {
            try {
                var log = getBuildLog();
                console.log(log);
            } catch (e2) {
                var log = "<not available>";
            }
            RiverTrail.Helper.debugThrow("The OpenCL compiler failed. Log was `" + log + "'.");
        }
        if (reportVectorized) {
            try {
                var log = RiverTrail.runtime.getBuildLog();
                if (log.indexOf("was successfully vectorized") !== -1) {
                    console.log(kernelName + "was successfully vectorized");
                }
            } catch (e) {
                // ignore
            }
        }
        if (useKernelCaching) {
            // save ast information required for future use
            // if we came here due to specialisation, we have a cacheEntry already!
            if (!cacheEntry) {
                var cacheEntry = { "ast": ast,
                    "name": ast.name,
                    "source": f,
                    "paType": paSource ? RiverTrail.Helper.inferPAType(paSource) : undefined,
                    "kernel": [{"kernel": kernel, "spec": spec}],
                    "construct": construct,
                    "lowPrecision": lowPrecision,
                    "argumentTypes": argumentTypes,
                    "iterSpace": rankOrShape,
                    "uses": 1,
                    "vals" : useValueSpec ? specVector.map(function (v) { return [v]; }) : null
                };
                f.openCLCache.push(cacheEntry);
            } else {
                // update existing entry
                cacheEntry.kernel.push({"kernel": kernel, "spec": spec});
            }
        }
        
        try {
            paResult = RiverTrail.compiler.runOCL(paSource, kernel, ast, construct, rankOrShape, args, 
                                            argumentTypes, lowPrecision, useBufferCaching);
        } catch (e) {
            try {
                RiverTrail.Helper.debugThrow(e + getBuildLog());
            } catch (e2) {
                RiverTrail.Helper.debugThrow(e); // ignore e2. If buildlog throws, there simply is none.
            }
        }
        // NOTE: Do not add general code here. This is not the only exit from this function!
        return paResult;
    };

    //
    // Driver method to steer compilation process
    //
    function parse(paSource, construct, rankOrShape, kernel, args, lowPrecision, spec) {
        var ast = RiverTrail.Helper.parseFunction(kernel);
        var rank = rankOrShape.length || rankOrShape;
        try {
            RiverTrail.Typeinference.analyze(ast, paSource, construct, rank, args, lowPrecision);
            RiverTrail.RangeAnalysis.analyze(ast, paSource, construct, rankOrShape, args, spec);
            RiverTrail.RangeAnalysis.propagate(ast, construct);
            RiverTrail.InferBlockFlow.infer(ast);
            RiverTrail.InferMem.infer(ast);
        } catch (e) {
            RiverTrail.Helper.debugThrow(e);
        }
        return ast;
    }
    var fillInTypeAndShapeIfMissing = function(a) {
        if(a.inferredType !== undefined && a.dimSize !== undefined)
            return;
        var tiA = RiverTrail.Helper.inferPAType(a);
        a.inferredType = tiA.inferredType;
        a.dimSize = tiA.dimSize;
    }
    var getCacheEntry = function (f, construct, paType, argumentTypes, lowPrecision, rankOrShape) {
        var argumentMatches = function (argTypeA, argTypeB) {
            fillInTypeAndShapeIfMissing(argTypeA);
            fillInTypeAndShapeIfMissing(argTypeB);
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
                (((construct !== "comprehension") && (construct !== "comprehensionScalar")
                  && argumentMatches(paType, entry.paType) && equalsShape(paType.shape, entry.paType.dimSize)) || 
                 ((construct == "comprehension" || construct == "comprehensionScalar") && equalsShape(rankOrShape, entry.iterSpace)))
               ) {
                return f.openCLCache[i];
            }
        }
        return null;
    };

    var findBestMatch = function findBestMatch(entry, vals) {
        "use strict";
        var fits = 0;
        // the first entry is always the generic one
        var match = entry.kernel[0];
        for (var i = 1; i < entry.kernel.length; i++) {
            var matches = true;
            var lFits = 0;
            var lSpec = entry.kernel[i].spec;
            if (lSpec === null) { // this should not happen
                matches = false;
                break;
            }
            for (var j = 0; j < vals.length; j++) {
                if (lSpec[j] !== null) {
                    if (equalsSpecValue(lSpec[j], vals[j])) {
                        lFits++;
                    } else {
                        matches = false;
                        break;
                    }
                }
            }
            if (matches && (lFits > fits)) {
                match = entry.kernel[i];
            }
        }
        return match;
    };

    var doWeNeedBetter = function doWeNeedBetter(cache, current, vals) {
        "use strict";
        // we wait to see some values before we decide
        if (cache.uses < specWarmUp) return null;
        // no more than 5 specs per function
        if (cache.kernel.length > 5) return null;
        
        var result;
        var changed = false;
        if (current.spec === null) {
            result = vals.map(function (v) { return null;});
        } else {
            result = current.spec.map(function (v) { return v;});
        }

        for (var i = 0; i < result.length; i++) {
            if (result[i] === null) {
                // we could go further here
                var seen = cache.vals[i];
                if (seen !== null) {
                    for (var j = 0; j < specDepth; j++) {
                        if (equalsSpecValue(seen[j], vals[i])) {
                            // this is a frequent value
                            result[i] = vals[i];
                            changed = true;
                            break;
                        }
                    }
                }
            }
        }

        RiverTrail.compiler.debug && console.log("new spec: " + specToString(result));

        return (changed ? result : null);
    };

    var specToString = function specToString(spec) {
        "use strict";
        if (!spec) 
            return "null";

        var s = "";
        for (var i = 0; i < spec.length; i++) {
            s = s + "["+i+", " + (spec[i] ? spec[i].val.toString() + ", " + spec[i].type : "null") + "]";
        }
        return s;
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
    };
}());

