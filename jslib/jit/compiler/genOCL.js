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

"use strict from within functions only so that Narcissus can define vars using eval.";
// genOCL.js

//
// Richard L. Hudson Intel Corporation
// 2011-7-13
//
// vvvvvvvvvvvvvv Provenance vvvvvvvvvvvvvvvvvvvv
//
// This code was written by Richard Hudson using some
// borrowed infrastructure code from Stephan Herhut.
// Some of the code came form earlier code generators
// which were written by Richard Hudson and Stephan
// Herhut of Intel. 
//
// It uses the Narcissus AST API.
//

if (RiverTrail === undefined) {
    var RiverTrail = {};
}

RiverTrail.compiler.codeGen = (function() {
    const verboseDebug = false;
    const checkBounds = true;
    const checkall = false;
    const conditionalInline = false;
    const verboseErrors = true;
    const parser = Narcissus.parser;
    const definitions = Narcissus.definitions;
    const tokens = RiverTrail.definitions.tokens;

    var RENAME = function (s) { return "RTl_" + s; };

    // Set constants in the local scope.
    eval(definitions.consts);
    eval(RiverTrail.definitions.consts);

    // import error reporting
    var reportError = RiverTrail.Helper.reportError;
    var reportBug = RiverTrail.Helper.reportBug;

    var findSelectionRoot = RiverTrail.Helper.findSelectionRoot;

    // store to hold error messages
    var errorMsgs = [];
    
    var newError = function newError(msg) {
        if (verboseErrors) {
            errorMsgs[errorMsgs.length] = "AT " + (calledScope.inCalledScope() || "<top level>") + ": " + msg;
        }
        return errorMsgs.length; // this is one after the index on purpose!
    };

    var getError = function getError(number) {
        return errorMsgs[number-1] || "unknown error";
    };

    // If you are working inside the top level of actual kernel function then scope is empty.
    // If you generating code for a called function then this will be true.
    var calledScope = function () {
        "use strict";
        // state is private.
        var state = false;
        var enter = function enter(name) {
            state = name || true;
        };
        var exit = function exit(previous) {
            state = previous;
        }
        var inCalledScope = function () {
            return state;
        };
        return {"enter": enter, "exit": exit, "inCalledScope": inCalledScope};
    } ();

    var toCNumber = function (val, type) {
            var res = "";
            if ((type.OpenCLType === "float") || (type.OpenCLType === "double")) {
                res = val; 
                if ((String.prototype.indexOf.call(res, '.') === -1) && (String.prototype.indexOf.call(res, 'e') === -1)) {
                    res += ".0";
                }
                if (type.OpenCLType === "float") {
                    res += "f";
                }
            } else if (type.OpenCLType === "int"){
               res = val;
            } else if (type.OpenCLType === "boolean"){
                res =  val; // CR check that this works.
            } else {
                reportBug("unexpected number value in toCNumber");
            }
            return res;
    };

    //
    // The Ast is set up so that formalsAst.params holds the names of the params specified in the signature
    // of the function.
    // formals.typeInfo.parameters includes the implicit "this" parameter. 
    // This means that the name of information for this is at typeInfo.paramaters[0] and information
    // for the type information for the explicit formals starts at typeInfo.paramaters[1] while
    // the names start at params[0]
    //

    var genFormalParams = function (formalsAst, construct) {
        "use strict";
        if (calledScope.inCalledScope()) {
            return genNonKernelFormalParams(formalsAst);
        } else {
            return genKernelFormalParams(formalsAst, construct);
        }
    };
    // This is for called functions, not the top level kernel function.
    var genNonKernelFormalParams = function (formalsAst) {
        "use strict";
        var i;
        var s = "";
        var formalsNames = formalsAst.params;
        var formalsTypes = formalsAst.typeInfo.parameters;

        for (i = 0; i < formalsTypes.length; i++) {
            if (s !== "" ) { 
                s = s + ", "; // leave out the , before the first parameter
            }

            if (formalsTypes[i].isArrayishType()) {
                // array argument, so needs address space qualifier
                s = s + formalsTypes[i].getOpenCLAddressSpace() + " ";
            }

            s = s + formalsTypes[i].OpenCLType + " " + RENAME(formalsNames[i]);
        }
        return s;
    };

    var genKernelFormalParams = function (formalsAst, construct) {
        "use strict";
        var i;
        var s = "";
        var formalsNames = formalsAst.params;
        var formalsTypes = formalsAst.typeInfo.parameters;
        if (construct === "combine") { 
            // Skip the extra type for this and ignore the first argument.
            // the extras do not include |this| and the first formal since that is the index generated in the body.

            formalsNames = formalsNames.slice(1); // This skips the index argument
            formalsTypes = formalsTypes.slice(2); // This skips this and the index argument
        } else if ((construct === "comprehension") || (construct === "comprehensionScalar")) {
            // ignore the first argument, the index
            formalsTypes = formalsTypes.slice(1);
            formalsNames = formalsNames.slice(1);
        } else if (construct === "map") {
            // Skip the extra type for this
            // Skip the extra type for this and ignore the first argument, which is the value and is set
            // explicitly based on this and the id.
            // the extras do not include |this| and the first formal since that is the value generated in the body.
            formalsTypes = formalsTypes.slice(2); // Skip this and the val argument.
            formalsNames = formalsNames.slice(1); // Skip the val argument
        }

        for (i = 0; i < formalsTypes.length; i++) {
            if (s !== "" ) { 
                s = s + ", "; // leave out the , before the first parameter
            }

            if (formalsTypes[i].isArrayishType()) {
                // array argument, so needs address space qualifier
                s = s + formalsTypes[i].getOpenCLAddressSpace() + " ";
            }

            s = s + formalsTypes[i].OpenCLType + " " + RENAME(formalsNames[i]);
            // array arguments have an extra offset qualifier
            if (formalsTypes[i].isObjectType("ParallelArray")) {
                s = s + ", int " + RENAME(formalsNames[i]) + "__offset"; //offset
            }
        }
        return s;
    };

    var adjustFormalsWithOffsets = function (formalsAst, construct) {
        "use strict";
        var i;
        var s = "";
        var start = 0;
        var formalsNames = formalsAst.params;
        var formalsTypes = formalsAst.typeInfo.parameters;
        if ((construct === "map") || (construct === "combine") || (construct === "comprehension") || (construct === "comprehensionScalar")) {
            // Skip the first argument since it is the index for combine and comprehension and value for map.
            start = 2; // the extras do not include |this| and the first formal since that is the index generated in the body.
        }
        if (construct === "combine") { 
            formalsNames = formalsNames.slice(1); // This skips the index argument
            formalsTypes = formalsTypes.slice(2); // This skips this and the index argument
        } else if ((construct === "comprehension") || (construct === "comprehensionScalar")) {
            formalsTypes = formalsTypes.slice(1);
            formalsNames = formalsNames.slice(1);
        } else if (construct === "map") {
            formalsTypes = formalsTypes.slice(2); // Skip this and the val argument.
            formalsNames = formalsNames.slice(1); // Skip the val argument
        }
        for (i = 0; i < formalsTypes.length; i++) {
            // array arguments have an extra offset qualifier
            if (formalsTypes[i].isObjectType("ParallelArray")) {
                //s = s + formalsNames[i-1] + " = &"+formalsNames[i-1]+"["+formalsNames[i-1]+"__offset];"; //offset
                s = s + RENAME(formalsNames[i]) + " = &"+RENAME(formalsNames[i])+"["+RENAME(formalsNames[i])+"__offset];"; //offset
            } else if (formalsTypes[i].isObjectType("JSArray")) {
                // these are passed with one level of indirection, so we need to unwrap them here
                s = s + RENAME(formalsNames[i]) + " = *((" + RENAME(formalsTypes[i]).getOpenCLAddressSpace() + " double **)" + RENAME(formalsNames[i]) + ");";
            }
        }

        return s;
    };
    // formalsTypeProperty holds "__"+addresSpace+OpenCLType+formalsName+shape
    // Some kernel function formals are calculated in the body, for example index argument to combine and the value
    // argument to map.
    var genFormalRelativeArg = function (funDecl, construct) { //formalsName, formalsType, formalsTypeProperties, construct) {
        "use strict";
        var i;
        var dimSizes;
        var s = " ";
        var indexName, indexType;
        if ((construct === "combine") || (construct === "comprehension") || (construct === "comprehensionScalar")) {
            // The relative argumment is an index.
            if (construct === "combine") {
                indexType = funDecl.typeInfo.parameters[1];
            } else {
                // comprehensions have no this!
                indexType = funDecl.typeInfo.parameters[0];
            }
            indexName = RENAME(funDecl.params[0]);

            // the first argument is id that this call is responsible for.
            if (indexType.isObjectType("Array")) { //(formalsType === "int*") {
                dimSizes = indexType.getOpenCLShape();
                s = s + indexType.getOpenCLAddressSpace() +" const "+ RiverTrail.Helper.stripToBaseType(indexType.OpenCLType) + " " +
                    indexName+"["+ dimSizes.toString() +"] = "; 
                // Deal with array indices.
                // SAH: id may _NEVER_ be changed in this process as it is required to assign the result!
                //   CR -- RLH I think we are OK w.r.t the alert following but need to build regression.
                //   alert("make sure this deals with combine to different levels.");
                s = s + " { ";
                for (i = 0; i < dimSizes[0]; i++) { // Ususally only 2 or 3 dimensions so ignore complexity
                    //s = s + indexName + "[" + i + "] = _id_" + i + ";";
                    if (i > 0) {
                        s = s + ", ";
                    }
                    s = s + "_id_" + i;
                }
                s = s + "};";
            } else {            
                // this path is taken by scalar comprehensions
                s = s + " const "+indexType.OpenCLType+" "+ indexName+" = _id_0;"; 
            }
            } else if (construct === "map") {
                // 
                // The relative argumment is a value found in the ParallelArray.
                indexName = funDecl.params[0];
                indexType = funDecl.typeInfo.parameters[1];
                if (indexType.isScalarType()) {
                    s = s + "const " + indexType.OpenCLType+" "+ RENAME(indexName)+" = tempThis[_readoffset];"
                } else {
                    s = s + indexType.getOpenCLAddressSpace() + " " + indexType.OpenCLType+" "+ RENAME(indexName)+" = &(tempThis[_readoffset]);"
                }
            }
            return s;
        };

        //
        // This generates code for a function that is presmable called from the kernel function.
        // 
        //
        function genCalledFunctionHeader(ast) {
            "use strict";
            var s = "";
            var formals = "";

            if (ast.value != "function") {
                throw "expecting function found " + ast.value;
            }

            var previousCalledScope = calledScope.inCalledScope();
            calledScope.enter(ast.name);
            // Need code here to deal with array values being returned.
            // NOTE: use dispatched function name here
            s = s + " " +ast.typeInfo.result.OpenCLType + " " + RENAME(ast.dispatch);
            s = s + "("; // start param list.
            // add extra parameter for failure propagation
            s = s + "int * _FAILRET";
            formals = genFormalParams(ast, "ignore");
            if (formals !== "") {
                s = s + ", " + formals;
            } // else there are no formals to output.

            var returnType = ast.typeInfo.result.OpenCLType;

            if (!(ast.typeInfo.result.isScalarType())) { // This assumes it is an array.
                // If the return type of the result is an Array then a pointer to it is passed in.
                s = s + ", " + returnType + " retVal";
            }
            s = s + " ) ";

            calledScope.exit(previousCalledScope);

            return s;
        };

        function inliningMightHelp(ast) {
            var stmts = ast.body.children;
            var type = ast.typeInfo.result;
            return !conditionalInline || // unconditionally inline everything
                   type.isScalarType() || // it is a scalar function
                   ((stmts.length === 1) && (stmts[0].type === RETURN) && ((stmts[0].value.type === IDENTIFIER) || isArrayLiteral(stmts[0].value))); // the return does not involve copying
        };

        function genCalledFunction(ast) {
            "use strict";
            var s = "";

            var previousCalledScope = calledScope.inCalledScope();
            calledScope.enter(ast.name);
            if (ast.value != "function") {
                throw "expecting function found " + ast.value;
            }
            var returnType = ast.typeInfo.result.OpenCLType;
            if (!inliningMightHelp(ast)) {
                    s = s + "__attribute__((noinline)) ";
            }
            s = s + genCalledFunctionHeader(ast);
            s = s + " { ";// function body
            s = s + " const int _writeoffset = 0; "; // add a write offset to fool the rest of code generation
            s = s + " int _FAIL = 0;"; // declare local _FAIL variable for selection failures
            s = s + " int _sel_idx_tmp;"; // tmp var required for selections
            s = s + returnType + " " + boilerplate.localResultName + ";"; // tmp var for parking result
            s = s + oclStatements(ast.body); // Generate the statements;
            s = s + " } ";

            calledScope.exit(previousCalledScope);
            return s;
        }

        //
        // Generate a string representing the kernel function
        // input: The ast (or fragment of the ast)
        // returns: The openCL code represented by the ast.
        //

        // 
        // some helper functions used in compiled kernels are defined here
        //
        var prelude32 = 
            // a jsval on 32 bit platforms uses nun boxing
            //
            // http://evilpie.github.com/sayrer-fatval-backup/cache.aspx.htm
            //
            // which means that if the value is a NaN double with 0xFFFFFFFF81 as the higher part, 
            // the lower part is actually an unsigned 32 bit integer. That is what the below code
            // checks. Note that 64 Bit platforms use a different scheme and thus probably need
            // a different implementation.
            "double __JS_array_sel_S(__global double *src, int idx) {" +
            "            if (!src) {" +
            "                /* previous selection failed */" +
            "                return 0;" +
            "            } else {" +
            "                unsigned int *asInt = (unsigned int *) &(src[idx]);" +
            "                if (asInt[1] == 0xFFFFFF81) return (double) asInt[0]; else return src[idx];" +
            "            }" +
            "}" +

            // Nested arrays essentially are chains of JSObjects, From reverse engineering the object layout
            // of Firefox 12, we know that the elements are stored in a pointer that is the 4th element
            // of the JSObject structure.  This leads to the magic offset of 3 below.
            // The length of the array is stored in the upper half of the 64 bit jsval preceeding the
            // or elements of the array.
            // We check whether the length of what we selected corresponds to what we expected. This
            // is required as we do not check for regularity when we pass the argument but only
            // when we access it.
            "__global double *__JS_array_sel_A(__global double *src, int idx, int exp_len, int *_FAIL) {" +
            "            if (!src) {" +
            "                /* previous selection failed */" +
            "                return src;" +
            "            }" +
            "            unsigned int *asInt = (unsigned int *) &(src[idx]);" +
            "            double **asPtr = (double **) asInt[0];" +
            "            unsigned int len = ((unsigned int*) (asPtr[3]-2))[2];" +
            "            if (exp_len != len) {" +
            "                *_FAIL = " + newError("JavaScript native array argument was not homogeneous") + "; " +
            "                return (__global double *) 0;" +
            "            } else {" +
            "                return (__global double *) asPtr[3];" +
            "            }" +
            "}";
       
        var prelude64 =
            // a jsval on 64 bit platforms uses pun boxing
            //
            // <reverse engineered from jsval.h>
            //
            // which means that if the value is a NaN double with 0x1FFF1 as the higher part, 
            // the lower part is actually an unsigned 32 bit integer. That is what the below code
            // checks. 
            "double __JS_array_sel_S(__global double *src, int idx) {" +
            "            if (!src) {" +
            "                /* previous selection failed */" +
            "                return 0;" +
            "            } else {" +
            "                unsigned long asLong = ((unsigned long *) src)[idx];" +
            "                if (((unsigned int) (asLong >> 47)) == 0x1FFF1) return (double) ((unsigned int) asLong); else return src[idx];" +
            "            }" +
            "} /* end prelude */" +

            // Nested arrays essentially are chains of JSObjects, From reverse engineering the object layout
            // of Firefox 12, we know that the elements are stored in a pointer that is the 4th element
            // of the JSObject structure.  This leads to the magic offset of 3 below.
            // The length of the array is stored in the upper half of the 64 bit jsval preceeding the
            // or elements of the array.
            // We check whether the length of what we selected corresponds to what we expected. This
            // is required as we do not check for regularity when we pass the argument but only
            // when we access it.
            "__global double *__JS_array_sel_A(__global double *src, int idx, int exp_len, bool *_FAIL) {" +
            "            if (!src) {" +
            "                /* previous selection failed */" +
            "                return src;" +
            "            }" +
            "            unsigned long asLong = ((unsigned long *) src)[idx];" +
            "            double **asPtr = (double **) (asLong & 0x00007FFFFFFFFFFFLL);" +
            "            unsigned int len = ((unsigned int*) (asPtr[3]-2))[2];" +
            "            if (exp_len != len) {" +
            "                *_FAIL = " + newError("JavaScript native array argument was not homogeneous") + "; " +
            "                return (__global double *) 0;" +
            "            } else {" +
            "                return (__global double *) asPtr[3];" +
            "            }" +
            "} /* end prelude */";

        // I have not found a portable way to detect whether we are on a 64 or 32 bit platform. 
        // For now, I disable it by default.
        var prelude = "";

        // boilerplate holds the various strings used for the signature of opneCL kernel function,
        // the declaration of some locals and the postfix (used by return). 
        var boilerplateTemplates = {
            "map": {
                "hasThis": true,
                "localThisName": " tempThis",
                "localThisDefinition": " opThisVect[opThisVect__offset]",
                "localResultName": " tempResult",
            },
            "combine": {
                "hasThis": true,
                // the type of this goes here.
                "localThisName": " tempThis",
                "localThisDefinition": " opThisVect[opThisVect__offset]",
                // the type of the result of the elemental function goes here
                "localResultName": " tempResult",
            },
            "comprehension": {
                "hasThis": false,
                // the type of this goes here.
                "localThisName": undefined,
                "localThisDefinition": " opThisVect[opThisVect__offset]",
                // the type of the result of the elemental function goes here
                "localResultName": " tempResult",
            },
            "comprehensionScalar": {
                "hasThis": false,
                // the type of this goes here.
                "localThisName": undefined,
                "localThisDefinition": " opThisVect[opThisVect__offset]",
                // the type of the result of the elemental function goes here
                "localResultName": " tempResult",
            }
        };

        var boilerplate = null; // Set to the template based on the construct being compiled. 

        function genKernel (ast, pa, rank, construct) {
            "use strict";
            var kernelCode;
            try {        
                kernelCode = prelude + genKernelHelper(ast, pa, rank, construct);
                if (verboseDebug) {
                    console.log(kernelCode);
                }
            } catch (e) {
                console.log(e.toString());
                throw e;
            }
            return kernelCode;
        }

        function getReturnFormalType(result) {
            if(result.isScalarType())
                return result.OpenCLType + "*";
            return (RiverTrail.Helper.stripToBaseType(result.OpenCLType) + "*");
        }

        function declareLocalFunctions(decls) {
            var s = "";

            if (!decls)
                return s;

            for (var cnt = 0; cnt < decls.length; cnt ++) {
                s = s + declareLocalFunctions(decls[cnt].body.funDecls);
                s = s + genCalledFunctionHeader(decls[cnt]) + ";";
            }

            return s;
        }
        function generateLocalFunctions(decls) {
            var s = "";

            if (!decls)
                return s;

            for (var cnt = 0; cnt < decls.length; cnt ++) {
                s = s + generateLocalFunctions(decls[cnt].body.funDecls);
                s = s + genCalledFunction(decls[cnt]);
            }

            return s;
        }

        // It is used below and in the stmt("return") logic above.

        // Input
        //    source      - a string representing the elemental function source or the ast from parsing the string.
        //    pa          - the parallel array being worked on, used to get type from typed array.
        //    rankOrShape - rank of iteration space, or in the case of comprehensions the shape of the iteration space
        //    construct   - construct to be compiled
        function genKernelHelper (ast, pa, rankOrShape, construct) {
            "use strict";

            var s = ""; // The kernel string
            var name = ast.name;
            var i = 0;
            var strides;
            var thisIsScalar;
            var iterSpace;
            var stride;
            var paShape;
            var formals;
            var rank;
            var funDecl;
            var thisSymbolType;

            funDecl = ast;
            if (funDecl.value != "function") {
                throw new Error("function expected"); // we can't deal with this so execute it sequentially
            }

            boilerplate = boilerplateTemplates[construct];

            // Emit definitions of InlineObject types
            //var globalInlineObjectTypes = RiverTrail.TypeInference.globalInlineObjectTypes;
            var numGlobalObjTypes = globalInlineObjectTypes.length;

            for(var i = 0; i < numGlobalObjTypes; i++) {
                s += "typedef struct struct_" + globalInlineObjectTypes[i].baseType + " { ";
                var fields = globalInlineObjectTypes[i].properties.fields;
                for (var idx in fields) {
                    s += fields[idx].OpenCLType + " " + idx + ";" ;
                }
                s += "} " + globalInlineObjectTypes[i].baseType + ";" ;
            }

            // Dump the helper function first, c99 requires this.
            // The kernel function has now been dumped.
            // We now turn our attention to function the kernel function might have called.
            // We dump signatures in case there is a forward reference
            s = s + declareLocalFunctions(ast.body.funDecls);
            s = s + generateLocalFunctions(ast.body.funDecls);
            s = s + "__kernel void RT_" + funDecl.name + "(";

            // add the special return parameter used to detect failure
            s = s + "__global int *_FAILRET, ";

            if (boilerplate.hasThis) {
                // derive iteration space and type information from rankOrShape and this
                thisSymbolType = funDecl.typeInfo.parameters[0];
                rank = rankOrShape;
                thisIsScalar = thisSymbolType.isNumberType();
                paShape = pa.getShape();
                iterSpace = paShape.slice(0,rank);
                // add this formal parameter
                if (thisIsScalar && (construct === "map")) {
                    // for map, the this argument has a different type than the this inside the kernel
                    // so we have to lift it to a pointer if it isn't one yet.
                    s = s + " __global " + thisSymbolType.OpenCLType + "* opThisVect ";
                } else {
                    s = s + " __global " + thisSymbolType.OpenCLType + " opThisVect ";
                }
                s = s + ", int opThisVect__offset, ";
            } else {
                // special case where we do not have this to derive iteration space. Here, rankOrShape
                // will be the shape of the iteration space, so use rankOrShape as iteration space and 
                // its length as rank
                iterSpace = rankOrShape;
                rank = rankOrShape.length;
            }

            // Dump any additional parameters
            formals = genFormalParams(funDecl, construct);
            if (formals !== "") {
                s = s + formals + ",";
            }
            // Dump the standard output parameters.
            // Note that result.openCLType is the type of the result of a single iteration!
            if ((construct === "combine") || (construct === "map") || (construct === "comprehension") || (construct === "comprehensionScalar")) {      
                if(funDecl.typeInfo.result.isScalarType() || funDecl.typeInfo.result.isArrayishType()) {
                    s = s + "__global " + getReturnFormalType(funDecl.typeInfo.result) + " retVal, ";
                    //s = s + "__global " + funDecl.typeInfo.result.OpenCLType + (funDecl.typeInfo.result.isScalarType() ? "*" : "") + " retVal"; 
                    s = s + "int retVal__offset";
                }
                else if(funDecl.typeInfo.result.isObjectType("InlineObject")) {
                    var fields = funDecl.typeInfo.result.properties.fields;
                    for(var idx in fields) {
                        s = s + " __global " + getReturnFormalType(fields[idx]) + " retVal_" + idx + ", int retVal_" + idx + "_offset,";
                    }
                    s = s.slice(0, -1);
                }
                else {
                    reportError("Unknown return type in kernel");
                }
            } else {
                throw "unimplemented construct " + construct;
            }
            // Close the param list
            s = s + ")";
            s = s + " {";

            // add declaration of bounds checks helper variables
            s = s + "int _sel_idx_tmp; int _FAIL = 0;";

            // add code to declare id_x for each iteration dimension
            for (i = 0; i < rank; i++) {
                s = s + "int _id_" + i + " = (int)get_global_id(" + i + ");";
            }

            // add code to compute the offset 'writeoffset' into flat result vector
            if (ast.typeInfo.result.isArrayishType() || ast.typeInfo.result.isScalarType()) {
                s = s + "int _writeoffset = 0";
                stride = ast.typeInfo.result.getOpenCLShape().reduce(function(a,b) { return (a*b);}, 1);
                for (i = rank-1; i>=0; i--) {
                    s = s + "+" + stride + " * " + "_id_" + i;
                    stride = stride * iterSpace[i];
                }
                s = s + ";";
            }
            else if (ast.typeInfo.result.isObjectType("InlineObject")) {
                stride = 0;
                var fields = ast.typeInfo.result.properties.fields;
                if(!fields)  reportError("Invalid type definition for returned object");
                for(var idx in fields) {
                    s = s + "int _writeoffset_" + idx + " = 0";
                    stride = fields[idx].getOpenCLShape().reduce(function(a,b) { return (a*b);}, 1);
                    //stride += fields[idx].getOpenCLShape().reduce(function(a,b) {return (a*b);}, 1);
                    for (i = rank-1; i>=0; i--) {
                        s = s + "+" + stride + " * " + "_id_" + i;
                        stride = stride * iterSpace[i];
                    }
                    s = s + ";";
                }
            }

            // add code to compute offset 'readoffset' into flat vector when using map
            if (construct === "map") {
                if(ast.typeInfo.result.isObjectType("InlineObject")) {
                    reportError("Not supported");
                }
                else {
                    s = s + "int _readoffset = " + pa.offset;
                    var resShape = ast.typeInfo.result.getOpenCLShape();
                    if ((paShape.length === rank + resShape.length) &&
                        (resShape.every(function(e,idx) { return (e === paShape[idx+rank]);}))) {
                        // result has same shape as input, so the offsets are the same
                        s = s + " + _writeoffset"
                    } else {
                        strides = pa.strides.slice(0,rank);
                        for (i=0; i<rank; i++) {
                            s = s + "+ _id_" + i + " * " + strides[i];
                        }
                    }
                }
                s = s + ";";
            }
            // add retval offset to writeoffset
            if (ast.typeInfo.result.isArrayishType() || ast.typeInfo.result.isScalarType()) {
                s = s + "_writeoffset += retVal__offset;";
            }

            // Add code to declare tempThis
            if (boilerplate.hasThis) {
                var thisShape = thisSymbolType.getOpenCLShape();
                s = s + (thisIsScalar ? " " : " __global ") + thisSymbolType.OpenCLType + " "+ boilerplate.localThisName + ";";

                // initialise tempThis
                s = s + boilerplate.localThisName + " = " + (thisIsScalar ? "(" : "&(") + boilerplate.localThisDefinition + ");"; 
            }

            // declare tempResult
            s = s + funDecl.typeInfo.result.OpenCLType + " " + boilerplate.localResultName + ";";
            // define index
            s = s + genFormalRelativeArg(funDecl, construct); // The first param's name.

            // Adjust the ParallelArray formals that come with offsets to formal = &formal[formalName_offset]
            s = s + adjustFormalsWithOffsets(funDecl, construct);
            // Generate the statements;
            s = s + oclStatements(funDecl.body);
            // close the kernel body. Note that what ever is placed here is never executed, as the compilation
            // of RETURN emit an explicit return...
            s = s + "}";

            return s;
        };

        // -------------------------------------------------------------------------------------------------
        // --------- Start of genStatement helpers. All are prefixed with gen, for exampe genReturn. -------


        function genReturn (ast) {
            "use strict";
            if (calledScope.inCalledScope()) {
                return genSimpleReturn(ast);
            } else {
                return genKernelReturn(ast);
            }
        }

        // Generate a return from a function the kernel calls.
        // This function is obsolete. It is here only for reference - JS
        function genSimpleReturn_old (ast) {
            "use strict";
            var s = " ";
            var rhs;
            var i;
            rhs = ast.value; // right hand side
            if (rhs.typeInfo.isScalarType()) {
                // scalar result
                // propagate failure code
                s = boilerplate.localResultName + " = " + oclExpression(rhs) + ";";
                s = s + "if (_FAIL) {*_FAILRET = _FAIL;}";
                s = s + " return " + boilerplate.localResultName + ";";
            } else {            
                // vector result. We have two cases: either it is an identifier, then we do an elementwise assign.
                // or it is an array expression, in which case we generate code for each element and then assign that.
                var elements = rhs.typeInfo.properties.shape.reduce(function (a,b) { return a*b;});
                var baseType = RiverTrail.Helper.stripToBaseType(rhs.typeInfo.OpenCLType);
                var convPre = "((" + baseType + ") ";
                var convPost = ")";
                while (rhs.type === CAST) {
                    // detect casts to facilitate direct assign
                    convPre = convPre + "((" + RiverTrail.Helper.stripToBaseType(rhs.typeInfo.OpenCLType) + ")"; 
                    convPost = ")" + convPost;
                    rhs = rhs.children[0];
                }
                if (rhs.type === ARRAY_INIT) {
                    // inline array expression, do direct write
                    s = s + "{"; 
                    for (i = 0; i < elements; i++) {
                        s = s + "retVal[_writeoffset + " + i + "] = " + convPre + oclExpression(rhs.children[i]) + convPost + ";";
                    }
                    s = s + "}";
                } else {
                    // arbitrary expression
                    s = boilerplate.localResultName + " = " + oclExpression(rhs) + ";";
                    s = s + "{ int _writeback_idx = 0; for (;_writeback_idx < " + elements + "; _writeback_idx++) { ";
                    s = s + " retVal[_writeoffset + _writeback_idx] = " + convPre + "tempResult[_writeback_idx]" + convPost + ";",
                      s = s + "}";
                }
                s = s + "if (_FAIL) {*_FAILRET = _FAIL;}";
                s = s + "return retVal;";
            } // end else code that returns a non-scalar
            return s;
        }

        var isArrayLiteral = RiverTrail.Helper.isArrayLiteral;

        function genSimpleReturn(ast) {
            "use strict";
            var s = " ";
            var elements;
            var rhs;    // right-hand-side
            var i;
            var buildWriteCopy = function buildWriteCopy(name, idx, idx2, src, shape, rank) {
                var res = "";
                if (shape.length === 0) {
                    res += name + idx + "=" + src + idx2 + ";";
                } else {
                    var newShape = shape.slice(1);
                    res += "for (int cpi_" + rank + " = 0; cpi_" + rank + " < " + shape[0] + "; cpi_" + rank + "++) {";
                    res += buildWriteCopy(name, idx+"[cpi_"+rank+"]", idx2+"[cpi_"+rank+"]", src, newShape, rank+1);
                    res += "}";
                }
                return res;
            };
            var buildWriteCopyGlob = function buildWriteCopyGlob(name, idx, idx2, src, shape, rank) {
                var res = "";
                if (shape.length === 0) {
                    res += name + idx + "=" + src + "[" + idx2 + "++];";
                } else {
                    var newShape = shape.slice(1);
                    res += "for (int cpi_" + rank + " = 0; cpi_" + rank + " < " + shape[0] + "; cpi_" + rank + "++) {";
                    res += buildWriteCopyGlob(name, idx+"[cpi_"+rank+"]", idx2, src, newShape, rank+1);
                    res += "}";
                }
                return res;
            };
            var buildWrite = function buildWrite(name, idx, ast) {
                var res = "";
                if (ast.type === ARRAY_INIT) {
                    for (var cnt = 0; cnt < ast.children.length; cnt++) {
                        res += buildWrite(name, idx+"["+cnt+"]", ast.children[cnt]);
                    }
                } else if ((ast.type === IDENTIFIER) && (ast.typeInfo.getOpenCLShape().length >= 1)) {
                    // in place copy
                    if (ast.typeInfo.getOpenCLAddressSpace() === "__global") {
                        // copy from flat global array
                        res += "{ int _readidx = 0;";
                        res += buildWriteCopyGlob(name, idx, "_readidx", oclExpression(ast), ast.typeInfo.getOpenCLShape(), 0);
                        res += "}";
                    } else {
                        res += buildWriteCopy(name, idx, "", oclExpression(ast), ast.typeInfo.getOpenCLShape(), 0);
                    }
                } else {
                    res += name + idx + " = " + oclExpression(ast) + ";";
                }
                return res;
            };
            rhs = ast.value;
            if (rhs.typeInfo.isScalarType()) {
                // scalar result
                s = boilerplate.localResultName + " = " + oclExpression(rhs) + ";";
                s = s + "if (_FAIL) {*_FAILRET = _FAIL;}";
                s = s + " return " + boilerplate.localResultName + ";";
            } else {
                // direct write but only for flat arrays i.e.,
                // rhs.typeInfo.properties.shape.length===1
                if (isArrayLiteral(rhs)) {
                    s = s + "{" + buildWrite("(retVal + _writeoffset)", "", rhs) + "}";
                }
                else if(rhs.typeInfo.isObjectType("InlineObject")) {
                    var numProps = 0;
                    var nonScalarResultContainer = "tempResult_p";
                    var scalarResultContainer = "tempResult_s";
                    var propResultContainer = "";
                    for(var idx in rhs.typeInfo.properties.fields) {
                        var propType = rhs.typeInfo.properties.fields[idx];
                        var is_scalar_property = propType.isScalarType();
                        propResultContainer = is_scalar_property ? scalarResultContainer : nonScalarResultContainer;
                        // Declare result containers in a block scope for each
                        // property in the object
                        s += is_scalar_property ? ("{ double " + scalarResultContainer + ";") : ("{ void * " + nonScalarResultContainer + ";");
                        if(!is_scalar_property && propType.properties.addressSpace === "__global") {
                           s += "{ __global " + propType.OpenCLType + " " + nonScalarResultContainer + "_g";
                               + "_g" + " = " +  oclExpression(rhs.children[numProps].children[1]) + ";";
                           s += " int _idx1; ";
                           s += "for ( _idx1 = 0; _idx1 < " + elements + "; _idx1++) {";
                           s += " retVal[_idx1] = " + nonScalarResultContainer + "_g" + "[_idx1]; } }";
                           //TODO: What does numProps do ? Check this
                           numProps++;
                        }
                        else {
                            // The order of properties in the object type being
                            // returned may be different than in the actual expression
                            // being returned. So we should map between these types.
                            var prop_index = 0;
                            while(1) {
                                if(rhs.children[prop_index++].children[0].value === idx) {
                                    s +=  propResultContainer + " = " + oclExpression(rhs.children[prop_index-1].children[1]) + "; ";
                                    break;
                                }
                                if(prop_index >= rhs.typeInfo.properties.fields.length) {
                                    reportError("Statement return: Field", idx, "could not be found! ", ast);
                                }
                            }
                            // getOpeCLShape() already returns an empty array for scalars
                            //var propShape = !(is_scalar_property) ? propType.getOpenCLShape() : [];
                            var propShape = propType.getOpenCLShape();
                            var propShapeLength = propShape.length;
                            var i; var index; var indexString = ""; var post_parens = "";
                            for( i = 0; i < propShapeLength; i++) {
                                index = "_idx" + i;
                                s += " { int " + index + "; ";
                                s += "for (" + index + "= 0; " + index + " < " + propShape[i] + "; " + index + "++) {";
                                indexString += "[" + index + "]";
                                post_parens += "}}";
                            }
                            s += " (retVal" + "->" + idx + ")" + indexString + " = " + "((" + propType.OpenCLType + ")" +  propResultContainer + ")" + indexString + ";" + post_parens;
                        }
                        s += "}"; // End block scope for declarations of result containers
                    }
                }
                else {
                    // We might be returning a global (possibly nested array).
                    // Do the appropriate copy: Global arrays are always flat,
                    // local nested arrays are non-flat.
                    //
                    var elements = rhs.typeInfo.getOpenCLShape().reduce(function (a,b) { return a*b;});
                    if(rhs.typeInfo.properties.addressSpace === "__global") {
                        s = "__global " + rhs.typeInfo.OpenCLType + " " + boilerplate.localResultName + "_g" + " = " +  oclExpression(rhs) + ";";
                        s += " int _idx1; ";
                        s += "for ( _idx1 = 0; _idx1 < " + elements + "; _idx1++) {"; 
                        s += " retVal[_idx1] = " + boilerplate.localResultName + "_g" + "[_idx1]; }";
                    }
                    else {
                        // arbitrary expression, possibly a nested array identifier
                        var source = rhs;
                        var sourceType = source.typeInfo;
                        var sourceShape = sourceType.getOpenCLShape();
                        s = boilerplate.localResultName + " = " + oclExpression(rhs) + ";";
                        var maxDepth = sourceShape.length;
                        var i; var idx; var indexString = ""; var post_parens = "";
                        s += "{ int _writeback_idx = 0 ;";
                        for(i =0 ;i<maxDepth;i++) {
                            idx = "_idx" + i;
                            s += " { int " + idx + "; ";
                            s += "for (" + idx + "= 0; " + idx + " < " + sourceShape[i] + "; " + idx + "++) {"; 
                            indexString += "[" + idx + "]";
                            post_parens += "}}";
                        }
                        s += " retVal" + indexString + " = " + "((" + sourceType.OpenCLType + ")" +  boilerplate.localResultName + ")" + indexString + ";" + post_parens + "}";
                    }
                }
                s = s + "if (_FAIL) {*_FAILRET = _FAIL;}";
                s = s + " return retVal; ";
            }
            return s;
        }


        // Typically they take the ast as an argument and return the appropriate string.
        //
        // You need to add a cast here so that the double you see is casted to a float before you store 
        // it in retval.

        function genKernelReturn(ast) {
            "use strict";
            var s = " ";
            var elements;
            var rhs;    // right-hand-side
            var i;
            rhs = ast.value;
            var buildWriteCopy = function buildWriteCopy(name, idx, idx2, src, shape, rank) {
                var res = "";
                if (shape.length === 0) {
                    res += name + "[" + idx + "++]" + "=" + src + idx2 + ";";
                } else {
                    var newShape = shape.slice(1);
                    res += "for (int cpi_" + rank + " = 0; cpi_" + rank + " < " + shape[0] + "; cpi_" + rank + "++) {";
                    res += buildWriteCopy(name, idx, idx2+"[cpi_"+rank+"]", src, newShape, rank+1);
                    res += "}";
                }
                return res;
            };
            var buildWriteCopyGlob = function buildWriteCopyGlob(name, idx, src, shape) {
                var length = shape.reduce(function (a,b) { return a*b; });
                var res = "for (int cpi = 0; cpi < " + length + "; cpi++) {";
                    res += name + "[" + idx + "++] = " + src + "[cpi];";
                    res += "}";
                return res;
            };
            var buildWrite = function buildWrite(name, idx, ast) {
                var res = "";
                if (ast.type === ARRAY_INIT) {
                    for (var cnt = 0; cnt < ast.children.length; cnt++) {
                        res += buildWrite(name, idx, ast.children[cnt]);
                    }
                } else if ((ast.type === IDENTIFIER) && (ast.typeInfo.getOpenCLShape().length >= 1)) {
                    // in place copy
                    if (ast.typeInfo.getOpenCLAddressSpace() === "__global") {
                        res += buildWriteCopyGlob(name, idx, oclExpression(ast), ast.typeInfo.getOpenCLShape());
                    } else {
                        res += buildWriteCopy(name, idx, "", oclExpression(ast), ast.typeInfo.getOpenCLShape(), 0);
                    }
                } else {
                    res += name + "[" + idx + "++] = " + oclExpression(ast) + ";";
                }
                return res;
            };
            if (rhs.typeInfo.isScalarType()) {
                // scalar result
                s = boilerplate.localResultName + " = " + oclExpression(rhs) + ";";
                s = s + "retVal[_writeoffset] = " + boilerplate.localResultName + ";"; 
            } else {
                // direct write but only for flat arrays i.e.,
                // rhs.typeInfo.properties.shape.length===1
                if (isArrayLiteral(rhs)) {
                    s = s + "{ int writeidx = 0; " + buildWrite("(retVal + _writeoffset)", "writeidx", rhs) + "}";
                } else if(rhs.typeInfo.properties.addressSpace === "__global") {
                    s = boilerplate.localResultName + " = " + oclExpression(rhs) + ";";
                    var elements = rhs.typeInfo.getOpenCLShape().reduce(function (a,b) { return a*b;});
                    s += "{ int _writeback_idx = 0 ;";
                    s += "for (_writeback_idx = 0; _writeback_idx < " + elements + "; " + "_writeback_idx++) {"; 
                    s += " retVal[_writeoffset + _writeback_idx]  = " + boilerplate.localResultName + "[_writeback_idx] ; } }";
                }
                else if(rhs.typeInfo.isObjectType("InlineObject")) {
                    var fields = rhs.typeInfo.properties.fields;
                    s = ""; var field_offset = 0;
                    for(var f in fields) {
                        field_offset++;
                        var sourceType = fields[f];
                        if(fields[f].isScalarType()) {
                            s += "{ int _writeback_idx_" + f + " = 0;" ;
                            s += " retVal_" + f + "[_writeoffset_" + f + " + _writeback_idx_" + f + "] = "
                                + oclExpression(rhs.children[field_offset-1].children[1]) + "; }";
                            continue;
                        }
                        var sourceShape = sourceType.getOpenCLShape();
                        s += "{" + sourceType.OpenCLType + " tempResult_" + f + " = (" + oclExpression(rhs.children[field_offset-1].children[1]) + ");";
                        var maxDepth = sourceShape.length;
                        var i; var idx; var indexString = ""; var post_parens = "";
                        s += "{ int _writeback_idx_" + f + " = 0 ;";
                        for(i =0 ;i<maxDepth;i++) {
                            idx = "_idx" + i;
                            s += " { int " + idx + ";";
                            s += "for (" + idx + "= 0; " + idx + " < " + sourceShape[i] + "; " + idx + "++) {"; 
                            indexString += "[" + idx + "]";
                            post_parens += "}}";
                        }
                        s += " retVal_" + f + "[_writeoffset_" + f + " + _writeback_idx_" + f + "++]  = " + "((" +
                            sourceType.OpenCLType + ")" + "tempResult_" + f +
                            ")" + indexString + ";" + post_parens + "} }";
                    }
                    //console.log(s);
                }
                else {
                    // a (possibly nested) array
                    var source = rhs;
                    var sourceType = source.typeInfo;
                    var sourceShape = sourceType.getOpenCLShape();
                    s = boilerplate.localResultName + " = " + oclExpression(rhs) + ";";
                    var maxDepth = sourceShape.length;
                    var i; var idx; var indexString = ""; var post_parens = "";
                    s += "{ int _writeback_idx = 0 ;";
                    for(i =0 ;i<maxDepth;i++) {
                        idx = "_idx" + i;
                        s += " { int " + idx + ";";
                        s += "for (" + idx + "= 0; " + idx + " < " + sourceShape[i] + "; " + idx + "++) {"; 
                        indexString += "[" + idx + "]";
                        post_parens += "}}";
                    }
                    s += " retVal[_writeoffset + _writeback_idx++]  = " + "((" +
                    sourceType.OpenCLType + ")" + boilerplate.localResultName +
                    ")" + indexString + ";" + post_parens + "}";
                }
            }
            s = s + "if (_FAIL) {*_FAILRET = _FAIL;}";
            s = s + " return; ";
            return s;
        }
        
        // -------- End of genStatement helper functions. --------------
        //-------------------------------------------------------------------------------------------------

    function genOCL(ast) {
       "use strict";
        var s = "";
        console.log("Call to genOCL line 1456 that probable shouldn't be there");
        return s;
    }

    function oclStatements(statements) {
        "use strict";
        var i;
        var x;
        var s = "";
        if ((statements.type === BLOCK) || (statements.type === SCRIPT)) {
            if (statements.symbols) {
                s = s + statements.symbols.emitDeclarations(RENAME);
            }
            if (statements.memVars) {
                s = s + statements.memVars.declare();
            }

            for (i=0; i<statements.children.length;i++) {
                s = s + oclStatement(statements.children[i]) + ";";
            }
        } else {
            s = s + oclStatement(statements);
        }
        return "{" + s + "}";
    }

    function stripCasts(ast) {
        if (ast.type === CAST) {
            return stripCasts(ast.children[0]);
        } else {
            return ast;
        }
    }


    // Given a series of mem buffers representing levels of a nested array,
    // this function initializes the pointers in the upper levels to point
    // to the right mem buffer.
    // When setInitialValues is 'true', it also sets the initial values at
    // the leaves of the array

    function initNestedArrayStructure(ast, setInitialValues) {
        if(setInitialValues === true && ast.initializer === undefined) {
            reportError("Invalid value initializer while creating array", ast)
        }
        var sourceShape = ast.typeInfo.getOpenCLShape();
        var maxDepth = sourceShape.length;
        var s = "";
        var redu = 1; var rhs = ""; var lhs = "";
        for(var i = 0 ; i < maxDepth; i++) {
            if((i === maxDepth - 1) && !setInitialValues)
                break;
            for(var j = 0; j < sourceShape[i]*redu; j++) {
                lhs = "(" + getPointerCast(i, maxDepth, ast.typeInfo.OpenCLType) +
                    ast.memBuffers.list[i] + ")"
                    + "[" + j + "]";
                if(i === maxDepth-1 && setInitialValues) {
                    rhs = ast.initializer;
                }
                else {
                    rhs = "&((" + getPointerCast(i+1, maxDepth, ast.typeInfo.OpenCLType)
                    + ast.memBuffers.list[i+1]
                    + ")" + "[" + j*sourceShape[i+1] + "]" + ")";
                }
                s += lhs + " = " + rhs + " ,";
            }
            redu = redu*sourceShape[i];
        }
        return s;
    }

    // Creates a potentially checked array index.
    // If the index is statically known to be correct, this
    // just returns the index itself (expr).
    // Otherwise an expression is created that checks whether
    // the index is in bounds and, if the index turns out to be 
    // out of bounds, returns 0. If the index is in bounds,
    // the value of expr is returned.
    //
    // The emmited code relies on a global variable
    // int _sel_idx_tmp
    // to store the intermediate result of evaluation expr.
    // This variable should be declared at the top-level of the
    // function.
    //
    // As a side effect, the global variable _FAIL is set to > 0
    // if a bounds check failed.
    function wrapIntoCheck(range, bound, expr, ast) {
        var postfix = "";
        var result = "";
        var dynCheck = false;

        if (bound === 0) {
            // we have an empty array => you cannot select from those
            // (yeah, yeah, I know, a real corner case :=D)
            throw new Error("selection from empty array encountered!");
        }

        if (checkBounds && 
                (checkall ||
                 (range === undefined) ||
                 (range.lb === undefined) ||
                 (range.lb < 0))) {
            // emit lower bound check
            result += "(_sel_idx_tmp < 0 ? (_FAIL ? 0 : (_FAIL = " + newError("index " + expr + " smaller than zero in " + RiverTrail.Helper.wrappedPP(ast)) + ", 0)) : ";
            postfix = ")" + postfix;
            dynCheck = true;
        }

        if (checkBounds &&
                (checkall ||
                 (range === undefined) ||
                 (range.ub === undefined) ||
                 (range.ub >= bound))) {
            // emit upper bound check
            result += "(_sel_idx_tmp >= " + bound + " ? (_FAIL ? 0: (_FAIL = " + newError("index " + expr + " greater than upper bound " + bound + " in " + RiverTrail.Helper.wrappedPP(ast)) + ", 0)) : ";
            postfix = ")" + postfix;
            dynCheck = true;
        }

        if (dynCheck) {
            result = "(_sel_idx_tmp = " + expr + ", " + result + "_sel_idx_tmp" + postfix + ")";
        } else {
            result = expr;
        }

        return result;
    }

    //
    // Given we have a source and an arrayOfIndices. If the result is
    // a primitive type we return it. If it is an array then we generate a
    // pointer to the start of that array.
    //

    var compileSelectionOperation = function (ast, source, arrayOfIndices) {
        "use strict";

        var s = "";
        var i;
        var elemSize;
        var stride;
        var indexLen;
        var dynamicSel;
        var rangeInfo;
        // If arrayOfIndices has an inferredType of an array (dimSize > 0) then it is get([x, y...]);
        // If that is the case then elemRank will be the sourceRank - the length of the argument.
        var sourceType = source.typeInfo;
        var sourceShape = sourceType.getOpenCLShape();
        var sourceRank = sourceShape.length;
        var elemRank = ast.typeInfo.getOpenCLShape().length;
        if (sourceType.isObjectType("JSArray")) {
            // special treatment for JavaScript encoded arrays
            rangeInfo = arrayOfIndices.rangeInfo;
            if (elemRank === 0) {
                // scalar case 
                s = s + "__JS_array_sel_S(" + oclExpression(source) + ", " + wrapIntoCheck(rangeInfo, sourceShape[0], oclExpression(arrayOfIndices), ast) + ")";
            } else {
                s = s + "__JS_array_sel_A(" + oclExpression(source) + ", " + wrapIntoCheck(rangeInfo, sourceShape[0], oclExpression(arrayOfIndices), ast) + ", " + sourceShape[1] + ", &_FAIL)";
            }
        } else {
            // C style arrays
            var isParallelArray = sourceType.isObjectType("ParallelArray");
            var isGlobal = (sourceType.getOpenCLAddressSpace() === "__global");
            if (elemRank !== 0) {
                if(isParallelArray || isGlobal) {
                    // The result is a pointer to a sub dimension.
                    s = s + "( &";
                }
                else {
                    s = s + "(";
                }
            }
            elemSize = ast.typeInfo.getOpenCLShape().reduce( function (p,n) { return p*n;}, 1);
            if(isParallelArray || isGlobal) {
                s = s + " ( " + oclExpression(source) + "[0 ";
            }
            else {
                s = s + oclExpression(source) ;
            }

            stride = elemSize;

            if (arrayOfIndices.type !== LIST) {
                // we have a single scalar index from an INDEX op
                rangeInfo = arrayOfIndices.rangeInfo;
                if(isParallelArray || isGlobal) {
                    s = s + " + " + stride + " * ("+wrapIntoCheck(rangeInfo, sourceShape[0], oclExpression(arrayOfIndices), ast) + ")";
                }
                else {
                    s = s + "[" + wrapIntoCheck(rangeInfo, sourceShape[0], oclExpression(arrayOfIndices), ast) + "]";
                }
            } else {
                // this is a get
                if (arrayOfIndices.children[0] && (arrayOfIndices.children[0].type === ARRAY_INIT)) { 
                    // We might have get([0,0]); instead of get(0,0);
                    arrayOfIndices = arrayOfIndices.children[0];
                }
                rangeInfo = arrayOfIndices.rangeInfo;
                // the first argument could be an index vector, in which case we have to produce dynamic
                // selection code
                dynamicSel = arrayOfIndices.children[0].typeInfo.getOpenCLShape().length !== 0;
                for (i = sourceRank - elemRank - 1; i >= 0; i--) { // Ususally only 2 or 3 dimensions so ignore complexity
                    s = s + " + " + stride + " * ("
                        if (dynamicSel) {
                            s = s + wrapIntoCheck((rangeInfo ? rangeInfo.get(0).get(i) : undefined), sourceShape[i], oclExpression(arrayOfIndices.children[0], ast) + "[" + i + "]") + ")";
                        } else {
                            s = s + wrapIntoCheck((rangeInfo ? rangeInfo.get(i) : undefined), sourceShape[i], oclExpression(arrayOfIndices.children[i]), ast) + ")";
                        }
                    stride = stride * sourceType.getOpenCLShape()[i];
                }
            }
            if(isParallelArray || isGlobal) {
                s = s + "])";
            }

            if (elemRank !== 0) {
                // The result is a pointer to a sub dimension.
                s = s + " )";
            }
        }

        return s;
    }

    //
    // mathOCLMethod translate a javascript method in the Math class into the
    // corresponding OpenCL primitive.
    // The translation is dependent on type but defaults to float.
    //
    // For an overview of JavaScript Math methods see
    //
    // https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Math#Methods
    //

    var mathOCLMethod = function mathOCLMethod (ast) {
        "use strict";
        var jsMethod = (ast.children[0].children[1].value).toLowerCase();
        if (jsMethod === "abs") { // There is an int abs so we probable should check type here.
            if ((ast.children[1].typeInfo[0].OpenCLType !== "float") &&
                    (ast.children[1].typeInfo[0].OpenCLType !== "double")) {
                return "((" + ast.children[1].typeInfo[0].OpenCLType + ") fabs((float) " + oclExpression(ast.children[1]) + "))";
            } else {
                return "fabs(" + oclExpression(ast.children[1]) + ")";
            }
        }
        if (jsMethod === "round") {
            return "floor(.5 + " + oclExpression(ast.children[1]) + ")";
        }
        if (jsMethod === "atan2") {
            return "atan2(" + oclExpression(ast.children[1]) + "," + oclExpression(ast.children[1]) + ")";
        }
        if (jsMethod === "random") { // JS wants something between 0 and 1.
            return "(rand()/(RAND_MAX-1))"; // -1 so that we can never get 1 which JS random nevers returns.
        }
        if ((jsMethod === "min") || (jsMethod === "max")) {
            throw new Error("Math." + jsMethod + "Not supported"); // Not sure what the translation should be so punt back to JS.
        }
        // In all other cases the c string is the same as the JS string.
        return jsMethod + "(" + oclExpression(ast.children[1]) + ")";
    };

    function getPointerCast(current_depth, max_depth, type) {
        var depth = max_depth - current_depth;
        var base_type = RiverTrail.Helper.stripToBaseType(type) + " ";
        for(var i = 0; i < depth; i++) {
           base_type += "*";
        }
        return "(" + base_type + ")";
    }
    //This is the next thing to do..... Deal today with return this.get(iv); The return calls oclExpression 

    function oclExpression(ast) {
        "use strict";
        var s = " ";
        var i, ii;
        var arrayOfIndices;
        var stride;
        var elemSize;
        var elemRank;
        var sourceRank;
        var indexLen;
        if (ast.type === CAST) {  // deals with adding things like (float *)mumble) to generated code. 
            if (!ast.typeInfo.isScalarType()) {
                reportError("non-scalar cast encountered", ast);
            }
            s = "((" + ast.typeInfo.OpenCLType + ")" 
                + oclExpression(ast.children[0]) + ")";
            //}
        } else if (ast.type === FLATTEN) {
            if (ast.typeInfo.getOpenCLShape().length > 1) {
                reportError("flattening of nested arrays not yet implemented.", ast.children[0]);
            }
            s = s + oclExpression(ast.children[0]);
        } else if (ast.type === NUMBER) {
            s = s + toCNumber(ast.value, ast.typeInfo);
        } else if (ast.type === THIS) {
            s = s + " tempThis "; // SAH: this should come from the boilerplate but that cannot be passed around easily

        } else if (ast.type === CALL) {
            // Deal with some intrinsics if found, otherwise just make the call.
            if (ast.children[0].type === DOT ) {
                var lhs = ast.children[0].children[0]; // the object
                var rhs = ast.children[0].children[1]; // the method call

                if (rhs.value === "get") {
                    s = s + compileSelectionOperation(ast, ast.children[0].children[0], ast.children[1]);
                } else if ((rhs.value === "getShape") && (lhs.typeInfo.isObjectType("ParallelArray"))) {
                    // create shape literal
                    s = s + "(";
                    var lhsShape = lhs.typeInfo.properties.shape;
                    for (var rank = 0; rank < lhsShape.length; rank++) {
                        s = s + "((int*)"+ast.allocatedMem+")["+rank+"]="+lhsShape[rank]+",";
                    }
                    s = s + "(int*)"+ast.allocatedMem+")";
                } else if (lhs.value === "Math") {
                    s = s + mathOCLMethod(ast);
                } else if (lhs.value === "RiverTrailUtils") {
                    s += "(" + initNestedArrayStructure(ast, true);
                    s = s + "(" + ast.typeInfo.OpenCLType + ")(" + ast.allocatedMem + ") )";
                } else {
                    s = s + " 628 oclExpression not complete probable some sort of method call ";
                }
            } else { // It is not a method call.
                var actuals = "";
                actuals = oclExpression(ast.children[1]);
                var post_parens = "";
                if(ast.typeInfo.name === "InlineObject") {
                    var rootBuffer = ast.memBuffers.__root;
                    var root_index = 0;
                    s += "(";
                    for(var idx in ast.typeInfo.properties.fields) {
                        var propType = ast.typeInfo.properties.fields[idx];
                        if(propType.isScalarType())
                            continue;
                        // If this property is an array, create the nesting
                        // structure if needed
                        var propShape = propType.getOpenCLShape();
                        var maxDepth = propShape.length;
                        var post_parens = "";
                        var redu = 1; var rhs = ""; var lhs = ""; post_parens = ")";
                        for(var i = 0 ; i < maxDepth-1; i++) {
                            for(var j = 0; j < propShape[i]*redu; j++) {
                                lhs = "(" + getPointerCast(i, maxDepth, propType.OpenCLType) +
                                    ast.memBuffers[idx][i] + ")"
                                    + "[" + j + "]";
                                rhs = "&((" + getPointerCast(i+1, maxDepth, propType.OpenCLType)
                                    + ast.memBuffers[idx][i+1]
                                    + ")" + "[" + j*propShape[i+1] + "]" + ")";
                                s += lhs + " = " + rhs + " ,";
                            }
                            redu = redu*propShape[i];
                        }
                        s += "((" + ast.typeInfo.OpenCLType + ")" + rootBuffer + ")" + "->" + idx + "=" +
                            "(" + propType.OpenCLType + ")" + ast.memBuffers[idx][0] + ",";
                    }
                    s = s + RENAME(ast.children[0].dispatch) + "( &_FAIL" + (actuals !== "" ? ", " : "") + actuals;
                    s += ", (" + ast.typeInfo.OpenCLType + ")" + rootBuffer + "))";
                }
                else if(!(ast.typeInfo.isScalarType()) && ast.typeInfo.getOpenCLShape().length > 1) {
                    // Create structure if this call is going to return a nested
                    // array
                    s += "(" + initNestedArrayStructure(ast, false);
                    post_parens = ")";
                    // NOTE: use renamed dispatch name here!
                    s = s + RENAME(ast.children[0].dispatch) + "( &_FAIL" + (actuals !== "" ? ", " : "") + actuals;
                    if (!(ast.typeInfo.isScalarType())) {
                        s = s + ", (" + ast.typeInfo.OpenCLType + ") " + ast.allocatedMem;
                    }
                    s = s + ")";
                    s = s + post_parens; // Close the comma list.
                }
                else {
                    // NOTE: use renamed dispatch name here!
                    s = s + RENAME(ast.children[0].dispatch) + "( &_FAIL" + (actuals !== "" ? ", " : "") + actuals;
                    if (!(ast.typeInfo.isScalarType())) {
                        s = s + ", (" + ast.typeInfo.OpenCLType + ") " + ast.allocatedMem;
                    }
                    s = s + ")";
                    s = s + post_parens;
                }
            }
        } else {
            // Everything else can be dealt with according to the more straight forward translation.
            s = oclStatement(ast);

        }

        return s;
    };
    /**********

      var astArity = getAstArity(ast);
      if (ast.arity === "unary") {
      if (ast.value === "[") {
    // We have a (possible nested) vector constructor.
    // SAH: the below code is wrong. We cannot just reuse tempResult and hope everything will be fine. Instead
    //      we have to stackallocate a corresponding temp! We have agreed to defer this until we switch to a
    //      flattened AST which wille ease allocating temps
    throw new Error("vector construction not supported yet!");
    if (ast.first.length > 0) {
    s = s + boilerplate.localResultName + "[0] = " + oclExpression(ast.first[0]) + ";"; // SAH: why assign to tempresult here?
    //                     s = s + oclExpression(ast.first[0]);
    }
    for (i = 1; i < ast.first.length; i++) {
    s = s + boilerplate.localResultName + "[" + i + "] = " + oclExpression(ast.first[i]) + ";";
    //                        s = s + ", " + oclExpression(ast.first[i]);
    }
    //                    s = s + "}";
    } else {
    s = s + "(" + ast.value + oclExpression(ast.first) + ")";
    }
    }
    if (ast.arity === "unaryPost") {
    s = s + "(" + oclExpression(ast.first) + ast.value + ")";
    }
    if (ast.arity === "binary") {
    if (ast.value === "[") {
    // Deal with array indices.
    s = s + compileSelectionOperation(ast, ast.first, ast.second);
    //arrayOfIndices = ast.second;
    //s = s + "(" + oclExpression(ast.first) + "[";
    //s = s + oclGetOffset(ast.first) + " + ";
    //s = s + oclExpression(arrayOfIndices[0]);
    //for (i = 1; i < arrayOfIndices.length; i++) { // Ususally only 2 or 3 dimensions so ignore complexity
    //stride = 1;
    //for (ii = i; ii < arrayOfIndices.length; ii++) {
    //stride = ast.first.inferredType.dimSize[ii] * stride;
    //}
    //s = s + " * " + stride + " + " + oclExpression(arrayOfIndices[i]);
    //}
    //s = s + "] )";
    } else if (ast.value === ".") {
    if (ast.second.value === "length") {
    s = s + ast.first.inferredType.dimSize[0];
    } else {
    s = s + "TBD: unhandled property " + ast.second.value;
    }
    } else if (ast.value === "===") {
    s = s + "(" + oclExpression(ast.first) + "==" + oclExpression(ast.second) + ")";
    } else if (ast.value === "%") {
    s = s + "fmod (" + oclExpression(ast.first) + "," + oclExpression(ast.second) + ")";
    } else {
    s = s + "(" + oclExpression(ast.first) + ast.value + oclExpression(ast.second) + ")";
    }
    }
    if (ast.arity === "ternary") {
    if (ast.value === "?") {
    s = s + " ( " + oclExpression(ast.first) + " ? " + oclExpression(ast.second) + " : " + oclExpression(ast.third) + ")";
    } else if (isGetCall(ast)) {
    // pa method get call so we can turn it into a [].
    // mumble.get can produce either a primitive type or a pointer into the array.
    // If we want a sub array then the inferredType will so indicate.
    s = s + compileSelectionOperation(ast, ast.first, ast.third);
    } else if (isGetShapeCall(ast)) {
    //
    // We need to dump out an vector holding the size of each dimension as a temp
    // and then make the assignment here. 
    // ** CR ** Currently only works for "this".
    //
    // First build the vector in JavaScript.
    if (ast.first.arity === "this") {
        var shape = ast.first.inferredType.dimSize;
        s = s + "((int*)thisShapeDecl)";
    } else {
        s = s + " TBD getShapeCall working for other than this. ln 256 genOCL";
    }
    } else {
        if (isMathMethod(ast)) {
            s = s + mathOCLMethod(ast);
        } else {
            s = s + " oclExpression not complete probable some sort of method call ";
        }
    }
    }
    }

    return s;
    };
    **********/


    function pp(n, d, inLetHead) {
        "use strict";
        console.log("Get rid of this call line 1750.");
        return oclStatement(n);
    }


    //
    // This case statement uses Stephans...
    //

    function oclStatement(ast) {
        "use strict";

        var s = "";
        if (!ast) {
            return "";
        }
        if (!(ast instanceof Object)) {
            return ast;
        }

        if (ast.parenthesized) {
            s += "(";
        }


        // From SEH There is a whole lot of code in here that has not be changed over to the genOCL code but at this point
        // it only compiles the default loader program below.
        // Using combine for a combinator.
        // var pa = new ParallelArray([1,2,3]);
        // var foo = function foo(iv) { return this.get(iv); };

        switch (ast.type) {
            case SCRIPT:
                s=s+"SCRIPT TBD ";
                // retrieve the type environment for local bindings

                // retrieve all the function environments for other function in case we see a call.

                // retrieve the symbols ??

                // add all local variable declarations to environment to shadow old
                // ones from previous scopes
                //      ast.varDecls.forEach(function (name) { doSomething(name); });

                // add all locally declared functions to the environment
                // strictly speaking they are not variable bindings yet they can shadow variables and be shadowed
                // by variables so we disallow these
                //      ast.funDecls.forEach(function (f) { doSomething(f)});

                // fallthrough to deal with the implicit SCRIPT block.
            case BLOCK:
                ast.children.forEach(function (ast) { oclStatement(ast); });
                break;

                //
                // statements
                //
            case FUNCTION:
                // this is not an applied occurence but the declaration, so we do not do anything here
                // functions are picked up from the body node earlier on

                break;
            case RETURN:
                s += genReturn(ast);
                break;
            case FOR:
                s += "for ( " + oclExpression(ast.setup) + "; " + oclExpression(ast.condition) + ";" + oclExpression(ast.update) + ") ";
                s += oclStatements(ast.body);
                break;
            case WHILE:
                s += "while ( "+oclExpression(ast.condition)+") ";
                s += oclStatements(ast.body);
                break;
            case DO:
                s += "do " + oclStatements(ast.body)+" while ("+oclExpression(ast.condition)+");";
                break;
            case IF:
                s += "if ("+oclExpression(ast.condition)+") {";
                s += oclStatements(ast.thenPart) + "} ";
                if (ast.elsePart) {
                    s += "else {"+oclStatements(ast.elsePart) + "}";
                }
                break;
            case SEMICOLON:
                if (ast.expression) {
                    s += oclStatement(ast.expression)+";";
                }
                break;
            case VAR:
            case CONST:
                s = s + ast.children.reduce(function (prev, ast) {
                    if (ast.initializer) {
                        switch (ast.type) {
                            case IDENTIFIER:
                                // simple case of a = expr
                                // initialisation  assignments are separated by commata (which is valid C) to make them work in for statement initialisers.
                                if (prev !== "") {
                                    prev += ", ";
                                }
                                prev += RENAME(ast.value) + " = " + oclExpression(ast.initializer); 
                                break;
                            default:
                                reportBug("unhandled lhs in var/const");
                                break;
                        }   
                    }
                    return prev;
                }, "");
                break;
            case ASSIGN:
                // children[0] is the left hand side, children[1] is the right hand side.
                // both can be expressions. 

                switch (ast.children[0].type) {
                    case IDENTIFIER:
                        // simple case of a = expr
                        if (ast.allocatedMem) {
                            //console.log(ast.children[0].type, ast.children[0].value);
                            //throw new Error("a memcopy would be required to compile this code.");
                            var s_tmp = ""; var s_decl = "";
                            var sourceShape = ast.children[1].typeInfo.getOpenCLShape();
                            var sourceType = ast.children[1].typeInfo.OpenCLType;
                            var maxDepth = sourceShape.length;
                            var sourceAddressSpace = (ast.children[1].typeInfo.getOpenCLAddressSpace() == "__global" ? "__global": "");
                            if(!(ast.children[1].typeInfo.isScalarType()) && maxDepth >= 1) {
                                verboseDebug && console.log("Doing copy assignment to value ", ast.children[0].value, " from shape ", sourceShape);
                                var source_tmp_name = "tmp_" + ast.memBuffers.list[0];
                                s_decl += "/* Copying Assignment */ " + sourceAddressSpace + " " + sourceType + " " + source_tmp_name + " = " + oclExpression(ast.children[1]) + ";" ;
                                s_tmp += "(";
                                var post_parens = ""; 
                                var redu = 1; var rhs = ""; var lhs = ""; post_parens = ")";
                                for(var i = 0 ; i < maxDepth; i++) {
                                    for(var j = 0; j < sourceShape[i]*redu; j++) {
                                        if(i===maxDepth-1) {
                                            lhs = "(" + getPointerCast(i, maxDepth, ast.typeInfo.OpenCLType) +
                                                ast.memBuffers.list[i] + ")" + "[" + j + "]";
                                            var n = j; var idx = "";
                                            for(var k = maxDepth-1; k >=0; k--) {
                                                idx = "[" + n % sourceShape[k] +"]" + idx;
                                                n = Math.floor(n/sourceShape[k]);
                                            }
                                            rhs = source_tmp_name + idx; 
                                        }
                                        else {
                                            lhs = "(" + getPointerCast(i, maxDepth, ast.typeInfo.OpenCLType) +
                                            ast.memBuffers.list[i] + ")" + "[" + j + "]";
                                            rhs = "&((" + getPointerCast(i+1, maxDepth, ast.typeInfo.OpenCLType)
                                            + ast.memBuffers.list[i+1]+ ")" + "[" + j*sourceShape[i+1] + "]" + ")";
                                        }
                                        s_tmp += lhs + " = " + rhs + " ,"; 
                                    }
                                    redu = redu*sourceShape[i];
                                }
                                s_tmp += " (" + sourceType + ")" + ast.memBuffers.list[0] + ")";
                                s += s_decl + "(" + RENAME(ast.children[0].value) + (ast.assignOp ? tokens[ast.assignOp] : "") + "= " + s_tmp + ")";
                            }
                            else if(ast.typeInfo.isScalarType()) {
                                // Do scalars ever have memory allocated to
                                // them ?
                                throw new Error("Compiler bug: Memory allocated for scalar copy");
                            }

                        } else {
                            s = s + "(" + RENAME(ast.children[0].value) + (ast.assignOp ? tokens[ast.assignOp] : "") + "= " + oclExpression(ast.children[1]) + ")"; // no ; because ASSIGN is an expression!
                        }
                        break;
                    case INDEX:
                        // array update <expr>[iv] = expr
                        // make sure that <expr> is in the __private address space. We catch it this late just for
                        // prototyping convenience. Could go anywhere after TI.
                        (findSelectionRoot(ast.children[0]).typeInfo.getOpenCLAddressSpace() !== "__global") || reportError("global arrays are immutable", ast);

                        s = s + "((" + oclExpression(ast.children[0]) + ")" + (ast.assignOp ? tokens[ast.assignOp] : "") + "= " + oclExpression(ast.children[1]) + ")";
                        break;
                    case DOT:
                        // object property update.
                        // a.b = c;
                        // make sure that address spaces are right!
                        s = s + "((" + oclExpression(ast.children[0].children[0]) + "->" + ast.children[0].children[1].value + ")" + (ast.assignOp ? tokens[ast.assignOp] : "") + "= " + oclExpression(ast.children[1]) + ")" ;
                        break;
                    default:
                        reportBug("unhandled lhs in assignment");
                        break;
                }
                // leave the last type in the accu. Assignments can be expressions :)
                break;

                // 
                // expressions
                //
            case COMMA:
                for (var i=0; i<ast.children.length;i++) {
                    if (i>0) {
                        s += ", ";
                    }
                    s += oclExpression(ast.children[i]);
                }            
                break;
            case HOOK:
                // the hook (?) is badly designed. The first child is the condition, second child
                // the then expression, third child the else expression
                s += "("+oclExpression(ast.children[0])+"?"
                    +oclExpression(ast.children[1])+":"
                    +oclExpression(ast.children[2])+")";
                break;

                // binary operations on all literals
            case STRICT_EQ:
            case STRICT_NE:
                // we map these to the no strict case for now
                ast.value = ast.value.substring(0,2);
                // fallthrough;
                
            case PLUS: 
                // we do not support strings yet, so this case is the same as numbers
                // fallthrough

                // binary operators on numbers (incl bool)
            case BITWISE_OR:
            case BITWISE_XOR:
            case BITWISE_AND:
            case EQ:
            case NE:
            case LT:
            case LE:
            case GE:
            case GT:
            case LSH:
            case RSH:
            case URSH:
            case MINUS:
            case MUL:
            case DIV:
                s = s + "("+oclExpression(ast.children[0]) + ast.value + oclExpression(ast.children[1]) + ")";
                break;
            case MOD: 
                s = s + "(" + "fmod(" + "(" + oclExpression(ast.children[0]) + ")" + ", " + "(" + oclExpression(ast.children[1]) + ")" + ")" + ")";
                break;

                // binary operators on bool
            case OR:
                s += "("+oclExpression(ast.children[0])+" || "+oclExpression(ast.children[1])+")";
                break;
            case AND:
                s += "("+oclExpression(ast.children[0])+" && "+oclExpression(ast.children[1])+")";
                break;

                // unary functions on all literals
            case NOT:
            case BITWISE_NOT:
            case UNARY_PLUS:
            case UNARY_MINUS:
                s = s + ast.value + oclExpression(ast.children[0]);
                break;
                // unary functions on numbers (incl bool)
            case INCREMENT:
            case DECREMENT:
                var incArg = stripCasts(ast.children[0]);
                var incType = ast.children[0].typeInfo.OpenCLType;
                switch (incType) {
                    case "float":
                    case "double":
                        // SAH: OpenCL does not have ++/-- for float and double, so we emulate it
                        if (ast.postfix) {
                            s = "(" + RENAME(incArg.value) + " " + ast.value.substring(0, 1) + "= ((" + incType + ") 1))";
                        } else {
                            // we would need a temp here. For now, just fail. This seems sufficiently uncommon...
                            throw new Error("prefix increment/decrement on floats is not implemented, yet.");
                        }
                        break;
                    default:
                        if (ast.postfix) {
                            s = s + oclExpression(ast.children[0]) + ast.value;
                        } else {
                            s = s + ast.value + oclExpression(ast.children[0]);
                        }
                }
                break;

                // literals
            case IDENTIFIER:
                s = s + RENAME(ast.value);
                break;
            case THIS:
                s = s + " tempThis "; // This should come from the boilerplate but that cannot be passed around easily
                break;
            case DOT:
                if (ast.children[0].typeInfo.isObjectType("InlineObject")) {
                    // TypeInference would have checked if this property selection
                    // is valid
                    s = s + " " + RENAME(ast.children[0].value) + "->" + ast.children[1].value;
                } else if ((ast.children[0].typeInfo.isArrayishType()) &&
                           (ast.children[1].value === "length")) {
                    // length property -> substitute the value
                    s = s + ast.children[0].typeInfo.getOpenCLShape()[0];
                } else {
                    reportBug("unsupported property selection in back end", ast);
                }
                break;

            case CAST:
            case FLATTEN:
            case NUMBER:
                s += oclExpression(ast);
                break;
            case TRUE:
                s += "true";
                break;
            case FALSE:
                s += "false";
                break;

                // array operations
            case INDEX:
                s += compileSelectionOperation(ast, ast.children[0], ast.children[1], true);
                break;

            case ARRAY_INIT:
                s = s + "(";
                for (var i=0;i<ast.children.length;i++) {
                    if (i>0) {
                        s += ", ";
                    }
                    s += "((" + ast.typeInfo.OpenCLType + ") " + ast.allocatedMem + ")[" + i + "] = " + oclExpression(ast.children[i]);
                }
                if (i>0) {
                    s += ", ";
                }
                s = s + "((" + ast.typeInfo.OpenCLType + ") " + ast.allocatedMem + "))";
                //}
                break;

                // function application
        case CALL:

                reportError("CALL not yet implemented", ast);
                break;
                // Below is the typ

                // argument lists
        case LIST:      
                for (var i=0; i<ast.children.length;i++) {
                    if (i>0) {
                        s += ", ";
                    }
                    s += oclExpression(ast.children[i]);
                }   
                break;

                // 
                // unsupported stuff here
                //
        case GETTER:
        case SETTER:
                reportError("setters/getters not yet implemented", ast);
                break;
        case TRY:
        case THROW:
                reportError("try/throw/catch/finally not yet implemented", ast);
                break;
        case BREAK:
                //s += " break; ";
                //break;
        case CONTINUE:
                //s += " continue; ";
                //break;
        case LABEL:
                reportError("break/continure/labels not yet implemented", ast);
                break;
        case YIELD:
        case GENERATOR:
                reportError("generators/yield not yet implemented", ast);
                break;
        case FOR_IN:
                reportError("for .. in loops not yet implemented", ast);
                break;
        case ARRAY_COMP:
        case COMP_TAIL:
                reportError("array comprehensions not yet implemented", ast);
                break;
        case NEW:
                reportError("general object construction not yet implemented", ast);
                break;
        case NEW_WITH_ARGS:
        case OBJECT_INIT:
                reportError("general object construction not yet implemented", ast);
                break;
        case WITH:
                reportError("general objects not yet implemented", ast);
                break;
        case LET:
        case LET_BLOCK:
                reportError("let not yet implemented", ast);
                break;
        case SWITCH:
                reportError("switch not yet implemented", ast);
                break;

                // unsupported binary functions
        case INSTANCEOF:
                reportError("instanceof not yet implemented", ast);
                break;
        case EQ:
        case NE:
                reportError("non-strict equality not yet implemented", ast);
                break;
        case IN:
                reportError("in not yet implemented", ast);
                break;

                // unsupported literals
        case NULL:
                reportError("null not yet implemented", ast);
                break;
        case REGEXP:
                reportError("regular expressions not yet implemented", ast);
                break;
        case STRING:
                reportError("strings not yet implemented", ast);
                break;

        case TOINT32:
                if (ast.typeInfo.isNumberType()) {
                    // we have a scalar number, so we just emit the
                    // conversion code
                    s = s + "(int)" + oclExpression(ast.children[0]); 
                } else {
                    // this is some form of array or vector. We do not
                    // have allocation of local temps, yet, so fail
                    throw "TOINT32 applied to non scalar data structure";
                }
                break;
        case DEBUGGER:  // whatever this is...
        default:
                throw "unhandled node type in analysis: " + tokens[ast.type];
    }

    if (ast.parenthesized) {
        s += ")";
    }

    return s;
    }

    return {"compile" : genKernel, "getError" : getError};
}());
