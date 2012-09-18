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

RiverTrail.Helper = function () {
    eval(Narcissus.definitions.consts);

    var nodeNames = ["children", "body", "setup", "condition", "update", "thenPart", "elsePart", "expression", "initializer"];

    function traverseAst (ast, f, env) {
        if (ast) {
            ast = f(ast, env);

            for (var field in nodeNames) {
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

    function inferTypedArrayType(array) {
        var i;
        var elementalType;
        for (i=0;i<arrayTypeToCType.length;i++) {
            if (array instanceof arrayTypeToCType[i][0]) {
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
        return elementalType;
    };

    function inferPAType(pa) {
        var dimSize = pa.getShape();
        var elementalType;
        //
        // if we already have type information, we return it.
        // 
        if (pa.elementalType === undefined) {
            pa.elementalType = inferTypedArrayType(pa.data);
        }
        return {"dimSize": dimSize, "inferredType" : pa.elementalType};
    }; 

    function stripToBaseType(s) {
        const regExp = /([a-zA-Z ]|\/\*|\*\/)*/;
        var match = s.match(regExp);
        return match[0];
    };

    // This is the helper version of TLiteral.prototype.getOpenCLSize()
    // These functions should be in sync.
    // Argument 't' is some scalar or pointer type
    function getOpenCLSize(type) {
        var base_type = stripToBaseType(type);
        if(base_type === type) {
            switch (base_type) {
                case "signed char":
                case "unsigned char":
                case "unsigned /* clamped */ char":
                    return 1;
                    break;
                case "short":
                case "unsigned short":
                    return 2;
                    break;
                case "float":
                case "int":
                case "unsigned int":
                    return 4;
                    break;
                case "double":
                    return 8;
                    break;
                default:
                 reportBug("size of type not known: " + type);
                 break;
            }
        }
        else { // 'type' is a pointer type.
            return 8;
        }
    }
    
    var Integer = function Integer(value) {
        this.value = value;
        return this;
    };

    // Returns a flat copy of a potentially nested JS Array "src"
    // We essentially do a depth first traversal of the nested array structure
    // and copy each Array of scalars encountered to the destination object.
    // This is potentially slower than the _fast implementation below.
    var FlatArray = function FlatArray(constructor, src) {
        var shape = this.shape = new Array();
        var ptr = src; var len = 1;
        var pos = 0;
        while (ptr instanceof Array) {
            shape.push(ptr.length);
            len *= ptr.length;
            ptr = ptr[0];
        }
        var data = this.data = new constructor(len);
        if(shape.length === 1) {
            for(var k = 0; k < shape[0]; k++) {
                if (typeof(src[k]) !== 'number') {
                    throw "Error: Conversion to flat array failed: not a number!";
                }
                this.data[pos++] = src[k];
            }
            return this;
        }
        ptr = src;
        var stack = new Array();
        stack.push(ptr);
        pos = 0;
        while(stack.length !== 0) {
            var node = stack.pop(); 
            if(!(node instanceof Array)) {
                throw "Error: Non array node pushed!! Flattening kernel argument failed.";
            }
            if (node[0] instanceof Array) {
                var len = node[0].length;
                for(var i = node.length-1; i >= 0; i--) {
                    if(!(node[i] instanceof Array) || (node[i].length !== len)) {
                        throw "Error: Invalid array shape !! Flattening kernel argument failed";
                    }
                    stack.push(node[i]);
                }
                continue;
            }
            else {
                if(node.length !== shape[shape.length-1]) {
                    throw "Error: Leaf length and shape are different! Flattening kernel argument failed";
                }
                for(var j = 0; j < node.length; j++) {
                    if (typeof(node[j]) !== 'number') {
                        throw "Error: Conversion to flat array failed: not a number!";
                    }
                    this.data[pos++] = node[j];
                }
            }
        }
        return this;
    }
    var FlatArray_fast = function FlatArray_fast(constructor, src) {
        var shape = this.shape = new Array();
        var ptr = src;
        var len = 1;

        while (ptr instanceof Array) {
            shape.push(ptr.length);
            len *= ptr.length;
            ptr = ptr[0];
        }

        var data = this.data = new constructor(len);
        
        var ptrstack = new Array();
        var pstack = new Array();
        var level = 0;
        var wpos = 0, pos = 0;
        ptr = src;
        
        while (wpos < len) {
            if (ptr[pos] instanceof Array) {
                // check conformity
                if (ptr[pos].length != shape[level+1]) throw "inhomogeneous array encountered";
                // go deeper
                ptrstack[level] = ptr;
                pstack[level] = pos+1;
                ptr = ptr[pos];
                pos = 0;
                level++;
            } else {
                // copy elements. If we get here, first check that we are at the bottom level
                // according to the shape
                if (level != shape.length-1) throw "inhomogeneous array encountered";
                // if this is uniform, we can just copy the rest of this level without 
                // further checking for arrays
                for (; pos < ptr.length; pos++,wpos++) {
                    this.data[wpos] = ptr[pos];
                    if (this.data[wpos] !== ptr[pos]) throw new "conversion error";
                }
            }
            if (pos === ptr.length) {
                // end of level
                level--;
                pos = pstack[level];
                ptr = ptrstack[level];
            }
        }

        return this;
    };

    var compareObjectFields = function(f1, f2) {
        if((f2.hasOwnProperty(idx) && f1[idx].equals(f2[idx]))) {
            return true;
        }
        return false;
    };

    // helper function that throws an exception and logs it if verboseDebug is on
    var debugThrow = function (e) {
        if (RiverTrail.compiler.verboseDebug) {
            console.log("Exception: " + JSON.stringify(e));
        }
        throw e;
    };

    // This is used to check whether an object is a typed array. It is specialized
    // depending on whether the browser supports typed arrays or not.
    var isTypedArray;
    if ((typeof(Float32Array) == "function") && (typeof(Float32Array.prototype) == "object")) {
        isTypedArray = function (arr) {
            return ((arr instanceof Float32Array) || (arr instanceof Float64Array) ||
                    (arr instanceof Int8Array) || (arr instanceof Int16Array) ||
                    (arr instanceof Int32Array) || (arr instanceof Uint8Array) ||
                    (arr instanceof Uint16Array) || (arr instanceof Uint32Array) ||
                    ((typeof(Uint8ClampedArray) == "function") && (arr instanceof Uint8ClampedArray)));
        };
    } else {
        isTypedArray = function( arr) {
            return false;
        }
    }

    // 
    // helper functions for using the narcissus parser to parse a single function. The are used by the
    // driver and by type inference for external references.
    //

    //
    // Name generator to ensure that function names are unique if we parse
    // multiple functions with the same name
    //
    var nameGen = function () {
        var counter = 0;

        return function nameGen (postfix) {
            return "f" + (counter++) + "_" + (postfix || "nameless");
        };
    }();

    //
    // given a string, return a parsed AST
    //
    var parseFunction = function (kernel) {
        var parser = Narcissus.parser;
        var kernelJS = kernel.toString();
        // We want to parse a function that was used in expression position
        // without creating a <script> node around it, nor requiring it to
        // have a name. So we have to take a side entry into narcissus here.
        var t = new parser.Tokenizer(kernelJS);
        t.get(true); // grab the first token
        var ast = parser.FunctionDefinition(t, undefined, false, parser.EXPRESSED_FORM);        
        // Ensure that the function has a valid name to simplify the treatment downstream
        if (!ast.name) ast.name = "nameless";
        return ast;
    };

    //
    // helper to clone the AST for function specialisation. We do not aim to deep clone here, just the 
    // structure of the spine as created by Narcissus. All extra annotations are discarded.
    //
    var cloneAST = function (ast) {
        var funAsString = wrappedPP(ast);
        return parseFunction(funAsString);
    }

    //
    // tree copying --- can copy the AST up until after type inference
    //
    var cloneFunction = function (dropTypes) {
        var copyLut = undefined;
        var varLut = undefined;
        var counter = function () {
                var cnt = 0;
                return function () { return cnt++; };
            }();
        var cntMin = 0;
        var cloneAstArray = function cloneAstArray(array) {
            return array.map(cloneSon);
        };
        var cloneAstFlow = 
            dropTypes ?
            function nothing() { return undefined; } :
            function cloneFlowNode(flow) {
                var result = copyLut[flow.label];
                if (!result) {
                    // ast nodes are fixed up later. everything else is lut copied
                    if (flow instanceof RiverTrail.Typeinference.FFunction) {
                        result = new RiverTrail.Typeinference.FFunction(cloneAstArray(flow.params), cloneAstType(flow.result), flow.root, undefined /* patch up later */); 
                    } else if (flow instanceof RiverTrail.Typeinference.FCall) {
                        // We duplicate the call flow node, but not the function frame it points to, as we do not
                        // copy the called function, either. We need to update the reference counter, though!
                        result = new RiverTrail.Typeinference.FCall(cloneAstArray(flow.params), flow.frame, cloneAstType(flow.result), undefined /* patch up later */);
                        result.frame.uses++;
                    } else if (flow instanceof RiverTrail.Typeinference.FParam) {
                        result = new RiverTrail.Typeinference.FParam(flow.number, cloneAstFlow(flow.call))
                    } else {
                        throw "unknown flow";
                    }

                    copyLut[flow.label] = result;
                }
                    
                return result;
            };
        var cloneAstType = 
            dropTypes ? 
            function nothing() { return undefined; } :
            function cloneAstType(type) {
                var result = copyLut[type.label];
                if (!result) {
                    result = type.clone(copyLut);
                    if (type.flowTo) {
                        result.flowTo = type.flowTo.map(cloneSon);
                    }
                }

                return result;
            };
        var cloneAstNode = function cloneAstNode(ast) {
            if (ast.type === IDENTIFIER) {
                // These nodes may appear twice in the ast, once in varDecls
                // and once in the body. So we need to lut-copy here
                if (ast.cloneLabel && (ast.cloneLabel > cntMin)) {
                    // we have a previous copy
                    return varLut[ast.cloneLabel-cntMin];
                } 
            }
            var result = new Narcissus.parser.Node(ast.tokenizer);
            for (var key in ast) {
                // we hard code a son exclusion list here. Somewhat ugly but probably
                // the fastest solution.
                switch (key) {
                    case "length":
                    case "specStore":
                    case "adrSpecStore":
                    case "redispatched":
                        break;
                    case "funDecls":
                        result[key] = [];
                        break;
                    default:
                        result[key] = cloneSon(ast[key]);
                }
            }
            // some fixup
            if ((result.type === FUNCTION) && result.flowFrame) {
                result.flowFrame.ast = result;
            }
            if ((result.type === CALL) && result.callFrame) {
                result.callFrame.ast = result;
            }
            if (ast.type === IDENTIFIER) {
                // remember this clone
                ast.cloneLabel = counter();
                varLut[ast.cloneLabel-cntMin] = result;
            }

            return result;
        };
        var cloneSon = function cloneSon(son) {
            if (son instanceof Array) {
                return cloneAstArray(son);
            } else if (son instanceof Narcissus.parser.Node) {
                return cloneAstNode(son);
            } else if (son instanceof RiverTrail.Typeinference.Type) {
                return cloneAstType(son);
            } else if (son instanceof RiverTrail.Typeinference.FlowNode) {
                return cloneAstFlow(son);
            } else {
                return son;
            };
        };

        return function (ast) {
            copyLut = [];
            varLut = [];
            cntMin = counter();
            var result = cloneAstNode(ast);
            result.dispatch = nameGen(result.name || (result.name = "nameless"));
            return result;
        };
    };

    //
    // error reporting helper functions
    //
    function reportError(msg, t) {
        throw "Error: " + msg + " [source code was `" + (t ? wrappedPP(t) : "no context") + "`]"; // could be more elaborate
    }
    function reportBug(msg, t) {
        throw "Bug: " + msg; // could be more elaborate
    }

    //
    // helper to follow a selection chain to the root identifier
    //
    function findSelectionRoot(ast) {
        switch (ast.type) {
            case INDEX:
                return findSelectionRoot(ast.children[0]);
                break; // superfluous, I know
            case IDENTIFIER:
                return ast;
                break; // superfluous, I know
            default:
                throw "malformed lhs sel expression in assignment";
        }
    };

    // used in genOCL and infermem to decide whether a return expression qualifies for
    // allocation free copying
    function isArrayLiteral (ast) {
        return ((ast.type === ARRAY_INIT) &&
                ((ast.typeInfo.getOpenCLShape().length == 1) ||
                 ast.children.every(function (x) { return (x.type === IDENTIFIER) || isArrayLiteral(x);})));
    };

    // allocate an aligned Typed Array
    function allocateAlignedTA(template, length) {
        if(!RiverTrail.compiler){
            return new template(length);
        }
        var alignment = RiverTrail.compiler.openCLContext.alignmentSize;
        if (!alignment) {
            // old extension, do not align
            return undefined;
            return new constructor(size);
        }
        var buffer = new ArrayBuffer(length * template.BYTES_PER_ELEMENT + alignment);
        var offset = RiverTrail.compiler.openCLContext.getAlignmentOffset(buffer);
        return new template(buffer, offset, length);
    };

    return { "traverseAst" : traverseAst,
             "wrappedPP" : wrappedPP,
             "inferPAType" : inferPAType,
             "elementalTypeToConstructor" : elementalTypeToConstructor,
             "stripToBaseType" : stripToBaseType,
             "getOpenCLSize" : getOpenCLSize,
             "Integer" : Integer,
             "FlatArray" : FlatArray,
             "debugThrow" : debugThrow,
             "isTypedArray" : isTypedArray,
             "inferTypedArrayType" : inferTypedArrayType,
             "cloneFunction" : cloneFunction,
             "nameGen" : nameGen,
             "parseFunction" : parseFunction,
             "reportError" : reportError,
             "reportBug" : reportBug,
             "findSelectionRoot" : findSelectionRoot,
             "isArrayLiteral" : isArrayLiteral,
             "compareObjectFields" : compareObjectFields,
             "allocateAlignedTA" : allocateAlignedTA
    };

}();
