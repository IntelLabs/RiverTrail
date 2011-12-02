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
    const parser = Narcissus.parser;
    const definitions = Narcissus.definitions;
    const tokens = RiverTrail.definitions.tokens;

    // Set constants in the local scope.
    eval(definitions.consts);
    eval(RiverTrail.definitions.consts);
    
    // If you are working inside the top level of actual kernel function then scope is empty.
    // If you generating code for a called function then this will be true.
    var calledScope = function () {
        "use strict";
        // state is private.
        var state = false;
        var enter = function enter() {
            state = true;
        };
        var exit = function exit(previous) {
            state = previous;
        }
        var inCalledScope = function () {
            return state;
        };
        return {"enter": enter, "exit": exit, "inCalledScope": inCalledScope};
    } ();

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
            return genSimpleFormalParams(formalsAst);
        } else {
            return genKernelFormalParams(formalsAst, construct);
        }
    };
    
    var genSimpleFormalParams = function (formalsAst) {
        "use strict";
        var i;
        var s = "";
        var formalsNames = formalsAst.params;
        var formalsTypes = formalsAst.typeInfo.parameters;

        for (i = 0; i < formalsTypes.length; i++) {
            if (s !== "" ) { 
                s = s + ", "; // leave out the , before the first parameter
            }

            if (formalsTypes[i].isObjectType("ParallelArray") || formalsTypes[i].isObjectType("Array")) {
                // array argument, so needs address space qualifier
                s = s + formalsTypes[i].properties.addressSpace + " ";
            }

            s = s + formalsTypes[i].OpenCLType + " " + formalsNames[i];
            // array arguments have an extra offset qualifier
            if (formalsTypes[i].isObjectType("ParallelArray")) {
                s = s + ", int " + formalsNames[i] + "__offset"; //offset
            }
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
            
            formalsNames = formalsNames.slice(1); // THis skips the index argument
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

            if (formalsTypes[i].isObjectType("ParallelArray") || formalsTypes[i].isObjectType("Array")) {
                // array argument, so needs address space qualifier
                s = s + formalsTypes[i].properties.addressSpace + " ";
            }

            s = s + formalsTypes[i].OpenCLType + " " + formalsNames[i];
            // array arguments have an extra offset qualifier
            if (formalsTypes[i].isObjectType("ParallelArray")) {
                s = s + ", int " + formalsNames[i] + "__offset"; //offset
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
        
        for (i = start; i < formalsTypes.length; i++) {
            // array arguments have an extra offset qualifier
            if (formalsTypes[i].isObjectType("ParallelArray")) {
                s = s + formalsNames[i-1] + " = &"+formalsNames[i-1]+"["+formalsNames[i-1]+"__offset];"; //offset
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
            indexName = funDecl.params[0];

            // the first argument is id that this call is responsible for.
            if (indexType.isObjectType("Array")) { //(formalsType === "int*") {
                dimSizes = indexType.getOpenCLShape();
                s = s + indexType.properties.addressSpace+" const "+ RiverTrail.Helper.stripToBaseType(indexType.OpenCLType) + " " +
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
            s = s + " const "+indexType.OpenCLType+" "+ indexName+" = tempThis[_readoffset];"

        }
        return s;
    };
    
    var genLocalVars = function (varList) {
        "use strict";
        var s = " ";
        var i;
        var typeString;
        for (i = 0; i < varList.length; i++) {
            if (varList[i].initializer) {
                // variables without an inferred type are not used and this can be removed.
                typeString = varList[i].initializer.typeInfo.OpenCLType;
                s = s + typeString + " " + varList[i].value + "; ";
            }
        }
        return s;
    };
    

    //
    // This generates code for a function that is presmable called from the kernel function.
    // 
    function genCalledFunction(ast) {
        "use strict";
        var s = " ";
        
        var previousCalledScope = calledScope.inCalledScope();
        calledScope.enter();
        if (ast.value != "function") {
            throw "expecting function found " + ast.value;
        }
        s = s + " " +ast.typeInfo.result.OpenCLType + " " + ast.name;
        s = s + "("; // start param list.
        s = s + genFormalParams(ast, "ignore");
        s = s + " ) ";
        s = s + " { ";// Generate the statements;
        s = s + oclStatements(ast.body);
        s = s + " } ";
        
        calledScope.exit(previousCalledScope);
        return s;
    }
    
    //
    // Generate a string representing the kernel function
    // input: The ast (or fragment of the ast)
    // returns: The openCL code represented by the ast.
    //
        
    // boilerplate holds the various strings used for the signature of opneCL kernel function,
    // the declaration of some locals and the postfix (used by return). 
    var boilerplateTemplates = {
        "map": {
            "hasThis": true,
            "localThisName": " tempThis",
            "localThisDefinition": " opThisVect[opThisVect__offset]",
            "thisShapeLength": "const int thisShapeLength = ",
            "thisShapeDeclPre": "const int thisShapeDecl ",
            "localResultName": " tempResult",
            // The body goes here and return uses this to figure out what to return;
            "resultAssignLhs": " retVal[_writeoffset] = ",
            "returnType": "double",// This may be altered based on the type of the "this" pa.
            "resultAssignRhs": " tempResult",
        },
        "combine": {
            "hasThis": true,
            // the type of this goes here.
            "localThisName": " tempThis",
            "localThisDefinition": " opThisVect[opThisVect__offset]",
            "thisShapeLength": "const int thisShapeLength = ",
            "thisShapeDeclPre": "const int thisShapeDecl ",
            // the type of the result of the elemental function goes here
            "localResultName": " tempResult",
            // The body goes here and return uses this to figure out what to return;
            "resultAssignLhs": " retVal[_writeoffset] = ",
            "returnType": "double", // This may be altered based on the type of the "this" pa.
            "resultAssignRhs": " tempResult",
        },
        "comprehension": {
            "hasThis": false,
            // the type of this goes here.
            "localThisName": undefined,
            "localThisDefinition": " opThisVect[opThisVect__offset]",
            "thisShapeLength": "const int thisShapeLength = ",
            "thisShapeDeclPre": "const int thisShapeDecl ",
            // the type of the result of the elemental function goes here
            "localResultName": " tempResult",
            // The body goes here and return uses this to figure out what to return;
            "resultAssignLhs": " retVal[_writeoffset] = ",
            "returnType": "double", // This may be altered based on the type of the "this" pa.
            "resultAssignRhs": " tempResult",
        },
        "comprehensionScalar": {
            "hasThis": false,
            // the type of this goes here.
            "localThisName": undefined,
            "localThisDefinition": " opThisVect[opThisVect__offset]",
            "thisShapeLength": "const int thisShapeLength = ",
            "thisShapeDeclPre": "const int thisShapeDecl ",
            // the type of the result of the elemental function goes here
            "localResultName": " tempResult",
            // The body goes here and return uses this to figure out what to return;
            "resultAssignLhs": " retVal[_writeoffset] = ",
            "returnType": "double", // This may be altered based on the type of the "this" pa.
            "resultAssignRhs": " tempResult",
        }
    };

    var boilerplate = null; // Set to the template based on the construct being compiled. 
   
    function genKernel (ast, pa, rank, construct) {
        "use strict";
        var kernelCode;
        try {        
            kernelCode = genKernelHelper(ast, pa, rank, construct);
            if (verboseDebug) {
                console.log(kernelCode);
            }
        } catch (e) {
            console.log(e.toString());
            throw e;
        }
        return kernelCode;
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
        // Dump the helper function first, c99 requires this.
        // The kernel function has now been dumped.
        // We now turn our attention to function the kernel function might have called.
        // Do we need to dump signatures in case there is a forward reference?
        for (i=0; i<ast.body.funDecls.length; i++) {
            s = s + genCalledFunction(ast.body.funDecls[i]);            
        }

        boilerplate = boilerplateTemplates[construct];

        s = s + "__kernel void " + funDecl.name + "(";

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
         if ((construct === "combine") || (construct === "map")) {
             // combine and map inherit the type of this!
             boilerplate.returnType = RiverTrail.Helper.stripToBaseType(thisSymbolType.OpenCLType);
             s = s + "__global " + boilerplate.returnType + "* retVal";
         } else if ((construct === "comprehension") || (construct === "comprehensionScalar")) {      
             boilerplate.returnType = RiverTrail.Helper.stripToBaseType(funDecl.typeInfo.result.OpenCLType);
             s = s + "__global " + boilerplate.returnType + "* retVal"; 
        } else {
             throw "unimplemented construct " + construct;
        }
        s = s + ", int retVal__offset";
        // Close the param list
        s = s + ")";
        s = s + " {";

        // add declaration of bounds checks helper variables
        s = s + "int _sel_idx_tmp; bool _FAIL = 0;";

        // add code to declare id_x for each iteration dimension
        for (i = 0; i < rank; i++) {
            s = s + "int _id_" + i + " = (int)get_global_id(" + i + ");";
        }
        
        // add code to compute the offset 'writeoffset' into flat result vector
        s = s + "int _writeoffset = 0";
        stride = ast.typeInfo.result.getOpenCLShape().reduce(function(a,b) { return (a*b);}, 1);
        for (i = rank-1; i>=0; i--) {
            s = s + "+" + stride + " * " + "_id_" + i;
            stride = stride * iterSpace[i];
        }
        s = s + ";";
        // add code to compute offset 'readoffset' into flat vector when using map
        if (construct === "map") {
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
            s = s + ";";
        }
        // add retval offset to writeoffset
        s = s + "_writeoffset += retVal__offset;";

        // Add code to declare tempThis
        if (boilerplate.hasThis) {
            var thisShape = thisSymbolType.getOpenCLShape();
            s = s + (thisIsScalar ? " " : " __global ") + thisSymbolType.OpenCLType + " "+ boilerplate.localThisName + ";";
            
            // initialise tempThis
            s = s + boilerplate.localThisName + " = " + (thisIsScalar ? "(" : "&(") + boilerplate.localThisDefinition + ");"; 

            // declare shape;
            s = s + boilerplate.thisShapeLength + thisShape.length + ";";
            if (thisShape.length > 0) {
                s = s + boilerplate.thisShapeDeclPre + "[" + thisShape.length + "] = { ";

                s = s + thisShape[0];

                for (i = 1; i < thisShape.length; i++) {
                    s = s + ", " + thisShape[i];
                }
                s = s + "};";
            } 
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
    function genSimpleReturn (ast) {
        "use strict";
        var s = " ";
        var rhs;    // right-hand-side

        rhs = ast.value;
        if (rhs.typeInfo.isScalarType()) {
            // scalar result
            s = " return " + oclExpression(rhs) + ";";
        }
        return s;
    }

    //
    // Typically they take the ast as an argument and return the appropriate string.
    //
    // You need to add a cast here so that the double you see is casted to a float before you store 
    // it in retval.
    function genKernelReturn (ast) {
        "use strict";
        var s = " ";
        var elements;
        var rhs;    // right-hand-side
        var i;
        var convPre = ""; // what to convert the temps into to store them in retval.
        var convPost = "";
        
        rhs = ast.value;
        if (rhs.typeInfo.isScalarType()) {
            // scalar result
            s = boilerplate.localResultName + " = " + oclExpression(rhs) + ";";
            s = s + boilerplate.resultAssignLhs + "("+boilerplate.returnType+")"+boilerplate.resultAssignRhs+";"; // Need to add cast here.....
        } else {
            // vector result. We have two cases: either it is an identifier, then we do an elementwise assign.
            // or it is an array expression, in which case we generate code for each element and then assign that.
            elements = rhs.typeInfo.properties.shape.reduce(function (a,b) { return a*b;});
            // elements = rhs.inferredType.dimSize.reduce(function (a,b) { return a*b;});
            convPre = "((" + boilerplate.returnType + ") ";
            convPost = ")";
            while (rhs.type === CAST) {
                // detect casts to facilitate direct assign
                convPre = convPre + "((" + rhs.typeInfo.OpenCLType + ")";
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
                s = s + "}}";
            }
        }
        s = s + "if (_FAIL) {*_FAILRET = 1;}";
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
         if (statements.type === BLOCK) {
            for (i=0; i<statements.children.length;i++) {
                s = s + oclStatement(statements.children[i]) + ";";
            }
         } else if (statements.type === SCRIPT) {
            for(x in statements.varDecls) {
                var name = statements.varDecls[x].value;
                var type = statements.symbols.getType(name);
                if (type) {
                    s = s + " " + type.getOpenCLAddressSpace() + " " + type.OpenCLType + " " + name + "; ";
                } else {
                    // This variable isn't used so drop on floor for now.
                }
            }
            
            // declare memory variables associated with this script
            s = s + statements.memVars.declare();

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
    // As a side effect, the global variable _FAIL is set to 1
    // if a bounds check failed.
    function wrapIntoCheck(range, bound, expr) {
        var postfix = "";
        var result = "";
        var dynCheck = false;

        if (bound === 0) {
            // we have an empty array => you cannot select from those
            // (yeah, yeah, I know, a real corner case :=D)
            throw new Error("selection from empty array encountered!");
        }

        if (checkBounds && 
            ((range.lb === undefined) ||
             (range.lb < 0))) {
            // emit lower bound check
            result += "(_sel_idx_tmp < 0 ? (_FAIL = 1, 0) : ";
            postfix = ")" + postfix;
            dynCheck = true;
        }

        if (checkBounds &&
            ((range.ub === undefined) ||
             (range.ub >= bound))) {
            // emit upper bound check
            result += "(_sel_idx_tmp >= " + bound + " ? (_FAIL = 1, 0) : ";
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
        if (elemRank !== 0) {
            // The result is a pointer to a sub dimension.
            s = s + "( &";
        }
        elemSize = ast.typeInfo.getOpenCLShape().reduce( function (p,n) { return p*n;}, 1);
        s = s + " ( " + oclExpression(source) + "[0 ";

        stride = elemSize;
        
        if (arrayOfIndices.type !== LIST) {
            // we have a single scalar index from an INDEX op
            rangeInfo = arrayOfIndices.rangeInfo;
            s = s + " + " + stride + " * ("+wrapIntoCheck(rangeInfo, sourceShape[0], oclExpression(arrayOfIndices)) + ")";
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
                    s = s + wrapIntoCheck(rangeInfo[0][i], sourceShape[i], oclExpression(arrayOfIndices.children[0]) + "[" + i + "]") + ")";
                } else {
                    s = s + wrapIntoCheck(rangeInfo[i], sourceShape[i], oclExpression(arrayOfIndices.children[i])) + ")";
                }
                stride = stride * sourceType.getOpenCLShape()[i];
            }
        }
        
        s = s + "])";

        if (elemRank !== 0) {
            // The result is a pointer to a sub dimension.
            s = s + " )";
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
            //if (ast.typeInfo.OpenCLType === "int") {
                //s = "((" + ast.typeInfo.OpenCLType + ") (" 
                        //+ oclExpression(ast.children[0]) + " + 0.5 * sign(" + oclExpression(ast.children[0]) + "))))";
            //} else {
                s = "((" + ast.typeInfo.OpenCLType + ")" 
                        + oclExpression(ast.children[0]) + ")";
            //}
        } else if (ast.type === NUMBER) {
            //if (ast.typeInfo.OpenCLType) {
            //    s = s + "("+ast.typeInfo.OpenCLType+")"+ast.value;
            //} else {
                if ((ast.typeInfo.OpenCLType === "float") ||
                    (ast.typeInfo.OpenCLType === "double")) {
                    s = s + ast.value;
                    if (String.prototype.indexOf.call(ast.value, '.') === -1) {
                        s = s + ".0";
                    }
                    if (ast.typeInfo.OpenCLType === "float") {
                        s = s + "f";
                    }
                } else if (ast.typeInfo.OpenCLType === "int"){
                    s = s + ast.value;
                } else if (ast.typeInfo.OpenCLType === "boolean"){
                    s = s + ast.value; // CR check that this works.
                } else {
                    s = s + ast.value; // CR TBD - Catch all at some point not all of the explicitly 
                                       // and add an exception if not recognized.
                }
            //}
        } else if (ast.type === THIS) {
            s = s + " tempThis "; // SAH: this should come from the boilerplate but that cannot be passed around easily
        
        } else if (ast.type === CALL) {
            // Deal with some intrinsics if found, otherwise just make the call.
            if (ast.children[0].type === DOT ) {
                var lhs = ast.children[0].children[0]; // the object
                var rhs = ast.children[0].children[1]; // the method call

                if (rhs.value === "get") {
                    s = s + compileSelectionOperation(ast, ast.children[0].children[0], ast.children[1]);
                } else if ((rhs.value === "getShape") && (lhs.type === THIS)) {
                    s = s + "thisShapeDecl";
                } else if (rhs.value === "length") {
                    // a this.length intrinsic.
                    s = s + "TBD deal with length" +ast.first.inferredType.dimSize[0];
                } else if (lhs.value === "Math") {
                    s = s + mathOCLMethod(ast);
                } else {
                        s = s + " 628 oclExpression not complete probable some sort of method call ";
                }
            } else { // It is not a method call.
                s = s + ast.children[0].value + "(" + oclExpression(ast.children[1]) + ")";
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
                
                reportBug("Function encountered that is not at the top level. ", ast);
                
                // this is not an applied occurence but the declaration, so we do not do anything here
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
                s += "do ("+oclStatements(ast.body)+")" + oclStatements(ast.body)+" while ("+oclExpression(ast.condition)+");";
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
                } else {
                    reportError("expected a semicolon to have an expression. ", ast);
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
                                                    prev += ast.value + " = " + oclExpression(ast.initializer); 
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
                                throw new Error("a memcopy would be required to compile this code.");
                        } else {
                            s = s + "(" + ast.children[0].value + (ast.assignOp ? tokens[ast.assignOp] : "") + "= " + oclExpression(ast.children[1]) + ")"; // no ; because ASSIGN is an expression!
                        }
                        break;
                    case INDEX:
                        // array update <expr>[iv] = expr
                        // 1) check that iv is a number type
                        // 2) figure out what <expr> is. Could be another selection
                        reportBug("Array selection on LHS is a todo");
                        break;
                    case DOT:
                        // object property update.
                        reportError("objects not implemented yet");
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
            case PLUS: 
                // we do not support strings yet, so this case is the same as numbers
                // fallthrough

            // binary operators on numbers (incl bool)
            case BITWISE_OR:
            case BITWISE_XOR:
            case BITWISE_AND:
            case EQ:
            case NE:
            case STRICT_EQ:
            case STRICT_NE:
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
            case MOD: 
                s = s + "("+oclExpression(ast.children[0]) + ast.value + oclExpression(ast.children[1]) + ")";
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
                var incArg = stripCasts(ast.children[0]).value;
                var incType = ast.children[0].typeInfo.OpenCLType;
                switch (incType) {
                    case "float":
                    case "double":
                        // SAH: OpenCL does not have ++/-- for float and double, so we emulate it
                        if (ast.postfix) {
                            s = "(" + incArg.value + " " + ast.value.substring(0, 1) + "= ((" + incType + ") 1))";
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
                s = s + ast.value;
                break;
            case THIS:
                s = s + " tempThis "; // This should come from the boilerplate but that cannot be passed around easily
                break;
            case DOT:
                reportBug("DOT is a todo in the code generator.");
                break;

            case CAST:
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
                if (ast.typeInfo.properties.elements.getOpenCLShape().length > 0) {
                    // nested array
                    throw new Error("compilation of nested local arrays not implemented");
                } else {
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
                    s = s + ast.allocatedMem + ")";
                }
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
            case CONTINUE:
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
            case NEW_WITH_ARGS:
            case OBJECT_INIT:
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

    return genKernel;

}());
