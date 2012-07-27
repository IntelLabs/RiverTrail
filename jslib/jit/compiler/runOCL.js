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


if (RiverTrail === undefined) {
    var RiverTrail = {};
}

// Executes the kernel function with the ParallelArray this and the args for the elemental function
// paSource     - 'this' inside the kernel
// kernelString - either a JavaScript code string or a precompiled kernel (dpoIKernel object)
// ast          - result from parsing
// f            - function to compile
// construct    - outer construct in {combine,,map,comprehension,comprehensionScalar}
// rankOrShape  - either the rank of the iteration space, or for comprehension the shape of the interationspace
// actualArgs   - extra kernel arguments

RiverTrail.compiler.runOCL = function () {
    var reportVectorized = false;

    // Executes the kernel function with the ParallelArray this and the args for the elemental function
    // paSource     - 'this' inside the kernel
    // kernelString - either a JavaScript code string or a precompiled kernel (dpoIKernel object)
    // ast          - result from parsing
    // f            - function to compile
    // construct    - outer construct in {combine,map,comprehension,comprehensionScalar}
    // rankOrShape  - either the rank of the iteration space, or for comprehension the shape of the interationspace
    // actualArgs   - extra kernel arguments
    var runOCL = function runOCL(paSource, kernelString, ast, f, construct, rankOrShape, actualArgs,
                                 argumentTypes, lowPrecision, enable64BitFloatingPoint, useBufferCaching, useKernelCaching) {
        var paResult;
        var kernelArgs = [];
        var resultMem;
        var sourceType;
        var iterSpace;
        var kernel;
        var rank;
        var kernelName = ast.name;
        if (!kernelName) {
            throw new Error("Invalid ast: Function expected at top level");
        }
        if ((construct === "comprehension") || (construct === "comprehensionScalar")) {
            // comprehensions do not have a source, so we derive the required information
            // from rank and the ast
            sourceType = undefined;
            iterSpace = rankOrShape;
            rank = iterSpace.length;
        } else {
            sourceType = RiverTrail.Helper.inferPAType(paSource);
            rank = rankOrShape;
            iterSpace = sourceType.dimSize.slice(0, rank);
        }
        // construct kernel arguments
        var jsObjectToKernelArg = function (args, object) {
            if (object instanceof ParallelArray) {
                if (object.data instanceof Components.interfaces.dpoIData) {
                    // we already have an OpenCL value
                    args.push(object.data);
                } else if (RiverTrail.Helper.isTypedArray(object.data)) {
                    if ((object.cachedOpenCLMem === undefined)) {
                        // we map this argument
                        object.cachedOpenCLMem = RiverTrail.compiler.openCLContext.mapData(object.data);
                    }
                    args.push(object.cachedOpenCLMem);
                    if (!useBufferCaching) {
                        object.cachedOpenCLMem = undefined;
                    }
                } else {
                    // We have a regular array as data container. There is no point trying
                    // to convert it, as the constructor would already have tried.
                    throw new Error("Cannot transform regular array to OpenCL kernel arguments");
                }
                // Add the offset as an additional integer argument. Use the Integer Object here.
                args.push(new RiverTrail.Helper.Integer(object.offset));
            } else if (object instanceof RiverTrail.Helper.FlatArray) {
                // these are based on a flat array, so we can just push the data over
                args.push(RiverTrail.compiler.openCLContext.mapData(object.data));
            } else if (object instanceof Array) {
                // we have an ordinary JS array, which has passed the uniformity checks and thus can be mapped
                args.push(RiverTrail.compiler.openCLContext.mapData(object));
            } else if (typeof (object) === "number") {
                // Scalar numbers are passed directly, as doubles.
                args.push(object);
            } else if (object instanceof Number) {
                // Numbers are passed as just their values
                args.push(object.valueOf());
            } else if (object instanceof RiverTrail.Helper.Integer) {
                // How did I get here.
                console.log("(object instanceof RiverTrail.Helper.Integer) encountered unexpectedly");
                // Integers are passed directly
                args.push(object);
            } else if (RiverTrail.Helper.isTypedArray(object)) {
                // map the typed array
                args.push(RiverTrail.compiler.openCLContext.mapData(object));
            } else {
                throw new Error("only typed arrays and scalars are currently supported as OpenCL kernel arguments");
            }
            return args;
        }
        if ((construct !== "comprehension") && (construct !== "comprehensionScalar")) {
            jsObjectToKernelArg(kernelArgs, paSource);
            // console.log("jsObjectToKernelArg:kernelArgs.length: "+kernelArgs.length);
        }
        if (actualArgs !== undefined) {
            Array.prototype.reduce.call(actualArgs, jsObjectToKernelArg, kernelArgs);
        }
        // add memory for result
        // SAH: We have agreed that operations are elemental type preserving, thus I reuse the type
        //      of the argument here.
        if (paSource.updateInPlacePA !== undefined) {
            if (ast.typeInfo.result.isObjectType("InlineObject")) {
                // we do not support a scan over multiple results
                throw new Error("the impossible happened: in place scan operation with multiple returns!");
            }
            // the result space has been preallocated for us! So just use/map what is there.
            // See scan for how this is supposed to work
            // first we ensure that the shape of what we compute is the shape of what is expected
            var resShape;
            if (type.properties) {
                resShape = iterSpace.concat(ast.typeInfo.result.getOpenCLShape());
            } else {
                resShape = iterSpace;
            }
            if (!equalsShape(resShape, paSource.updateInPlaceShape)) {
                // throwing this will revert the outer scan to non-destructive mode
                throw new Error("shape mismatch during update in place!");
            }
            if (++paSource.updateInPlaceUses !== 1) {
                throw new Error("preallocated memory used more than once!");
            }
            if (!(paSource.updateInPlacePA.data instanceof Components.interfaces.dpoIData)) {
                paSource.updateInPlacePA.data = RiverTrail.compiler.openCLContext.mapData(paSource.updateInPlacePA.data);
            }
            resultMem = {mem: paSource.updateInPlacePA.data, shape: resShape, type: RiverTrail.Helper.stripToBaseType(type.OpenCLType)};
            kernelArgs.push(resultMem);
            kernelArgs.push(new RiverTrail.Helper.Integer(paSource.updateInPlaceOffset));
        } else {
            var allocateAndMapResult = function (type) {
                var resultElemType = RiverTrail.Helper.stripToBaseType(type.OpenCLType);
                var resShape;
                if (type.properties) {
                    resShape = iterSpace.concat(type.getOpenCLShape());
                } else {
                    resShape = iterSpace;
                }
                var template = RiverTrail.Helper.elementalTypeToConstructor(resultElemType);
                if (template == undefined) throw new Error("cannot map inferred type to constructor");
                var memObj = RiverTrail.compiler.openCLContext.allocateData(new template(1), shapeToLength(resShape));
                kernelArgs.push(memObj);
                kernelArgs.push(new RiverTrail.Helper.Integer(0));
                return {mem: memObj, shape: resShape, type: resultElemType};
            };

            // We allocate whatever the result type says. To ensure portability of 
            // the extension, we need a template typed array. So lets just create one!
            if (ast.typeInfo.result.isObjectType("InlineObject")) {
                // we have multiple return values
                resultMem = {};
                for (var name in ast.typeInfo.result.properties.fields) {
                    resultMem[name] = allocateAndMapResult(ast.typeInfo.result.properties.fields[name]);
                }
            } else {
                // allocate and map the single result
                resultMem = allocateAndMapResult(ast.typeInfo.result);
            }
        }
        // build kernel
        if (kernelString instanceof Components.interfaces.dpoIKernel) {
            kernel = kernelString;
        } else {
            try {
                if (enable64BitFloatingPoint) {
                    // enable 64 bit extensions
                    kernelString = "#pragma OPENCL EXTENSION cl_khr_fp64 : enable\n" + kernelString;
                }
                kernel = RiverTrail.compiler.openCLContext.compileKernel(kernelString, "RT_" + kernelName);
            } catch (e) {
                try {
                    var log = RiverTrail.compiler.openCLContext.buildLog;
                } catch (e2) {
                    var log = "<not available>";
                }
                RiverTrail.Helper.debugThrow("The OpenCL compiler failed. Log was `" + log + "'.");
            }
            if (reportVectorized) {
                try {
                    var log = RiverTrail.compiler.openCLContext.buildLog;
                    if (log.indexOf("was successfully vectorized") !== -1) {
                        console.log(kernelName + "was successfully vectorized");
                    }
                } catch (e) {
                    // ignore
                }
            }
            if (useKernelCaching && (f !== undefined)) {
                // save ast information required for future use
                var cacheEntry = { "ast": ast,
                    "name": ast.name,
                    "source": f,
                    "paType": sourceType,
                    "kernel": kernel,
                    "construct": construct,
                    "lowPrecision": lowPrecision,
                    "argumentTypes": argumentTypes,
                    "iterSpace": iterSpace
                };
                f.openCLCache.push(cacheEntry);
            }
        }
        // set arguments
        kernelArgs.reduce(function (kernel, arg, index) {
            try {
                //console.log("driver 344 index: ", index, " arg: ", arg);
                if (typeof (arg) === "number") {
                    kernel.setScalarArgument(index, arg, false, !lowPrecision);
                } else if (arg instanceof RiverTrail.Helper.Integer) {
                    // console.log("index: ", index, " arg.value: ", arg.value);
                    kernel.setScalarArgument(index, arg.value, true, false);
                    // console.log("good");
                } else if (arg instanceof Components.interfaces.dpoIData) {
                    kernel.setArgument(index, arg);
                } else {
                    throw new Error("unexpected kernel argument type!");
                }
                return kernel;
            } catch (e) {
                console.log("reduce error: ", e, " index: ", index, "arg: ", arg);
                throw e;
            }
        }, kernel);

        if ((construct === "map") || (construct == "combine") || (construct == "comprehension") || (construct == "comprehensionScalar")) {
            // The differences are to do with args to the elemental function and are dealt with there so we can use the same routine.
            // kernel.run(rank, shape, tiles)
            try {
                // console.log("791:new:rank: "+rank+" iterSpace: "+iterSpace);
                //console.log("driver:389 did not run.");
                var kernelFailure = kernel.run(rank, iterSpace, iterSpace.map(function () { return 1; }));
            } catch (e) {
                console.log("kernel.run fails: ", e);
                throw e;
            }
            if (kernelFailure) {
                // a more helpful error message would be nice. However, we don't know why it failed. A better exception model is asked for...
                throw new Error("kernel execution failed: " + RiverTrail.compiler.codeGen.getError(kernelFailure));
            }
        } else {
            alert("runOCL only deals with comprehensions, map and combine (so far).");
        }
        if (resultMem.mem && (resultMem.mem instanceof Components.interfaces.dpoIData)) {
            // single result
            paResult = new ParallelArray(resultMem.mem, resultMem.shape, resultMem.type);
        } else {
            // multiple results
            var multiPA = {};
            for (var name in resultMem) {
                multiPA[name] = new ParallelArray(resultMem[name].mem, resultMem[name].shape, resultMem[name].type);
            }
            paResult = new IBarfAtYouUnlessYouUnzipMe(multiPA);
        }

        return paResult;
    };

    // unsophisticated wrapper around multiple ParallelArray objects. This wrapper will block
    // all calls the ParallelArray API except for unzip, which returns the contained
    // data object.
    var IBarfAtYouUnlessYouUnzipMe = function IBarfAtYouUnlessYouUnzipMe(data) {
        this.unzip = function () {
            return data;
        };

        return this;
    };
    var barf = function barf(name) {
        return function () {
            throw "`" + name + "' not implemented for ParallelArray of objects. Please call `unzip' first!";
        }
    };
    IBarfAtYouUnlessYouUnzipMe.prototype = {};
    IBarfAtYouUnlessYouUnzipMe.prototype.map = barf("map");
    IBarfAtYouUnlessYouUnzipMe.prototype.combine = barf("combine");
    IBarfAtYouUnlessYouUnzipMe.prototype.scan = barf("scan");
    IBarfAtYouUnlessYouUnzipMe.prototype.filter = barf("filter");
    IBarfAtYouUnlessYouUnzipMe.prototype.scatter = barf("scatter");
    IBarfAtYouUnlessYouUnzipMe.prototype.reduce = barf("reduce");
    IBarfAtYouUnlessYouUnzipMe.prototype.get = barf("get");
    IBarfAtYouUnlessYouUnzipMe.prototype.partition = barf("partition");
    IBarfAtYouUnlessYouUnzipMe.prototype.flatten = barf("flatten");
    IBarfAtYouUnlessYouUnzipMe.prototype.toString = barf("toString");
    IBarfAtYouUnlessYouUnzipMe.prototype.getShape = barf("getShape");
    IBarfAtYouUnlessYouUnzipMe.prototype.getData = barf("getData");
    IBarfAtYouUnlessYouUnzipMe.prototype.getArray = barf("getArray");

    // Given the shape of an array return the number of elements. Duplicate from ParallelArray.js 
    var shapeToLength = function shapeToLength(shape) {
        var i;
        var result;
        if (shape.length == 0) {
            return 0;
        }
        result = shape[0];
        for (i = 1; i < shape.length; i++) {
            result = result * shape[i];
        }
        return result;
    };

    return runOCL;
} ();
