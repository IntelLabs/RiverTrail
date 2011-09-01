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

if (RiverTrail === undefined) {
    var RiverTrail = {};
}

RiverTrail.Helper = function () {
    var nodeNames = ["children", "body", "setup", "condition", "update", "thenPart", "elsePart", "expression", "initializer"];

    function traverseAst (ast, f, env) {
        if (ast) {
            ast = f(ast, env);

            for (field in nodeNames) {
                if (ast[nodeNames[field]]) {
                    if (ast[nodeNames[field]] instanceof Array) {
                        ast[nodeNames[field]] = ast[nodeNames[field]].map(function (x) { return traverseAst(x, f, env); });
                    } else {
                        ast[nodeNames[field]] = traverseAst(ast[nodeNames[field]], f, env);
                    }
                }
            }
        }
        return ast;
    }
            
    function wrappedPP (ast) {
        var s;

        try {
            s = Narcissus.decompiler.pp(ast);
        } catch (e) {
            s = "<no source>";
        }

        return s;
    }

    //
    // Function and helpers to infer the type of a Parallel Array
    //
    // https://cvs.khronos.org/svn/repos/registry/trunk/public/webgl/doc/spec/TypedArray-spec.html
    // gives the following Equivalent C types
    var arrayTypeToCType = [
        [Int8Array, "signed char"],
        [Uint8Array, "unsigned char"],
        [Uint8ClampedArray, "unsigned /* clamped */ char"],
        [Int16Array, "short"],
        [Uint16Array, "unsigend short"],
        [Int32Array, "int"],
        [Uint32Array, "unsigned int"],
        [Float32Array, "float"],
        [Float64Array, "double"]
    ];
    
    function constructorToElementalType (constructor) {
        var i;
        for (i=0;i<arrayTypeToCType.length;i++) {
            if (constructor === arrayTypeToCType[i][0]) {
                return arrayTypeToCType[i][1];
            }
        }
        return undefined;
    };

    function elementalTypeToConstructor (type) {
        var i;
        for (i=0;i<arrayTypeToCType.length;i++) {
            if (type === arrayTypeToCType[i][1]) {
                return arrayTypeToCType[i][0];
            }
        }
        return undefined;
    };

    function inferPAType(pa) {
        var dimSize = pa.getShape();
        var elementalType;
        //
        // if we already have type information, we return it.
        // 
        if (pa.elementalType !== undefined) {
            elementalType = pa.elementalType;
        } else {
            var ta = pa.data; // Grab the typed array and deduce its equivelant C type. We do not need to
                              // materialize it here as for unmaterialized arrays the elementalType will be set!
            var i;
            for (i=0;i<arrayTypeToCType.length;i++) {
                if (ta instanceof arrayTypeToCType[i][0]) {
                    elementalType = arrayTypeToCType[i][1];
                    break;
                }
            }
            if (elementalType === undefined) {
                // SAH: I fail here as we do not know the type of this typed array. If it had
                //      a homogeneous type, the constructor would have converted it to a 
                //      typed array.
                throw new TypeError("Cannot infer type for given Parallel Array data container.");
            } 
            // cache type information for next time
            pa.elementalType = elementalType;
        }
        return {"dimSize": dimSize, "inferredType" : elementalType};
    }; 

    function stripToBaseType(s) {
        const regExp = /[a-zA-Z]*/;
        var match = s.match(regExp);
        if (match.length === 1) {
            return match[0];
        } else {
            return undefined;
        }
    }
    
    var Integer = function Integer(value) {
        this.value = value;
        return this;
    };
    
    // helper function that throws an exception and logs it if verboseDebug is on
    var debugThrow = function (e) {
        if (RiverTrail.compiler.verboseDebug) {
            console.log("Exception: " + JSON.stringify(e));
        }
        throw e;
    };

    return { "traverseAst" : traverseAst,
             "wrappedPP" : wrappedPP,
             "inferPAType" : inferPAType,
             "elementalTypeToConstructor" : elementalTypeToConstructor,
             "stripToBaseType" : stripToBaseType,
             "Integer": Integer,
             "debugThrow": debugThrow };

}();
