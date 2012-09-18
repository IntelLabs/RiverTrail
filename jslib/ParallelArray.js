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
////////////////////


//ParallelArray
//    The constructor for ParallelArrays

//    Synopsis:
//    ParallelArray();
//    ParallelArray(size, elementalFunction, ...); 
//    ParallelArray(anArray);
//    ParallelArray(constructor, anArray);
//    ParallelArray(element0, element1, ... elementN); 
//    ParallelArray(canvas);
//    Arguments
//        none 
//            	return a ParallelArray without elements.

//        argument 0 is an Array and there are no more arguments then use the 
//            values in the array to populate the new ParallelArray 

//        argument 1 is an instanceOf Function (the elemental function), 
//                argument 0 is the "size", remaining .. arguments 
//            	return a ParallelArray of "size" where each value is the result 
//                of calling the elemental function with the index where its 
//                result goes and any remaining ... arguments
//                If the size argument is a vector, the index passed to
//                the elemental function will be a vector, too. If, however,
//                the size vector is a single scalar value, the index passed to
//                the elemental value will be a value, as well.

//       argument 0 is a function and there is one more argument then construct
//                a new parallel array as above but use the first 
//            	argument as constructor for the internal data container; 
//                This form can be used to force the ParallelArray to hold
//                its data as a typed array
//    
//        otherwise Create a ParallelArray initialized to the elements passed 
//                in as arguments.

//    Discussion
//        To create a parallel array whose first element is an instanceOf function
//        one must use the elemental function form and have the elemental function 
//        return the function.
//        It also means that if one wants to create a ParallelArray with 
//        a single element that is an Array then it must use the
//        elemental function form with a size of 1 and return the 
//        array from the elemental function.
//    
//    Returns
//        A freshly minted ParallelArray

//    Notes
//        <…> is used to indicate a ParallelArray in these examples it is not syntactical   sugar actually available to the program.
//	
//        pa1 = new ParallelArray(\[[0,1], [2,3], [4,5]]); // <<0,1>, <2,3>, <4.5>>
//        pa2 = new ParallelArray(pa1);                   // <<0,1>, <2,3>, <4.5>>
//        new ParallelArray(<0,1>, <2,3>);           	    // <<0,1>,<2,3>>
//        new ParallelArray([[0,1],[2]])            	    // <<0,1>, <2>>
//        new ParallelArray([<0,1>,<2>]);           	    // <<0,1>, <2>>
//        new ParallelArray(3, 
//                function(i){return [i, i+1];});         // <<0,1><1,2><2,3>>
//       new ParallelArray(canvas);  			            // CanvasPixelArray

/////////////////


