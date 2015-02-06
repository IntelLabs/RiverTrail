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

RiverTrail.compiler.runOCL = function () {
    // Executes the kernel function with the ParallelArray this and the args for the elemental function
    // paSource     - 'this' inside the kernel

    // kernel       - a precompiled kernel (CData)
    // ast          - result from parsing
    // construct    - outer construct in {combine,map,comprehension,comprehensionScalar}
    // rankOrShape  - either the rank of the iteration space, or for comprehension the shape of the interationspace
    // actualArgs   - extra kernel arguments
    // argumentTypes- types of kernel arguments
    // lowPrecision - whether kernel is meant to use float
    // useBuffer... - whether buffers should be cached
    var runOCL = function runOCL(paSource, kernel, ast, construct, rankOrShape, actualArgs,
                                 argumentTypes, lowPrecision, useBufferCaching) {
        var paResult;
        var kernelArgs = [];
        var resultMem;
        var sourceType;
        var iterSpace;
        var rank;
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

                if (object.name === "CData") {
                    // we already have an OpenCL value
                    args.push(object.data);
                } else if(RiverTrail.Helper.isWebCLBufferObject(object.cachedOpenCLMem)) {
                    // JS: If we already have an OpenCL buffer, push that.
                    args.push(object.cachedOpenCLMem);
                } else if (RiverTrail.Helper.isTypedArray(object.data)) {
                    var memObj;
                    if (object.cachedOpenCLMem) {
                        memObj = object.cachedOpenCLMem;
                    } else {
                        // JS: We may not have mapped this ParallelArray before,
                        // so we map it now
                        memObj = RiverTrail.runtime.mapData(object.data);
                    }
                    args.push(memObj);
                    if (useBufferCaching) {
                        object.cachedOpenCLMem = memObj;
                    }
                } else {
                    // We have a regular array as data container. There is no point trying
                    // to convert it, as the constructor would already have tried.
                    throw new Error("Cannot transform regular array to OpenCL kernel arguments");
                }
                // N.B.: The following argument is for the array
                // offset, but we are already statically computing it,
                // and so we don't need to pass it dynamically (in
                // fact, it is incorrect to do both; see issue
                // #48). So we just pass 0 here instead.  A more
                // thorough fix would probably involve tweaking
                // codegen to not require any offset to be passed
                // dynamically.
                args.push(new RiverTrail.Helper.Integer(0));
            } else if (object instanceof RiverTrail.Helper.FlatArray) {
                // these are based on a flat array, so we can just push the data over
                args.push(RiverTrail.runtime.mapData(object.data));
            } else if (object instanceof Array) {
                // we have an ordinary JS array, which has passed the uniformity checks and thus can be mapped
                args.push(RiverTrail.runtime.mapData(object));
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
                args.push(RiverTrail.runtime.mapData(object));
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
        if (paSource && (paSource.updateInPlacePA !== undefined)) {
            if (ast.typeInfo.result.isObjectType("InlineObject")) {
                // we do not support a scan over multiple results
                throw new Error("the impossible happened: in place scan operation with multiple returns!");
            }
            // the result space has been preallocated for us! So just use/map what is there.
            // See scan for how this is supposed to work
            // first we ensure that the shape of what we compute is the shape of what is expected
            var resShape;
            if (ast.typeInfo.result.isScalarType()) {
                resShape = iterSpace;
            } else {
                resShape = iterSpace.concat(ast.typeInfo.result.getOpenCLShape());
            }
            if (resShape.some(function (e,i) { return e !== paSource.updateInPlaceShape[i];})) {
                // throwing this will revert the outer scan to non-destructive mode
                throw new Error("shape mismatch during update in place!");
            }
            if (++paSource.updateInPlacePA.updateInPlaceUses !== 1) {
                throw new Error("preallocated memory used more than once!");
            }

            if (paSource.updateInPlacePA.data.name !== "CData") {
                if (paSource.updateInPlacePA.cachedOpenCLMem) {
                    paSource.updateInPlacePA.data = paSource.updateInPlacePA.cachedOpenCLMem;
                    delete paSource.updateInPlacePA.cachedOpenCLMem;
                } else {
                    paSource.updateInPlacePA.data = RiverTrail.runtime.mapData(paSource.updateInPlacePA.data);
                    if (useBufferCaching) {
                        paSource.updateInPlacePA.cachedOpenCLMem = paSource.updateInPlacePA.data;
                    }
                }
            }
            resultMem = {mem: paSource.updateInPlacePA.data, shape: resShape, type: RiverTrail.Helper.stripToBaseType(ast.typeInfo.result.OpenCLType), offset: paSource.updateInPlaceOffset};
            kernelArgs.push(resultMem.mem);
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
                var objToMap = new template(shapeToLength(resShape));
                var memObj = RiverTrail.runtime.mapData(objToMap);
                kernelArgs.push(memObj);
                kernelArgs.push(new RiverTrail.Helper.Integer(0));
                return {mem: memObj, shape: resShape, type: resultElemType, offset: 0, hostAllocatedObject: objToMap};
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

        for(var argIdx = 0; argIdx < kernelArgs.length; argIdx++) {
            var arg = kernelArgs[argIdx];
            try {
                if (typeof (arg) === "number") {
                    RiverTrail.runtime.setScalarArgument(kernel, argIdx, arg, false, !lowPrecision);
                } else if (arg instanceof RiverTrail.Helper.Integer) {
                    RiverTrail.runtime.setScalarArgument(kernel, argIdx, arg.value, true, false);
                    // console.log("good");

                } else if (typeof(arg) === "object" && arg.name === "CData") {
                    RiverTrail.runtime.setArgument(kernel, argIdx, arg);
                }else if (typeof(arg) === "object" && arg._name === "WebCLBuffer") {
                    RiverTrail.runtime.setArgument(kernel, argIdx, arg);
                } else {
                    throw new Error("unexpected kernel argument type!");
                }
            } catch (e) {
                console.log("reduce error: ", e, " index: ", argIdx, "arg: ", arg);
                throw e;
            }
        }
        /*
        // set arguments
        kernelArgs.reduce(function (kernel, arg, index) {
            try {
                //console.log("driver 344 index: ", index, " arg: ", arg);
                if (typeof (arg) === "number") {
                    RiverTrail.runtime.setScalarArgument(kernel, index, arg, false, !lowPrecision);
                } else if (arg instanceof RiverTrail.Helper.Integer) {
                    // console.log("index: ", index, " arg.value: ", arg.value);
                    RiverTrail.runtime.setScalarArgument(kernel, index, arg.value, true, false);
                    // console.log("good");

                } else if (typeof(arg) === "object" && arg.name === "CData") {
                    RiverTrail.runtime.setArgument(kernel, index, arg);
                }else if (typeof(arg) === "object" && arg._name === "WebCLBuffer") {
                    RiverTrail.runtime.setArgument(kernel, index, arg);
                } else {
                    throw new Error("unexpected kernel argument type!");
                }
                return kernel;
            } catch (e) {
                console.log("reduce error: ", e, " index: ", index, "arg: ", arg);
                throw e;
            }
        }, kernel);
        */

        if ((construct === "map") || (construct == "combine") || (construct == "comprehension") || (construct == "comprehensionScalar")) {
            // The differences are to do with args to the elemental function and are dealt with there so we can use the same routine.
            // kernel.run(rank, shape, tiles)
            try {
                var kernelFailure = false;
                if(doIterationSpaceFlattening && rank == 2) {
                    var redu = [1];
                    for(var i = 0; i < rank; i++) {
                        redu [0] *= iterSpace[i];
                    }
                    kernelFailure = RiverTrail.runtime.run(kernel, 1, redu, iterSpace.map(function () { return 1; }));
                }
                else {
                    kernelFailure = RiverTrail.runtime.run(kernel, rank, iterSpace, iterSpace.map(function () { return 1; }));
                }
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

        if (RiverTrail.Helper.isCData(resultMem.mem) || RiverTrail.Helper.isWebCLBufferObject(resultMem.mem)) {
            // single result
            paResult = new ParallelArray(resultMem.mem, resultMem.hostAllocatedObject, resultMem.shape);
            if (useBufferCaching) {
                paResult.cachedOpenCLMem = resultMem.mem;
            }
        } else {
            // multiple results
            var multiPA = {};
            for (var name in resultMem) {
                multiPA[name] = new ParallelArray(resultMem[name].mem, resultMem[name].shape, resultMem[name].type, resultMem[name].offset);
                if (useBufferCaching) {
                    multiPA[name].cachedOpenCLMem = resultMem[name].mem;
                }
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