var ParallelArray = function () {


//    The array object has the following prototype methods that are also implemented
//    for ParallelArray.

//    concat, join, slice, toString

//    See https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array
//    for their description.



//    The ParallelArray prototype includes the data parallel mechanisms used by ParallelArrays.
//
//    Notes.
//    Copperheap python - allowed closures to be passed. Pass arguments as free variables....
//
//    There are other patterns that can be easily derived from these patterns for example max of a ParallelArray
//    is nothing more that a reduce using the binary max function.

    
    // use Proxies to emulate square bracket index selection on ParallelArray objects
    var enableProxies = false;

    // check whether the new extension is installed.
    var useFF4Interface = false;
    try {
        if (Components.interfaces.dpoIInterface !== undefined) {
            useFF4Interface = true;
        }
    } catch (ignore) {
        // useFF4Interface = false;
    }
    // check whether the OpenCL implementation supports double
    var enable64BitFloatingPoint = false;
    if (useFF4Interface) { 
        var dpoI; 
        var dpoP; 
        try {
            dpoI = new DPOInterface();
        } catch (e) {
            console.log("Unable to create new DPOInterface(): "+e);
        }

        try {
            dpoP = dpoI.getPlatform();
            enable64BitFloatingPoint = (dpoP.extensions.indexOf("cl_khr_fp64") !== -1);
        } catch (e) {
            console.log("Unable to find OpenCL platform: "+e);
            console.log("enable64BitFloatingPoint has been disabled");
            enable64BitFloatingPoint = false;
            // eat the problem after you announce it to the console log.
        }
    }
    // this is the storage that is used by default when converting arrays 
    // to typed arrays.
    var defaultTypedArrayConstructor 
    = useFF4Interface ? (enable64BitFloatingPoint ? Float64Array : Float32Array)
                    : Array;
    // the default type assigned to JavaScript numbers
    var defaultNumberType = enable64BitFloatingPoint ? "double" : "float";

    // whether to use kernel caching or not
    var useKernelCaching = true;
    // whether to use lazy communication of openCL values
    var useLazyCommunication = false;
    // whether to cache OpenCL buffers
    var useBufferCaching = false;
    // whether to do update in place in scan
    var useUpdateInPlaceScan = true;

    // For debugging purposed each parallel array I create has a fingerprint.
    var fingerprint = 0;
    var fingerprintTracker = [];

    var Constants = {
        // Some constants, when constants are added to JS adjust accordingly 
        "zeroStrideConstant"    : [ ],
        "oneStrideConstant"     : [1],
        "emptyRawArrayConstant" : new defaultTypedArrayConstructor(),
        "zeroArrayShapeConstant": [0]
    };

    // I create three names for Error here so that we can, should we ever wish
    // distinguish both or have our own implementation for exceptions
    var CompilerError = Error;   // compilation failed due to wrong program or missing support
    var CompilerBug = Error;     // something went wrong although it should not
    var CompilerAbort = Error;   // exception thrown to influence control flow, e.g., misspeculation
    
    // helper function that throws an exception and logs it if verboseDebug is on
    var debugThrow = function (e) {
        if (RiverTrail.compiler.verboseDebug) {
            console.log("Exception: ", JSON.stringify(e));
        }
        throw e;
    };

    // This method wraps the method given by property into a loader for the
    // actual values of the ParallelArray. On first invocation of the given
    // method, the function materialize is called before the underlying
    // method from the prototype/object is executed.
    var requiresData = function requiresData(pa, property) {
        pa[property] = function () {
            pa.materialize();
            if (!delete pa[property]) throw new CompilerBug("Deletion of overloaded " + property + " failed");
            return pa[property].apply(pa, arguments);
        };
    };

    // If this.data is a OpenCL memory object, grab the values and store the OpenCL memory 
    // object in the cache for later use.
    var materialize = function materialize() {
        if (useFF4Interface && (this.data instanceof Components.interfaces.dpoIData)) {
            // we have to first materialise the values on the JavaScript side
            var cachedOpenCLMem = this.data;
            this.data = cachedOpenCLMem.getValue();
            if (useBufferCaching) {
                this.cachedOpenCLMem = cachedOpenCLMem;
            }
        }
    };

    // Returns true if the values for x an y are withing fuzz.
    // The purpose is to make sure that if a 64 bit floats is 
    // to a 32 bit float and back that they are recognized as 
    // fuzzyEqual.
    // This is clearly wrong but need to check with TS to figure out hte
    // right way to do this.
    var defaultFuzz = .0000002; // 32 bit IEEE654 has 1 bit of sign, 8 bits of exponent, and 23 bits of mantissa
                                // .0000002 is between 1/(2**22) and 1/(2*23) 
    var fuzzyEqual = function fuzzyEqual (x, y, fuzz) {
        var diff = x - y; // do the diff now to avoid losing percision from doing abs.
        if (diff < 0) {
            diff = -diff;
        }
        var absX = (x>0)?x:-x;
        var absY = (y>0)?y:-y;
        var normalizedFuzz = ((absX > absY) ? absY : absX) * fuzz; // Avoids 0 if both aren't 0
        if (diff <= normalizedFuzz) { // <= so that 0, 0 works since fuzz will go to 0.
             return true;
        } 
        return false;
    };

    // Converts the given Array (first argument) into a typed array using the constructor
    // given as second argument. Validity of conversion is ensured by comparing the result
    // element-wise using === with the source. If no constructor is provided, the default
    // is used.
    var convertToTypedArray = function convertToTypedArray(src, arrayConstructor) {
        var constructor 
            = arrayConstructor ? arrayConstructor : defaultTypedArrayConstructor;
        if (src.constructor === constructor) {
            // transforming the array into an array of the same kind
            // makes little sense. Besides, if the constructor is the
            // Array constructor, applying it twice will yield a 
            // doubly nested array!
            // this.elementalType = constructorToElementalType(constructor);
            return src;
        } else {
            var newTA = new constructor(src);
            if (arrayConstructor === undefined) {
                if (src.every(function (val, idx) { return fuzzyEqual(val, newTA[idx], defaultFuzz); })) {
                    return newTA;
                } else {
                    return undefined;
                }
            } else {
                // we force a typed array due to semantics, so we do not care
                // whether the resulting values match
                return newTA;
            }
        }
    };

    // late binding of isTypedArray in local namespace
    var isTypedArray = function lazyLoad(arg) {
        isTypedArray = RiverTrail.Helper.isTypedArray;
        return isTypedArray(arg);
    }

    var equalsShape = function equalsShape (shapeA, shapeB) {
        return ((shapeA.length == shapeB.length) &&
                Array.prototype.every.call(shapeA, function (a,idx) { return a == shapeB[idx];}));
    };

    var shapeToStrides = function shapeToStrides(shape) {
        var strides;
        var i;
        if (shape.length == 1) {
            // Optimize for common case.
            return Constants.oneStrideConstant;
        }
        if (shape.length == 0) {
            return Constants.zeroStrideConstant;
        }
        strides = new Array(shape.length);
        strides[strides.length-1] = 1;
        for (i = strides.length-2; i >= 0; i--) {
            // Calculate from right to left with rightmost being 1.
            strides[i] = shape[i+1]*strides[i+1];
        }
        // console.log("shapeToStrides: ", strides);
        return strides;
    };

// Given the shape of an array return the number of elements.    
    var shapeToLength = function shapeToLength (shape) {
        var i;
        var result;
        if (shape.length == 0) {
            return 0;
        }
        result = shape[0];
        for (i=1; i<shape.length;i++) {
            result = result * shape[i];
        }
        return result;
    };

    // Flatten a multidimensional array to a single dimension.
    var createFlatArray = function createFlatArray (arr) {
        // we build localShape and localRank as we go
        var localShape = [];
        var localRank = undefined;
        var flatArray = new Array();
        var flatIndex = 0;

        var flattenFlatParallelArray = function flattenFlatParallelArray (level, pa) {
            // We know we have a parallel array, we know it is flat.
            // Flat arrays are flat all the way down.
            // update/check localShape and localRank
            pa.shape.forEach( function (v, idx) { 
                    if (localShape[level+idx] === undefined) {
                        localShape[level+idx] = v;
                    } else if (localShape[level+idx] !== v) {
                        //throw "wrong shape of nested PA at " + idx + " local " + v + "/global " + localShape[level+idx];
                        throw "shape mismatch: level " + (level+idx) + " expected " + localShape[level+idx] + " found " + v;
                    }
                });
            if (localRank === undefined) {
                localRank = level + pa.shape.length;
            } else if (localRank !== level + pa.shape.length) {
                throw "dimensionality mismatch; expected " + localRank + " found " + (level + pa.shape.length);
            }
            var i;       
            var size = shapeToLength(pa.shape);
            pa.materialize(); // we have to materialize the array first!
            for (i=pa.offset;i<pa.offset+size;i++) {
                flatArray[flatIndex] = pa.data[i];    
                flatIndex++;
            }
        };
        var flattenInner = function flattenInner (level, arr) {
            var i = 0;
            var thisLevelIndex = 0;
            if (arr instanceof ParallelArray) {
                if (arr.flat) {
                    flattenFlatParallelArray(level, arr);
                    return;
                }
            }
            if (localShape[level] === undefined) {
                localShape[level] = arr.length;
            } else if (localShape[level] !== arr.length) {
                // We do not have a regular array.
                throw "shape mismatch: level " + (level) + " expected " + localShape[level] + " found " + arr.length;
            }
            for (thisLevelIndex=0;thisLevelIndex<arr.length;thisLevelIndex++) {
                if (arr[thisLevelIndex] instanceof Array) { // need to add regular array check...
                    flattenInner(level+1, arr[thisLevelIndex]);
                } else if (arr[thisLevelIndex] instanceof ParallelArray) {
                    if (arr[thisLevelIndex].flat) {
                        // Flat arrays are flat all the way down.
                        flattenFlatParallelArray(level+1, arr[thisLevelIndex]);
                    } else {
                        flattenInner(level+1, arr[thisLevelIndex].get(i));
                    }
                } else {
                    // it's not an array or ParallelArray so it is just an element.
                    flatArray[flatIndex] = arr[thisLevelIndex];
                    flatIndex++;
                    // check for rank uniformity
                    if (localRank === undefined) {
                        localRank = level;
                    } else if (localRank !== level) {
                        throw "dimensionality mismatch; expected " + localRank + " found " + level;
                    }
                }
            }
        };  // flattenInner
        try {
            flattenInner(0, arr);
        } catch (err) {
            console.log("flattenArray:", err);
            return null;
        };
        return flatArray;
    };

    // Given a nested regular array return its shape.
    var arrShape = function arrShape (arr) {
        var result = [];
        while ((arr instanceof Array) || (arr instanceof ParallelArray)) {
            if (arr instanceof Array) {
                result.push(arr.length);
                arr = arr[0];
            } else {
                // It is a ParallelArray
                result.push(arr.shape[0]);
                arr = arr.get(0);
            }
        }
        return result;
    };

    // Proxy handler for mapping [<number>] and [<Array>] to call of |get|.
    // The forwarding part of this proxy is taken from
    // https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Proxy
    // which in turn was copied from the ECMAScript wiki at
    // http://wiki.ecmascript.org/doku.php?id=harmony:proxies&s=proxy
    var makeIndexOpHandler = function makeIndexOpProxy (obj) {
        return {  
            // Fundamental traps  
            getOwnPropertyDescriptor: function(name) {  
                var desc = Object.getOwnPropertyDescriptor(obj, name);  
                // a trapping proxy's properties must always be configurable  
                if (desc !== undefined) { desc.configurable = true; }  
                return desc;  
            },  
            getPropertyDescriptor:  function(name) {  
                var desc = Object.getPropertyDescriptor(obj, name); // not in ES5  
                // a trapping proxy's properties must always be configurable  
                if (desc !== undefined) { desc.configurable = true; }  
                return desc;  
            },  
            getOwnPropertyNames: function() {  
                return Object.getOwnPropertyNames(obj);  
            },  
            getPropertyNames: function() {  
                return Object.getPropertyNames(obj);                // not in ES5  
            },  
            defineProperty: function(name, desc) {  
                Object.defineProperty(obj, name, desc);  
            },  
            delete: function(name) { return delete obj[name]; },     
            fix: function() {  
                if (Object.isFrozen(obj)) {  
                    return Object.getOwnPropertyNames(obj).map(function(name) {  
                               return Object.getOwnPropertyDescriptor(obj, name);  
                           });  
                }  
                // As long as obj is not frozen, the proxy won't allow itself to be fixed  
                return undefined; // will cause a TypeError to be thrown  
            },  

            // derived traps  
            has:          function(name) { return name in obj; },  
            hasOwn:       function(name) { return Object.prototype.hasOwnProperty.call(obj, name); },  
            get:          function(receiver, name) { 
                var idx = parseInt(name);
                if (idx == name) {
                    return obj.get(idx);
                } else {
                    return obj[name];
                } 
            },  
            set:          function(receiver, name, val) { obj[name] = val; return true; }, // bad behavior when set fails in non-strict mode  
            enumerate:    function() {  
                var result = [];  
                for (name in obj) { result.push(name); };  
                return result;  
            },  
            keys: function() { return Object.keys(obj) }  
        };  
    }  
        

    // Helper for constructor that generates an empty array.
    var createEmptyParallelArray = function createEmptyParallelArray () {
        this.data     = Constants.emptyRawArrayConstant;
        this.shape    = Constants.zeroArrayShapeConstant;
        this.strides  = Constants.oneStrideConstant;
        this.flat     = true;
        this.offset   = 0;
        return this;
    };
    // Helper for constructor that takes a single element, an array, a typed array, a 
    // ParallelArray, or an image of values. The optional second argument unfluences which
    // kind of typed array is tried. 
    var createSimpleParallelArray = function createSimpleParallelArray(values, targetType) {
        if (values instanceof Array) {
            var flatArray = createFlatArray(values);
            if (flatArray == null) { // We couldn't flatten the array, it is irregular
                this.data = new Array(values.length);
                this.flat = false;
                for (i=0;i<values.length;i++){
                    if (values[i] instanceof Array) {
                        this.data[i] = new ParallelArray(values[i]);
                    } else {
                        this.data[i] = values[i];
                        /**
                        this.shape = this.shape.push(values[i].length);
                        **/
                    }
                }
            } else { // we have a flat array.
                this.shape = arrShape(values); 
                this.strides = shapeToStrides(this.shape); 
                this.flat = true;
                this.offset = 0;
                this.data = convertToTypedArray(flatArray, targetType); 
                if (this.data === undefined) this.data = flatArray;
            }
        } else if (values instanceof ParallelArray) {
            // Parallel Arrays can share data since they are immutable.
            this.flat = values.flat;
            if (this.flat) {            
                this.shape = values.shape;
                this.strides = values.strides;
                this.offset = values.offset;
            }
            if (targetType === undefined) {
                this.data = values.data; // ParallelArrays are read only so reuse data
                this.elementalType = values.elementalType;
            } else {
                values.materialize();
                this.data = new targetType(values.data);
            }
        } else if (isTypedArray(values)) {
            this.flat = true;
            this.strides = Constants.oneStrideConstant;
            this.offset = 0;
            this.shape = [values.length];
            // We create a new typed array and copy the source elements over.
            // Just calling the constructor with the source array would not
            // suffice as typed arrays share the underlying buffer...
            this.data = new values.constructor(values.length); 
            for (var i = 0; i < values.length; i++) {
                this.data[i] = values[i];
            }
            this.isKnownRegular = true;
        } else if (values.getContext !== undefined) { // proxy for checking if it's a canvas
            var context = values.getContext("2d");
            var imageData = context.getImageData(0, 0, values.width, values.height);
            this.data = imageData.data;
            this.shape = [values.height,values.width,4];
            this.strides = [4*values.width,4,1];
            this.flat = true;
            this.offset = 0;
            this.isKnownRegular = true;
        } else {
            this.data = new defaultTypedArrayConstructor(1); 
            this.data[0] = values;
            if (this.data[0] !== values) {
                this.data = new Array(1);
                this.data[0] = values;
            }
            this.shape = Constants.oneStrideConstant;
            this.strides = Constants.oneStrideConstant;
            this.flat = true;
            this.offset = 0;
        }
        return this;
    };

    // Helper for constructor that builds an ParallelArray comprehension.
    var createComprehensionParallelArray = function createComprehensionParallelArray(sizeVector, theFunction, extraArgs) {
        var results;
        var tempVector;
        var scalarIndex = false;
        if (!(sizeVector instanceof Array)) {
            // Handles just passing the size of a 1 d array in as a number.
            tempVector = new Array(1);
            tempVector[0] = sizeVector;
            sizeVector = tempVector;
            scalarIndex = true;
        }
        // try to execute the comprehension in OpenCL
        try {
            return RiverTrail.compiler.compileAndGo(this, theFunction, scalarIndex ? "comprehensionScalar" : "comprehension", sizeVector, extraArgs, enable64BitFloatingPoint);
        } catch (e) {
            console.log("comprehension failed: " + e);
        }
        var left = new Array(0);
        results = buildRaw(this, left, sizeVector, arguments[1], extraArgs, scalarIndex);
        // SAH: once we have computed the values, we can fall back to the simple case.
        createSimpleParallelArray.call(this, results);
        return this;
    };
    
    var createOpenCLMemParallelArray = function( mobj, shape, type) {
        this.data = mobj;
        this.shape = shape;
        this.elementalType = type;
        this.strides = shapeToStrides( shape);
        this.flat = true;
        this.offset = 0;

        return this;
    };
    
    // Occasionally we want to surpress the actual execution of the OpenCL and just look at the verboseDebug
    // information. This reduces browser crashes and makes debugging easier. 
    // Normally this is false.
    var suppressOpenCL = false;
    //var suppressOpenCL = true;

    // kernelCompiler is the OCL parser and code generator. It is generated and placed here the first 
    // the the ParallelArray constructor is called.
    var kernelCompiler = false;

    // Used by the constructor to build a ParallelArray with given a size vector and a function.
    // Used by combine to build the new ParallelArray. 

    /***
        buildRaw
        
        Synopsis: 
            Used by the constructor to build a ParallelArray with given a size vector and a function.
            Used by combine to build the new ParallelArray.
        function buildRaw(theThisArray, left, right, fTemp, extraArgs);
        Arguments
            theThisArray: the array you are populating.
            fTemp: A function
            left: the indices when concatanated to right form the indices passed to fTemp or to a recursive call to buildRaw
            right: the indices when concatinated to left form the indices passed to fTemp
                    if right has only one index then the actual calls to fTemp are done for all indices from 0 to right[0]
            fTemp: The first arg is an array holding the indices of where the resulting element belongs along with any extraArg
            extraArgs: Args that are passed on to fTemp unchanged.
            scalarindex: If true, the index passed to the elemental function will be a scalar value
        Returns
            A freshly minted JS Array whose elements are the results of applying f to 
            the original ParallelArray (this) along with the indices holding where the resulting
            element is placed in the result. The indices are the concatination of the 
            arguments left and right. Any extraArgs are also passed to f.
            The expected use case for combine is for fTemp to reference this at the appropriate indices to
            build the new element.
            The expected use case for the constructors is to construct the element using the indices and the 
            extra args.
    ***/
    var buildRaw = function buildRaw(theThisArray, left, right, fTemp, extraArgs, scalarIndex) {
        var i;
        var elementalResult;
        var result;
        if (right.length == 1) {
            // Here is where you call the fTemp with the indices.
            var indices = new Array(left.length+1); // This ends up being the indices passed to the elemental function
            var applyArgs = new Array(extraArgs.length+1); // indices + extra args.
            for (i=0;i<extraArgs.length;i++) { // these are the args passed to the elemental functionleave the first arg open for indices.
                applyArgs[i+1] = extraArgs[i];
            }
            var result = new Array(right[0]); // The number of result to expect
            for (i=0;i<left.length; i++) {
                indices[i] = left[i]; // Transfer the non-changing indices.
            }
            for (i=0; i<right[0]; i++) {
                if (scalarIndex) {
                    applyArgs[0] = i;
                } else {
                    indices[left.length] = i; // This is the index that changes.
                    applyArgs[0] = indices;
                }
                
                elementalResult = fTemp.apply(theThisArray, applyArgs);
                if (elementalResult instanceof Array) {
                    result[i] = new ParallelArray(elementalResult);
                } else if (elementalResult instanceof ParallelArray) {
                    result[i] = elementalResult;
                } else {
                    result[i] = elementalResult;
                }
            }
            return result;
        }
        if (scalarIndex) {
            throw new CompilerBug("buildRaw called with scalarIndex === true but higher rank interation space");
        }
        // Build the new index vectors for the recursive call by moving an index from the right to the left.
        var newLeft = new Array(left.length+1);
        var newRight = right.slice(1); // Move the first right to the left.
        for (i=0;i<left.length;i++) {
            newLeft[i] = left[i];
        }
        newLeft[newLeft.length-1] = right[0];
        var range = newLeft[newLeft.length-1];
        result = new Array(range);
        for (i=0; i<range; i++) {
            newLeft[newLeft.length-1] = i;
            result[i] = buildRaw(theThisArray, newLeft, newRight, fTemp, extraArgs, scalarIndex);
        }
        return result;
    };
    /** Erase RLH.
    var calculateSize = function calculateSize(ravel) {
        var size = 0;
        var i;
        if (ravel.length == 0) {
            return size;
        }
        size = 1;
        for (i=ravel.length-1; i>=0; i--) {
            size = size * ravel[i];            
        }
        return size;
    };
    **/

    var partition = function partition(partitionSize) {
        if (this.flat) {
            return partitionFlat(this, partitionSize);
        }
        var aSlice;
        var i;
        var partitionCount = this.length / partitionSize;
        var newArray = new Array(partitionCount);
        if (partitionCount*partitionSize != this.length) {
            throw new RangeError("ParallelArray.partition length not evenly divisible by partitionSize.");
        }
        for (i=0; i<partitionCount; i++) {
            aSlice = this.data.slice(i*partitionSize, (i+1)*partitionSize);
            newArray[i] = new ParallelArray(aSlice);
        }
        return new ParallelArray(newArray);
    };

    var partitionFlat = function partitionFlat(pa, partitionSize) {
        var newShape = new Array(pa.shape.length+1);
        var i;
        
        for (i=1;i<newShape.length;i++) {
            newShape[i]=pa.shape[i-1];
        }
        // At this point newShape[0] and newShape[1] need to be adjusted to partitionCount and partitionSize

        newShape[0] = newShape[1] / partitionSize;
        newShape[1] = partitionSize;
        
        if (shapeToLength(newShape) != shapeToLength(pa.shape)) {
            throw new RangeError("Attempt to partition ParallelArray unevenly.");
        }
        var newPA = new ParallelArray("reshape", pa, newShape);
        return newPA;
    };
    // Does this parallelArray have the following dimension?
    var isRegularIndexed = function isRegularIndexed(indices) {
        if (this.length != indices[0]) {
            return false;
        }
        if (indices.length == 1) {
            return true;
        }
        var i;
        //var result = true;
        // SH: the below call to slice should do the same
        // var tempIndices = new Array(indices.length-1);
        // for (i=0;i<indices.length-1;i++) {
        //     tempIndices[i] = indices[i+1];
        // }
        var tempIndices = indices.slice(1);
        // the below could be replaced by this but that would break encapsulation
        //return this.data.every( function checkElement(x) { return x.isRegularIndexed(tempIndices)} );
        for (i=0;i<this.length;i++) {
            if ((this.get(i).isRegularIndexed(tempIndices)) == false) {
                return false;
            }
        }
        return true;       
    };
    // Is this a regular array? 
    // At this point this does not check for type....
    var isRegular = function isRegular() {
        if (this.isKnownRegular === undefined) {
            if (this.flat) {
                this.isKnownRegular = true; // this probable should be changed to something isKnownRegular.
            } else {
                // Construct the indices for the first element
                var thisLevel = new Array(0);
                var indices = new Array(0);
                var level = this;
                while (level instanceof ParallelArray) {
                        indices.push(level.length);
                            level = level.get(0);
                    }
                // indices holds the length of the indices with the biggest at the start.
                if (this.isRegularIndexed(indices)) {
                    this.shape = indices;
                    this.isKnownRegular = true;
                } else {
                    this.isKnownRegular = false;
                }
            }
        } 
        
        return this.isKnownRegular;
    };
    // Get the shape of a regular array down to the depth requested.
    // Input depth maximum number of indices to invstigate.
    // If not provided then depth is infinite.
    var getShape = function getShape(depth) {
        if (!this.isRegular()) {
            throw new TypeError("this is not a regular ParallelArray.");
        }
        return (depth === undefined) ? this.shape.slice(0) : this.shape.slice(0, depth);
    };
   
    // When in the elemental function f "this" is the same as "this" in combine.
    var combineSeq = function combineSeq(depth, f) { // optional arguments follow
        var i;
        var result;
        var extraArgs; 
        var extraArgOffset = 2;
        if ((typeof(depth) === 'function') || (depth instanceof low_precision.wrapper)) {
            f = depth;
            depth = 1;
            extraArgOffset = 1;
        }
        if (f instanceof low_precision.wrapper) {
            f = f.unwrap();
        }
        if (!this.isRegular()) {
            throw new TypeError("ParallelArray.combineSeq this is not a regular ParallelArray.");
        }
        if (arguments.length == extraArgOffset) {
            extraArgs = new Array();
        } else {
            extraArgs = new Array(arguments.length-extraArgOffset);
            for (i=0;i<extraArgs.length;i++) {
               extraArgs[i] = arguments[i+extraArgOffset];
            }
        }
        result = buildRaw(this, (new Array(0)), this.getShape(depth), f, extraArgs, false);
        // SAH temporarily until cast is implemented
        return new ParallelArray(result);
        return new ParallelArray(this.data.constructor, result);
    };

    // combine implements the openCL parallel version of combine.  
    // When in the elemental function f "this" is the same as "this" in combine.

    /***
    Combine
    Overview 
        Similar to map except this is the entire array and an index is provided since you have the entire array you can access other elements in the array. 

    Arguments
        depth – the number of dimensions traversed to access an element in this
        Elemental function described below
        Optional arguments passed unchanged to elemental function

    Elemental Function 
        this - The ParallelArray
        index	Location in combine’s result where the result of the elemental function is placed.  Suitable as the first argument to “get” to retrieve source values.
        Optional arguments
            Same as the optional arguments passed to combine
        Result
            An element to be placed in combine’s result at  the location indicated by index

    Returns
        A freshly minted ParallelArray whose elements are the results of applying the elemental function.

    Example: an identity function
        pa.combine(function(i){return this.get(i);})

    ***/
    var combine = function combine(depth, f) { // optional arguments follow
        var i;
        var paResult;
        var extraArgs; 
        var extraArgOffset = 2;
        if ((typeof(depth) === 'function') || (depth instanceof low_precision.wrapper)) {
            f = depth;
            depth = 1;
            extraArgOffset = 1;
        }
        if (!this.isRegular()) {
            throw new TypeError("ParallelArray.combine this is not a regular ParallelArray.");
        }
        if (arguments.length == extraArgOffset) {
            extraArgs = new Array(0);
        } else {
            // depth is _not_ part of the arguments passed to the elemental function
            extraArgs = new Array(arguments.length-extraArgOffset); // depth and function account for the 2
            for (i=0;i<extraArgs.length;i++) {
               extraArgs[i] = arguments[i+extraArgOffset];
            }
        }

        paResult = RiverTrail.compiler.compileAndGo(this, f, "combine", depth, extraArgs, enable64BitFloatingPoint);
        return paResult;
    };
        
    /**
      Fundamental Constructs of ParallelArray – the minimal set from which you should be able to cleanly express
      90% of the useful constructs needed by programmers. 
          
      Map, 
      Combine, 
      Reduce, 
      Scan, 
      Scatter
      Partition, 
      filter 
     **/
        
    /***
    mapSeq

    Elemental Function
        this - the entire ParallelArray 
        val - an element from the ParallelArray
        Optional arguments - Same as the optional arguments passed to map 
    
    Result
        An element to be placed in the result at the same offset we found “this”
 	
    Returns
        A freshly minted ParallelArray 
        Elements are the results of applying the elemental function to the 
            elements in the original ParallelArray plus any optional arguments.

    Example: an identity function
        pa.map(function(val){return val;})
    ***/

    var mapSeq = function mapSeq (f) { // extra args passed unchanged and unindexed.
        var len = this.shape[0];
        var i, j;
        var fTemp = f;
        var args = new Array(arguments.length-1);
        var result = new Array(len);
        
        // SAH: for now we have to manually unwrap. Proxies might be a solution but they 
        //      are too underspecified as of yet
        if (f instanceof low_precision.wrapper) {
            f = f.unwrap();
        }

        if (arguments.length == 1) { // Just a 1 arg function.
            for (i=0;i<len;i++) {
                result[i] = f.apply(this, [this.get(i)]);
            }
        } else {
            for (i=0;i<len;i++) {
                for (j=1;j<arguments.length;j++) {
                    args[j] = arguments[j];
                }              
                args[0] = this.get(i);
                result[i] = f.apply(this, args);
            }
        }
        // SAH: temporary fix until we use cast
        if (this.data.constructor === Float32Array) {
            // Not sure what to do here we have a Float32Array and we are using
            // these typed arrays to hold our data. Maintaining Float32Array will
            // potentially only loose precision, this is less of a problem than
            // converting floats to say 8 bit clamped ints. 
            return new ParallelArray(this.data.constructor, result);
        }
        return new ParallelArray(result);
        return new ParallelArray(this.data.constructor, result);
    };
    
    //
    // map - 
    //      Same as mapSeq but uses the OpenCL optimized version.
    //

    var map = function map (f) { // extra args passed unchanged and unindexed.
        var len = this.shape[0];
        var args = new Array(arguments.length-1);
        var paResult;
        if (arguments.length === 1) { // no extra arguments present
            paResult = RiverTrail.compiler.compileAndGo(this, f, "map", 1, args, enable64BitFloatingPoint);
        } else {            
            for (var j=1;j<arguments.length;j++) {
                args[j-1] = arguments[j];                    
            }
            paResult = RiverTrail.compiler.compileAndGo(this, f, "map", 1, args, enable64BitFloatingPoint); 
        }
        return paResult;
    };
        
    /***
    reduce
    Arguments
        Elemental function described below.
        Optional arguments passed unchanged to elemental function

    Elemental Function 
        this - the entire ParallelArray 
        a, b - arguments to be reduced and returned
        Optional arguments - Same as the optional arguments passed to map 
        Result
            The result of the reducing a and b, typically used in further 
            applications of the elemental function.

    Returns
        The final value, if the ParallelArray has only 1 element then that element is returned.

    Discussion
        Reduce is free to group calls to the elemental function in arbitrary ways and 
        order the calls arbitrarily. If the elemental function is associative then the 
        final result will be the same regardless of the ordering.  For integers addition 
        is an example of an associative function and the sum of a ParallelArray will 
        always be the same regardless of the order that reduces calls addition. Average 
        is an example of non-associative function. Average(Average(2, 3), 9) is 5 2/3 
        while Average(2, Average(3, 9)) is 4. Reduce is permitted to chose whichever 
        call ordering it finds convenient.

        Reduce is only required to return a result consistent with some call ordering and 
        is not required to chose the same call ordering on subsequent calls. Furthermore, 
        reduce does not magically resolve problems related to the well document fact 
        that some floating point numbers are not represented exactly in JavaScript 
        and the underlying hardware.

        Reduce does not require the elemental function be communitive since it does
        induce reordering of the arguments passed to the elemental function's.
    ***/

    var reduce = function reduce(f, optionalInit) {
        // SAH: for now we have to manually unwrap. Proxies might be a solution but they 
        //      are too underspecified as of yet
        if (f instanceof low_precision.wrapper) {
            f = f.unwrap();
        }

        var len = this.shape[0];
        var result;
        var i;

        result = this.get(0);
        for (i=1;i<len;i++) {
            result = f.call(this, result, this.get(i));
        }

        return result;
    };
    /***
        scan
    
        Arguments
            Elemental function described below
            Optional arguments passed unchanged to elemental function

        Elemental Function 
            this - the entire ParallelArray 
            a, b - arguments to be reduced and returned
            Optional arguments - Same as the optional arguments passed to scan
            Result - The result of the reducing a and b, typically used in further 
            applications of the elemental function.
 
        Returns
            A freshly minted ParallelArray whose ith elements is the results of 
            using the elemental function to reduce the elements between 0 and i
            in the original ParallelArray.

        Example: an identity function
            pa.scan(function(a, b){return b;})

        Discussion:
            We implement what is known as an inclusive scan which means that
            the value of the ith result is the [0 .. i].reduce(elementalFunction) 
            result. Notice that the first element of the result is the same as 
            the first element in the original ParallelArray. An exclusive scan can
            be implemented by shifting right end off by one the results 
            of an inclusive scan and inserting the identity at location 0. 
            Similar to reduce scan can arbitrarily reorder the order the calls to 
            the elemental functions. Ignoring floating point anomalies, this 
            cannot be detected if the elemental function is associative so 
            using a elemental function such as addition to create a partial 
            sum will produce the same result regardless of the 
            order in which the elemental function is called. However using a 
            non-associative function can produce different results due to the 
            ordering that scan calls the elemental function. While scan will 
            produce a result consistent with a legal ordering the ordering and the 
            result may differ for each call to scan. 

        Typically the programmer will only call scan with associative functions 
        but there is nothing preventing them doing otherwise.
    ***/
    var scan = function scan(f) {    
        // SAH: for now we have to manually unwrap. Proxies might be a solution but they 
        //      are too underspecified as of yet
        if (f instanceof low_precision.wrapper) {
            f = f.unwrap();
        }

        if (this.getShape()[0] < 2) {
            // 
            // handle case where we only have one row => the result is the first element
            //
            return this;
        }
        var i;

        var len = this.length;
        var rawResult = new Array(len);
        var privateThis;
        var callArguments = Array.prototype.slice.call(arguments, 0); // array copy
        var ignoreLength = callArguments.unshift(0); // callArguments now has 2 free location for a and b.
        if (this.getShape().length < 2) {
            // 
            // Special case where selection yields a scalar element. Offloading the inner
            // kernel to OpenCL is most likely not beneficial and we cannot use the offset
            // based selection as get does not yield a Parallel Array. Using a naive for
            // loop instead.
            //
            rawResult[0] = this.get(0);
            for (i=1;i<len;i++) {
                callArguments[0] = rawResult[i-1];
                callArguments[1] = this.get(i);;
                rawResult[i] = f.apply(this, callArguments);
            }
            return (new ParallelArray(rawResult));
        }
        // 
        // We have a n-dimensional parallel array, so we try to use offset based selection
        // and speculative OpenCL exectution
        //
        var scanCount = 0;
        var copySize;
        // Mutable and knows about the internal offset structure.
        // The offset now points to the second element this.data[1].
        // since the first one is the first one in the result.
        // Pick up the stride from this to use to step through the array
        var localStride = this.strides[0];

        if (useUpdateInPlaceScan) {
            // SAH: I speculate that the scan operation is shape uniform. If it is not, 
            //      performance goes down the drain anyways so a few extra executions won't 
            //      matter.
            try {
                rawResult[0] = this.get(0);
                privateThis = this.get(1);
                callArguments[0] = rawResult[0];
                rawResult[1] = f.apply(privateThis, callArguments);
                if ((rawResult[1].data instanceof Components.interfaces.dpoIData) && 
                    equalsShape(rawResult[0].getShape(), rawResult[1].getShape())) {
                    // this was computed by openCL and the function is shape preserving.
                    // Try to preallocate and compute the result in place!
                    // We need the real data here, so materialize it
                    privateThis.materialize();
                    // create a new typed array for the result and store it in updateinplace
                    var updateInPlace = new privateThis.data.constructor(privateThis.data.length);
                    // copy the first line into the result
                    for (i=0; i<localStride; i++) {
                        updateInPlace[i] = this.data[i];
                    }
                    // copy the second line into the result
                    var last = rawResult[1];
                    var result = undefined;
                    last.materialize;
                    for (i=0; i <localStride; i++) {
                        updateInPlace[i+localStride] = last.data[i];
                    }
                    // create a new parallel array to pass as prev
                    var updateInPlacePA = rawResult[0];
                    // swap the data store of the updateInPlacePA
                    updateInPlacePA.data = updateInPlace;
                    // set up the arguments
                    callArguments[0] = updateInPlacePA;
                    // set the write offset and updateInPlace info
                    privateThis.updateInPlacePA = updateInPlacePA;
                    privateThis.updateInPlaceOffset = localStride;
                    privateThis.updateInPlaceShape = last.shape;
                    for (i=2;i<len;i++) {
                        // Effectivey change privateThis to refer to the next element in this.
                        privateThis.offset += localStride;
                        updateInPlacePA.offset += localStride;
                        privateThis.updateInPlaceOffset += localStride;
                        privateThis.updateInPlaceUses = 0;
                        // i is the index in the result.
                        result = f.apply(privateThis, callArguments);
                        if (result.data !== privateThis.updateInPlacePA.data) {
                            // we failed to update in place
                            throw new CompilerAbort("speculation failed: result buffer was not used");
                        }
                    }
                    return new ParallelArray( updateInPlacePA.data, this.shape, this.inferredType);
                } 
            }
            catch (e) {
                // clean up to continute below
                console.log("scan: speculation failed, reverting to normal mode");
                privateThis = this.get(1);
                rawResult[0] = this.get(0);
                callArguments[0] = rawResult[0];
            }
        } else {
            // speculation is disabled, so set up the stage
            privateThis = this.get(1);
            rawResult[0] = this.get(0);
            callArguments[0] = rawResult[0];
            rawResult[1] = f.apply(privateThis, callArguments);
        }
        
        for (i=2;i<len;i++) {
            // Effectivey change privateThis to refer to the next element in this.
            privateThis.offset += localStride;
            callArguments[0] = rawResult[i-1];
            // i is the index in the result.
            rawResult[i] = f.apply(privateThis, callArguments);
        }
        return (new ParallelArray(rawResult));
    };
            
    /***
    filter
        Arguments
            Elemental function described below
            Optional arguments passed unchanged to elemental function

        Elemental Function 
            this - The ParallelArray
            index - The location in “this” where the source element is found. 
            Optional arguments - Same as the optional arguments passed to filter
            Result
                true (true, 1, or other JavaScript truthy value) 
                    if the source element should be placed in filter’s result.
                false (false, 0, undefined, or other JavaScript falsey value) 
                    if the source element should not to be placed in filter’s result. 
 
        Returns
            A freshly minted ParallelArray holding source elements where the 
            results of applying the elemental function is true. The order of 
            the elements in the returned ParallelArray is the same as the order 
            of the elements in the source ParallelArray. 

        Example: an identity function
            pa.filter(function(){return true;})
            
    ***/
    var filter = function filter(f) {
        var len = this.length;
        // Generate a ParallelArray where t means the corresponding value is in the resulting array.
        var boolResults = combineSeq.apply(this, arguments);
        var rawResult;
        var i, j;
        var resultSize = 0;
        for (i=0;i<this.length;i++) {
            if (boolResults.get(i) != 0) {
                resultSize++;
            }
        }
        rawResult = new Array(resultSize);
        j = 0;
        for (i=0;i<len;i++) {
            if (boolResults.get(i) == 1) {
                rawResult[j] = this.get(i);
                j++;
            }
        }
        return (new ParallelArray(rawResult));
    };
    
   

    /***
    scatter
        Arguments
            indices: array of indices in the resulting array
            defaultValue:   optional argument indicating the value of elements not set by scatter
                            When not present, the default value is 'undefined’
            conflictFunction: optional function to resolve conflicts, details below.
            length: optional argument indicating the length of the resulting array.
                    If absent, the length is the same as the length of the indices argument 
            Note that scatter does not take an elemental function
            Optional arguments are ignored.
        Returns
            A freshly minted ParallelArray A whose elements are the result of:
                A[indices[i]] = this[i], when indices[i] is unique
                A[indices[i]] = conflictFunction(index, A[indices[i]],) 
                    when A[indices[i]] has a previously assigned value. 
                defaultValue, when index is not present in 'indices' array

        Example: an identity function
            pa.scatter(indices);
            where indices is a ParallelArray where element === index

        Handling conflicts
            Conflicts result when multiple elements are scattered to the same location.
            Conflicts results in a call to conflictFunction, which is an 
                optional third argument to scatter

            Arguments
                this is value from the source array that is currently being scattered
                Previous value – value in result placed there by some previous iteration

            It is the programmer’s responsibility to provide a conflictFunction that is 
            associative and commutative since there is no guarantee in what order the 
            conflicts will be resolved. 

            Returns
                Value to place in result[indices[index]]

            Example: Resolve conflict with larger number
                chooseMax(prev){
                    return (this>prev)?this:prev;
                } 
                
        ***/
    var scatter = function scatter(indices, defaultValue, conflictFunction, length) {
        var result;
        var len = this.shape[0];
        var hasDefault = (arguments.length >= 2);
        var hasConflictFunction = (arguments.length >=3 && arguments[2] != null);
        var newLen = (arguments.length >= 4 ? length : len);
                
        var rawResult = new Array(newLen);
        var conflictResult = new Array(newLen);
        var i;
                
        if (hasDefault) {
            for (i = 0; i < newLen; i++) {
                rawResult[i] = defaultValue;
            }
        } 
    
        for (i = 0; i < indices.length; i++) {
            var ind = (indices instanceof ParallelArray) ? indices.get(i) : indices[i];
            if (ind >= newLen) throw new RangeError("Scatter index out of bounds");
            if (conflictResult[ind]) { // we have already placed a value at this location
                if (hasConflictFunction) {
                    rawResult[ind] = 
                        conflictFunction.call(undefined, this.get(i), rawResult[ind]); 
                } else {
                    throw new RangeError("Duplicate indices in scatter");
                }
            } else {
                rawResult[ind] = this.get(i);
                conflictResult[ind] = true;
            }
        }
        result = new ParallelArray(rawResult);
        return result;
    };    
    
    /*** End of the fundemental constructts */
        
        
    /***
      getArray
      Synopsis:
      
      getArray();
      Arguments: none
          
      Returns
      Returns a JS array holding a copy of the elements from the ParallelArray.
      If the element is a ParallelArray then it's elemets are also copied in to a JS Array.
     ***/
    var getArray = function getArray () {
        var i, result;
        if ((this.flat) && (this.shape.length === 1)) {
            result = Array.prototype.slice.call(this.data, this.offset, this.offset + this.length);
        } else {
            result = new Array(this.length);
            for (i=0; i<this.length; i++) {
                var elem = this.get(i);
                if (elem instanceof ParallelArray) {
                    result[i] = elem.getArray();
                } else {
                    result[i] = elem;
                }
            }
        }
        return result;
    };
    
    // This takes a ParallelArray and creates a similar JavaScript array.
    // By similar the array returned will be of a cononical type. In
    // particular it will be whatever type the data in the ParallelArray
    // is held in. A Float32Array would be returned if the original ParallelArray
    // held the actual data in a Float32Array.
    var getData = function getData() {
        var result = new this.data.constructor(this.data);
        return result;
    };
    /***
      get
      Synopsis:
      get(index);
      Arguments
      index: a integer indicating that you want the element in the highest rank,
      typically this is used for vectors.
      index: an array of integers indicating that you want an element in a multiple dimension
      array. 
      Returns
      The element refered to by the index/indices.
     ***/
    var get = function get (index) {
        var i;
        var result;
        var offset;
        var argsAsArray; // For converting from arguements into a real array.
        if (this.flat) {
            if (index instanceof Array) {
                offset = this.offset;
                var len = index.length;
                for (i=0;i<len;i++) {
                    // if we go out of bounds, we return undefined
                    if (index[i] < 0 || index[i] >= this.shape[i]) return undefined;
                    offset = offset + index[i]*this.strides[i];
                }
                if (this.shape.length === index.length) {
                    return this.data[offset];
                } else {
                    // build a ParallelArray.
                    result = new ParallelArray(this);
                    result.offset = offset;
                    result.elementalType = this.elementalType;
                    /* need to fix up shape somehow. */
                    result.shape = this.shape.slice(index.length);
                    result.strides = this.strides.slice(index.length); 
                    /* changing the shape might invalidate the _fastClasses specialisation, 
                     * so better ensure things are still fine
                     */
                    if (result.__proto__ !== ParallelArray.prototype) {
                        result.__proto__ = _fastClasses[result.shape.length].prototype;
                    }
                    return result;
               }
            } 
            //  else it is flat but not (index instanceof Array) 
            if (arguments.length == 1) { 
                // One argument that is a scalar index.
                if ((index < 0) || (index >= this.shape[0])) return undefined;
                if (this.shape.length == 1) {
                    // a 1D array
                    return this.data[this.offset + index];
                } else {
                    // we have a nD array and we want the first dimension so create the new array
                    offset = this.offset+this.strides[0]*index;
                    // build a ParallelArray.
                    result = new ParallelArray(this);
                    result.offset = offset;
                    result.elementalType = this.elementalType;
                    /* need to fix up shape somehow. */
                    result.shape = this.shape.slice(1);
                    result.strides = this.strides.slice(1); 
                    return result;
                }
            }
            // Still a flat array but more than on argument, turn into an array and recurse.
            argsAsArray = Array.prototype.slice.call(arguments);
            return this.get(argsAsArray);
        } // end flat array path.
        
        if (arguments.length == 1) {
            if (!(arguments[0] instanceof Array)) {
                return this.data[index];
            } else {
                // not flat, index is an array of indices.
                result = this;
                for (i=0;i<arguments[0].length;i++) {
                    result = result.data[arguments[0][i]];
                    // out of bounds => abort further selections
                    if (result === undefined) return result;
                }
                return result;
            }
        }
        // not flat, more than one argument.
        
        result = this;
        for (i=0;i<arguments.length;i++) {
            result = result.data[arguments[i]];
            // out of bounds => abort further selections
            if (result === undefined) return result;
        }
        return result;
    };
        
    
    // Write content of parallel array into a canvas
    // XXX: Assumes that image is going to fill the whole canvas
    var writeToCanvas = function writeToCanvas(canvas) {
        var i;
        var context = canvas.getContext("2d");
            var currImage = context.getImageData(0, 0, canvas.width, canvas.height);
            var imageData = context.createImageData(currImage.width, currImage.height);
            var data = imageData.data;
            if (useFF4Interface && (this.data instanceof Components.interfaces.dpoIData)) {
                this.data.writeTo(data);
            } else {
                for (var i = 0; i < this.data.length; i++) {
                    data[i] = this.data[i];
                }
            }
        context.putImageData(imageData, 0, 0);
    };

    //      Some functions that mimic the JavaScript Array functionality ***

    //      The array object has the following prototype methods that are also implemented
    //      for ParallelArray.
    //          
    //      concat() 
    //      join()  
    //      slice()
    //      toString() 

    //      See 

    //      https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array

    //      for a description.
    //          
    //     
        
        
    // concat() Joins two or more arrays, and returns a copy of the joined arrays
    var concat = function concat () {
        var len = arguments.length;
        var result; 
        var applyArgs;
        var allTypedArrays = isTypedArray(this.data);
        var allArrays = (this.data instanceof Array);
        var resultLength = this.length;
        var offset = 0;
        var i, j;
        applyArgs = new Array(arguments.length);
        for (var i=0; i<len; i++) {
            applyArgs[i] = arguments[i];
            resultLength += arguments[i].length;
            if (allTypedArrays) {
                // if this and previous are true check if this arg uses typed arrays.
                allTypedArrays = isTypedArray(arguments[i].data);
                allArrays = false;
            }
            if (allArrays) {
                // this and all previous are Arrays.
                allArrays = (arguments[i].data instanceof Array);
            }
        }
        
        if (allTypedArrays) {
            return concatTypedArrayData.apply(this, applyArgs);
        }
        if (allArrays) {
            return concatArrayData.apply(this, applyArgs);
        }
        // Nothing simple just do it like the old fashion way, one element at a time. 
        result = new Array(resultLength);
        // Do this
        for (i=0;i<this.length;i++) {
            result[offset] = this.get(i);
            offset++;
        }
        // Do the arguments
        for (i=0;i<arguments.length; i++) {
            for (j=0; j<arguments[i].length;j++) {
                result[offset] = arguments[i].get(j);
                offset++;
            }
        }
        return new ParallelArray(result);
    };
                
    // concatTypedArrayData() Joins two or more arrays using typed arrays, and 
    // returns a copy of the joined arrays
    var concatTypedArrayData = function concatTypedArrayData () {
        var len = arguments.length;
        var result; 
        var applyArgs;
        var i;
        var resultLength = this.length;
        var offset;
            
        for (i=0;i<arguments.length;i++) {
            resultLength += arguments[i].length;
        }
        result = this.data.constructor(resultLength);
        result.set(this.data);
        offset = this.length;
        for (i=0; i<len; i++) {
            result.set(arguments[i].data, offset);
            offset = offset + arguments[i].length;
        }
        return new ParallelArray (result);
    };
    // concatTypedArrayData() Joins two or more arrays using typed arrays, and 
    // returns a copy of the joined arrays
    var concatArrayData = function concatArrayData () {
        var i;
        var result = new Array();
        result = result.concat(this.data);
        for (i=0;i<arguments.length;i++) {
            result = result.concat(arguments.data);
        }
        return new ParallelArray (result);
    };

    // join()       Joins all elements of an array into a string
    var join = function join (arg1) {
        var result;
        if (!arg1) {
            result = this.data.join();
        } else {
            if (arg1 instanceof ParallelArray) {
                result = this.data.join(arg1.data);
            } else {
                result = this.data.join(arg1);
            }
        }
        return result;
    };
    
    // pop()        Removes the last element of an array, and returns that element
    var pop = function pop (f) {
        throw new TypeError("ParallelArray has no method 'pop' - it is a read only construct.");
    };
    // push()       Adds new elements to the end of an array, and returns the new length
    var push = function push (f) {
        throw new TypeError("ParallelArray has no method 'push' - it is a read only construct.");
    };
    // reverse()    Reverses the order of the elements in an array
    var reverse = function reverse (f) {
            throw new TypeError("ParallelArray has no method 'reverse' - it is a read only construct.");
    };
    // shift()      Removes the first element of an array, and returns that element
    var shift =  function shift (f) {
        throw new TypeError("ParallelArray has no method 'shift' - it is a read only construct.");
    };
    // slice()      Selects a part of an array, and returns the new array
    var slice = function slice (startArg, endArg) {
        var result;
        if (isTypedArray(this.data)) {
            // typed arrays use subset instead of slice.
            return new ParallelArray(this.data.subarray(startArg, endArg));
        }
        return new ParallelArray(this.data.slice(startArg, endArg));
    };
    
    // sort()       Sorts the elements of an array
    var sort = function sort (f) {
        throw new TypeError("ParallelArray has no method 'sort' - it is a read only construct.");
    };
    // splice() Adds/Removes elements from an array
    var splice = function splice (f) {
        throw new TypeError("ParallelArray has no method 'splice' - it is a read only construct.");
    };
    
    // toString()   Converts an array to a string, and returns the result
    var toString = function toString (arg1) {
        var max = this.shape.reduce(function (v, p) { return v*p; }) + this.offset;
        var res = "[";
        for (var pos = this.offset; pos < max; pos++) {
            res += ((pos === this.offset) ? "" : ", ") + this.data[pos];
        }
        res += "]";
        return res;
    };
    
    // unshift()    Adds new elements to the beginning of an array, and returns the new length
    var unshift = function unshift (f) {
        throw new TypeError("ParallelArray has no method 'unshift' - it is a read only construct.");
    };
    
    var flatten = function flatten () {
        var len = this.length;
        var newLength = 0;
        var shape;
        var i;
        if (this.flat) {
            shape = this.getShape();
            if (shape.length == 1) {
                throw new TypeError("ParallelArray.flatten array is flat");
            }
            var newShape = shape.slice(1);
            newShape[0] = newShape[0] * shape[0];
            return new ParallelArray("reshape", this, newShape);
        }
        for (i=0;i<len;i++) {
            if (this.get(i) instanceof ParallelArray) {
                newLength = newLength+this.get(i).length;
            } else {
                throw new TypeError("ParallelArray.flatten not a ParallelArray of ParallelArrays.");
            }
        }
        var resultArray = new Array(newLength);
        var next = 0;
        for (i=0;i<len;i++) {
            var pa = this.get(i);
                for (j=0; j<pa.length; j++) {
                    resultArray[next] = pa.get(j);
                        next++;
                }
        }
        
        return new ParallelArray(resultArray);
    };
    var flattenRegular = function flattenRegular () {
        var result;
        if (this.flat) {
            result = new ParallelArray(this);
            result.strides = [1];
            result.shape = [shapeToLength(this.shape)];
            result.offset = 0;
            return result;
        }
         var fillArray = function fillArray ( src, offset, dest) {
            if (src.length !== 0) {
                if (src.get(0) instanceof ParallelArray) {
                    for (var pos = 0; pos < src.length; pos++) {
                        offset = fillArray( src.get(pos), offset, dest);
                    }
                } else {
                    for (var pos = 0; pos < src.length; pos++) {
                        dest[offset] = src.get(pos);
                        offset++;
                    }
                }
            }
            return offset;
        }
        if (!this.isRegular()) {
            throw new TypeError("ParallelArray.flatten called on non-regular array");
        }
        var newLength = this.shape.reduce(function (a,b) { return a * b;}, 1);
        var resultArray = new Array( newLength);
        fillArray( this, 0, resultArray);
         return new ParallelArray( resultArray);
    };

    var inferType = function inferType () {
        // TODO: deprecated, delete for good
        throw "inferType is no longer here!";
    };

    var _fastClasses = function () {

        var Fast0DPA = function (pa) { 
            // shallow copy of object w/o attributes inherited from prototype
            //
            // SAH: The following generic code would be nice to use, but it prevents
            //      some optimisation in Spidermonkey (layout analysis?) and this
            //      has a huge runtime cost...
            //
            // var keys = Object.keys(pa);
            // for (idx in keys) {
            //     this[keys[idx]] = pa[keys[idx]];
            // }
            this.shape = pa.shape;
            this.strides = pa.strides;
            this.offset = pa.offset;
            this.elementalType = pa.elementalType;
            this.data = pa.data;
            this.flat = pa.flat;
            return this;
        }
        Fast0DPA.prototype = {
            "get" : function fastGet0D () {
                if (arguments.length === 0) {
                    return this;
                } else {
                    throw "too many indices in get call";
                }
            }
        };

        var Fast1DPA = function (pa) { 
            // shallow copy of object w/o attributes inherited from prototype
            //
            // SAH: The following generic code would be nice to use, but it prevents
            //      some optimisation in Spidermonkey (layout analysis?) and this
            //      has a huge runtime cost...
            //
            // var keys = Object.keys(pa);
            // for (idx in keys) {
            //     this[keys[idx]] = pa[keys[idx]];
            // }
            this.shape = pa.shape;
            this.strides = pa.strides;
            this.offset = pa.offset;
            this.elementalType = pa.elementalType;
            this.data = pa.data;
            this.flat = pa.flat;
            return this;
        }
        Fast1DPA.prototype = {
            "get" : function fastGet1D (index) {
                var aLen = arguments.length;
                if (aLen === 1) {
                    if (typeof(index) === "number") {
                        if ((index < 0) || (index >= this.shape[0])) return undefined;
                        return this.data[this.offset + index];
                    } else {
                        /* fall back to slow mode */
                        return this.__proto__.__proto__.get.call(this, index);
                    }
                } else if (aLen === 0) {
                    return this;
                } else {
                    throw "too many indices in get call";
                }
            }
        };

        var Fast2DPA = function (pa) { 
            // shallow copy of object w/o attributes inherited from prototype
            //
            // SAH: The following generic code would be nice to use, but it prevents
            //      some optimisation in Spidermonkey (layout analysis?) and this
            //      has a huge runtime cost...
            //
            // var keys = Object.keys(pa);
            // for (idx in keys) {
            //     this[keys[idx]] = pa[keys[idx]];
            // }
            this.shape = pa.shape;
            this.strides = pa.strides;
            this.offset = pa.offset;
            this.elementalType = pa.elementalType;
            this.data = pa.data;
            this.flat = pa.flat;
            return this;
        }
        Fast2DPA.prototype = {
            "get" : function fastGet2D (index, index2) {
                var result;
                var aLen = arguments.length;
                if (aLen === 2) {
                    if ((index < 0) || (index >= this.shape[0]) || (index2 < 0) || (index2 >= this.shape[1])) return undefined;
                    return this.data[this.offset + index * this.strides[0] + index2];
                } else if (aLen === 1) {
                    if (typeof index === "number") {
                        if ((index < 0) || (index >= this.shape[0])) return undefined;
                        result = new Fast1DPA(this);
                        result.offset = this.offset + index * this.strides[0];
                        result.elementalType = this.elementalType;
                        /* need to fix up shape somehow. */
                        result.shape = this.shape.slice(1);
                        result.strides = this.strides.slice(1); 
                        return result;
                    } else {
                        /* fall back to slow mode */
                        return this.__proto__.__proto__.get.call(this, index);
                    }
                } else if (aLen === 0) {
                    return this;
                } else {
                    throw "too many indices in get call";
                }
            }
        };
        var Fast3DPA = function (pa) { 
            // shallow copy of object w/o attributes inherited from prototype
            //
            // SAH: The following generic code would be nice to use, but it prevents
            //      some optimisation in Spidermonkey (layout analysis?) and this
            //      has a huge runtime cost...
            //
            // var keys = Object.keys(pa);
            // for (idx in keys) {
            //     this[keys[idx]] = pa[keys[idx]];
            // }
            this.shape = pa.shape;
            this.strides = pa.strides;
            this.offset = pa.offset;
            this.elementalType = pa.elementalType;
            this.data = pa.data;
            this.flat = pa.flat;
            return this;
        }
        Fast3DPA.prototype = {
            "get" : function fastGet3D (index, index2, index3) {
                var result;
                var aLen = arguments.length;
                if (aLen === 3) {
                    if ((index < 0) || (index >= this.shape[0]) || (index2 < 0) || (index2 >= this.shape[1]) || (index3 < 0) || (index3 >= this.shape[2])) return undefined;
                    return this.data[this.offset + index * this.strides[0] + index2 * this.strides[1] + index3];
                } else if (aLen === 2) {
                    if ((index < 0) || (index >= this.shape[0]) || (index2 < 0) || (index2 >= this.shape[1])) return undefined;
                    result = new Fast1DPA(this);
                    result.offset = this.offset + index * this.strides[0] + index2 * this.strides[1];
                    result.elementalType = this.elementalType;
                    /* need to fix up shape somehow. */
                    result.shape = this.shape.slice(2);
                    result.strides = this.strides.slice(2); 
                    return result;
                } else if (aLen === 1) {
                    if (typeof index === "number") {
                        if ((index < 0) || (index >= this.shape[0])) return undefined;
                        result = new Fast2DPA(this);
                        result.offset = this.offset + index * this.strides[0];
                        result.elementalType = this.elementalType;
                        /* need to fix up shape somehow. */
                        result.shape = this.shape.slice(1);
                        result.strides = this.strides.slice(1); 
                        return result;
                    } else {
                        /* fall back to slow mode */
                        return this.__proto__.__proto__.get.call(this, index);
                    }
                } else {
                    throw "too many indices in get call";
                }
            }
        };

        return [Fast0DPA,Fast1DPA,Fast2DPA,Fast3DPA];
    }();

    function ParallelArray () {
        var i, j;
        var args;
        var result = this;

        for (i=0;i<fingerprintTracker.length;i++) {
            if (fingerprint === fingerprintTracker[i]) {
                console.log ("(fingerprint === fingerprintTracker)");
            }
        }

        if (arguments.length == 0) {
            result = createEmptyParallelArray.call(this);
        } else if (arguments.length == 1) {     
            result = createSimpleParallelArray.call(this, arguments[0]);
        } else if ((arguments.length == 2) && (typeof(arguments[0]) == 'function')) {
            // Special case where we force the type of the result. Should only be used internally
            result = createSimpleParallelArray.call(this, arguments[1], arguments[0]);
        } else if ((arguments.length == 3) && (arguments[0] == 'reshape')) {
            // special constructor used internally to create a clone with different shape
            result = this;
            result.shape = arguments[2];
            result.strides = shapeToStrides(arguments[2]);
            result.offset = arguments[1].offset;
            result.elementalType = arguments[1].elementalType;
            result.data = arguments[1].data;
            result.flat = arguments[1].flat;
        } else if (useFF4Interface && (arguments[0] instanceof Components.interfaces.dpoIData)) {
            result = createOpenCLMemParallelArray.apply(this, arguments);
        } else if (typeof(arguments[1]) === 'function') {    
            var extraArgs;
            if (arguments.length > 2) {
                extraArgs = new Array(arguments.length -2); // skip the size vector and the function
                for (i=2;i<arguments.length; i++) {
                    extraArgs[i-2] = arguments[i];
                }
            } else {
                // No extra args.
                extraArgs = new Array(0);
            }
            result = createComprehensionParallelArray.call(this, arguments[0], arguments[1], extraArgs);
        } else {
            // arguments.slice doesn't work since arguments is not really an array so use this approach. 
            var argsAsArray = Array.prototype.slice.call(arguments);
            result = createSimpleParallelArray.call(this, argsAsArray);
        }
    
        for (i=0;i<fingerprintTracker.length;i++) {
            if (fingerprint === fingerprintTracker[i]) {
                console.log ("(fingerprint === fingerprintTracker)");
            }
        }
        result.uniqueFingerprint = fingerprint++;
        
        // use fast code for get if possible
        if (result.flat && result.shape && result.shape.length < 4) {
            result = new _fastClasses[result.shape.length](result);
        }
    
        if (enableProxies) {
            try { // for Chrome/Safari compatability
                result = Proxy.create(makeIndexOpHandler(result), ParallelArray.prototype);
            } catch (ignore) {}
        }

        if (useFF4Interface && (result.data instanceof Components.interfaces.dpoIData)) {
            if (useLazyCommunication) {
                // wrap all functions that need access to the data
                requiresData(result, "get");
                //requiresData(result, "partition");
                requiresData(result, "concat");
                requiresData(result, "join");
                requiresData(result, "slice");
                requiresData(result, "toString");
                requiresData(result, "getArray");
            } else {
                result.materialize();
            }  
        }

        return result;
    };

    ParallelArray.prototype = {
        /***
        length
        ***/
        // The getter for ParallelArray, there is actually no setter.
        // NOTE: if this array is non-flat, the length is the length of the data
        //       store. Otherwise it is the first element of the shape. One could
        //       use getShape in both cases, but that will trigger a long computation
        //       for non-flat arrays, which in turn relies on length :-D
        //
        get length () {
            return (this.flat ? this.getShape()[0] : this.data.length);
        },
        set verboseDebug (val) {
            RiverTrail.compiler.verboseDebug = val;
        },
        set suppressOpenCL (val) {
            suppressOpenCL = val;
        },
        "materialize" : materialize,
        "partition" : partition,
        "isRegularIndexed" : isRegularIndexed,
        "isRegular" : isRegular,
        "getShape" : getShape,
        "map" : map,
        "mapSeq" : mapSeq,
        "combine" : combine,
        "combineSeq" : combineSeq,
        "reduce" : reduce,
        "scan" : scan,
        "filter" : filter,
        "scatter" : scatter,
        "getArray" : getArray,
        "getData" : getData,
        "get" : get,
        "writeToCanvas" : writeToCanvas,
        "concat" : concat,
        "join" : join,
        "pop" : pop,
        "push" : push,
        "reverse" : reverse,
        "shift" : shift,
        "slice" : slice,
        "sort" : sort,
        "splice" : splice,
        "toString" : toString,
        "unshift" : unshift,
        "flatten" : flatten,
        "flattenRegular" : flattenRegular,
        "inferType" : inferType,
        get maxPrecision () { return enable64BitFloatingPoint ? 64 : 32; }
    };
    
    // SAH: Tie up fast classes with the PA prototype. 
    _fastClasses.forEach( function (fc) {fc.prototype.__proto__ = ParallelArray.prototype});

    return ParallelArray;
}(); // end ParallelArray.prototype

var low_precision = function (f) {
    if (typeof(f) !== "function") {
        throw new TypeError("low_precision can only be applied to functions");
    }
    return new low_precision.wrapper(f);
}

low_precision.wrapper = function (f) {
    this.wrappedFun = f;
    return this;
}

low_precision.wrapper.prototype = {
    "unwrap" : function () { return this.wrappedFun; }
};
