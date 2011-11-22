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

//
// Type inference phase
//

RiverTrail.Typeinference = function () {
    var definitions = Narcissus.definitions;
    eval(definitions.consts);
    eval(RiverTrail.definitions.consts);

    var inferPAType = RiverTrail.Helper.inferPAType;
    
    const debug = false;
    const allowGlobalFuns = false; // Set to true so kernel functions can call global functions.

    var openCLUseLowPrecision = false;

    //
    // error reporting
    //
    function reportError(msg, t) {
        throw "Error: " + msg + " <" + (t ? Narcissus.decompiler.pp(t) : "no context") + ">"; // could be more elaborate
    }
    function reportBug(msg, t) {
        throw "Bug: " + msg; // could be more elaborate
    }

    //
    // Base prototype shared by all type structures
    //
    var Type = function (kind) {
        this.kind = kind;
    };
    Type.OBJECT = "OBJECT";
    Type.LITERAL = "LITERAL";
    Type.FUNCTION = "FUNCTION";
    Type.BOTTOM = "BOTTOM";

    var Tp = Type.prototype;
    Tp.toString = function () { return "<general type>"; };
    Tp.equals = function(other) {
        return (this.kind === other.kind);
    };
    Tp.isArithType = function () { // type is allowed argument to arithmetic operations
        return ((this.kind === Type.LITERAL) &&
                ((this.type === TLiteral.NUMBER) ||
                 (this.type === TLiteral.BOOL)));
    };
    Tp.isNumberType = function () { // type is allowed argument to arithmetic operations
        return ((this.kind === Type.LITERAL) &&
                (this.type === TLiteral.NUMBER));
    };
    Tp.isTruthType = function () { // type is allowed in predicate positions
        return ((this.kind === Type.LITERAL) &&
                ((this.type === TLiteral.NUMBER) ||
                 (this.type === TLiteral.BOOL)));
    };
    Tp.isBoolType = function () { // type is allowed argument to arithmetic operations
        return ((this.kind === Type.LITERAL) &&
                (this.type === TLiteral.BOOL));
    };
    Tp.isScalarType = function () { // type is a scalar value
        return ((this.kind === Type.LITERAL) &&
                ((this.type === TLiteral.BOOL) || (this.type === TLiteral.NUMBER)));
    };
    Tp.isObjectType = function (name) { // checks whether type is object; name is optional
        return ((this.kind === Type.OBJECT) &&
                ((name === undefined) ||
                 (this.name === name)));
    };
    Tp.isBottomType = function () {
        return (this.kind === Type.BOTTOM);
    };
    Tp.registerFlow = function (from) {
        (this.flowFrom || (this.flowFrom = [])).push(from);
        (from.flowTo || (from.flowTo = [])).push(this);
    };
    Tp.getOpenCLShape = function () {
        return []; // everything is a scalar unless defined otherwise
    };
    Tp.getOpenCLSize = function () {
        reportBug("size of type not known:" + this.kind);
    };
    Tp.getOpenCLAddressSpace = function () {
        return "";
    }

    //
    // literal type for all literals
    //
    var TLiteral = function (type) {
        this.type = type;
        switch (type) {
            case TLiteral.NUMBER:
                this.OpenCLType = (openCLUseLowPrecision ? "float" : "double");
                break;
            case TLiteral.BOOL:
                this.OpenCLType = "bool";
                break;
            case TLiteral.STRING:
                this.OpenCLType = "char *";
                break;
            default:
                reportBug("unknown type for literal " + type);
        }
    };
    TLiteral.NUMBER = "NUMBER";
    TLiteral.STRING = "STRING";
    TLiteral.BOOL = "BOOL";

    var TLp = TLiteral.prototype = new Type(Type.LITERAL);
    TLp.toString = function () { return "Literal: " + this.type + "<" + this.OpenCLType + ">"};
    TLp.equals = function (other) {
        return (this.constructor.prototype.equals.call(this, other) &&
                (this.type === other.type));
    };
    TLp.clone = function () {
        var result = new TLiteral(this.type);
        result.OpenCLType = this.OpenCLType;

        return result;
    };
    TLp.getOpenCLSize = function getOpenCLSize() {
        switch (this.OpenCLType) {
            case "float":
            case "int":
                return 4;
                break;
            case "double":
                return 8;
                break;
            default:
                reportBug("size of type not known:" + this.OpenCLType);
                break;
        }
    };

    //
    // Function or arrow type. The result is a single type whereas
    // parameters is an array of types.
    //
    var TFunction = function (parameters, result) {
        this.parameters = parameters;
        this.result = result;
    };

    var TFp = TFunction.prototype = new Type(Type.FUNCTION);
    TFp.toString = function () { 
        var s = "(";
        for (var pos = 0; pos < this.parameters.length; pos++) {
            s = s + (pos > 0 ? ", " : "") + this.parameters[pos].toString();
        }
        s = s + ") -> " + this.result.toString();
        return s;
    };
    TFp.equals = function (other, argsOnly) {
        return (this.constructor.prototype.equals.call(this, other) &&
                (argsOnly || this.result.equals(other.result)) &&
                (this.parameters.length === other.parameters.length) &&
                this.parameters.every( function (oneP, index) { return oneP.equals(other.parameters[index]);}));
    };
    TFp.clone = function () {
        var result = new TFunction(this.parameters, this.result);

        return result;
    };

    //
    // Object type. The name is the globally unique name of the object,
    // usually the name of the constructor (e.g. Array, ParallelArray).
    //
    var TObject = function (name) {
        this.name = name;
        this.properties = {};
        this.properties.__proto__ = null;
    };
    TObject.ARRAY = "Array";
    TObject.PARALLELARRAY = "ParallelArray";
    TObject.makeType = function (name, val) {
        return this.prototype.registry[name].makeType(val);
    };
    TObject.deriveObjectType = function (obj) {
        var name, key;
        var isInstance = function isInstance (x) { 
            return (obj instanceof x);
        };
        for (key in this.prototype.registry) {
            if (((this.prototype.registry[key].constructor !== undefined) &&
                 (obj instanceof this.prototype.registry[key].constructor)) ||
                ((this.prototype.registry[key].constructors !== undefined) &&
                 this.prototype.registry[key].constructors.some(isInstance))) {
                name = key;
                break;
            }
        }
        return name;
    };

    var TOp = TObject.prototype = new Type(Type.OBJECT);

    TOp.registry = {};              // mapping from object names to the
    TOp.registry.__proto__ = null;  // handler that contains implementations
                                    // for abstract interpretation of the 
                                    // object's methods

    TOp.toString = function () { 
        var s = "Object: " + this.name + "[";
        for (var key in this.properties) {
           s = s + key + ":" + (this.properties[key] ? this.properties[key].toString() : "undefined") + ", ";
        }
        s = s + "]";
        s = s + "<" + this.OpenCLType + ">";
        return s;
    };
    TOp.equals = function (other) {
        return (this.constructor.prototype.equals.call(this, other) &&
                (this.name === other.name) &&
                (this.registry[this.name].equals.call(this, other)));
    };
    TOp.clone = function () {
        var result = new TObject(this.name);
        if (this.properties.elements) {
            result.properties.elements = this.properties.elements.clone();
        }
        result.properties.shape = this.properties.shape;
        result.OpenCLType = this.OpenCLType;
        result.properties.addressSpace = this.properties.addressSpace;

        return result;
    };
    TOp.updateOpenCLType = function () {
        this.getHandler().updateOpenCLType.call(this);
    };
    TOp.getHandler = function () {
        return this.registry[this.name] || reportBug("No object handler for class `" + this.name + "`");
    };
    TOp.getOpenCLShape = function () {
        return this.getHandler().getOpenCLShape.call(this) || [];
    };
    TOp.getOpenCLSize = function () {
        return this.getHandler().getOpenCLSize.call(this) || reportBug("unknown OpenCL size for object: " + this.name);
    };
    TOp.getOpenCLAddressSpace = function () {
        return this.properties.addressSpace || "";
    }

    //
    // Bottom type for error states
    //
    var TBottom = function () { };
    var TBp = TBottom.prototype = new Type(Type.BOTTOM);
    TBp.equals = function (other) { return false; };

    // 
    // type environment AKA symbol table
    //
    var TEnv = function (env, functionFrame, topLevel) {
        this.parent = env;
        this.bindings = {};
        this.bindings.__proto__ = null;
        this._accu = null;
        if (functionFrame) {
            this._functionResult = null;
        }
        if (topLevel) {
            this._roots = [];
        }
        this.openCLFloatType = env ? env.openCLFloatType : undefined;
    };
    var TEp = TEnv.prototype;
    TEp.lookup = function (name) {
        return (this.bindings[name] !== undefined) ? this.bindings[name] : ((this.parent && this.parent.lookup(name)) || undefined);
    }
    TEp.getType = function (name) {
        var entry = this.lookup(name);
        if (entry) {
            return entry.type;
        } else {
            return undefined;
        }
    };
    TEp.bind = function (name, duplicates) {
        if (name instanceof Array) {
            name.forEach( this.bind);
        } else {
            if (!duplicates && this.bindings[name] !== undefined) {
                reportBug("variable bound twice in single scope");
            } else {
                this.bindings[name] = {initialized : false, type : null};
            }
        }
    }
    TEp.update = function (name, type) {
        var current = this.lookup(name);
        if (current === undefined) {
            reportError("variable " + name + " has not been previously declared!");
        } else if (current.type === null) {
            var newT = type.clone();
            newT.registerFlow(type);
            this.bindings[name] = {initialized : true, type : newT}; // force a new entry in the dataflow graph
        } else if (!current.type.equals(type)) {
            reportError("variable " + name + " is polymorphic: " + current.type.toString() + "/" + type.toString());
        } else {
            // propagate flow information
            current.type.registerFlow(type);
        }
    }
    TEp.intersect = function (other) {
        for (var name in this.bindings) {
            var mType = this.bindings[name];
            var oType = other.bindings[name];
            if (oType === undefined) {
                this.bindings[name].initialized = false;
            } else {
                mType.type.equals(oType.type) || reportError("variable " + name + " is polymorphic: " + mType.type.toString() + "/" + oType.type.toString());
            }
        }
        for (var name in other.bindings) {
            if (this.bindings[name] === undefined) {
                this.bindings[name] = {initialized : false, type : other.bindings[name].type};
            }
        }
    };
    TEp.merge = function (other) {
        for (var name in other.bindings) {
            var oType = other.bindings[name];
            this.bindings[name] = {initialized : oType.initialized, type: oType.type.clone()};
            this.bindings[name].type.registerFlow(oType.type);
        }
    };
    TEp.tagAllUnitialized = function () {
        for (var name in this.bindings) {
            this.bindings[name].initialized = false;
        }
    };

    // this construction eases debugging :-)
    TEp.__defineGetter__("accu", function () {
                return this._accu || null;
            });
    TEp.__defineSetter__("accu", function (val) { 
                this._accu = val; 
            });
    TEp.resetAccu = function () {
        this._accu = null;
    }

    // the function result is bubbled up to the first function frame that contains the
    // current frame; this is required to ensure that results from nested script scopes
    // are attributed to the correct function
    TEp.__defineGetter__("functionResult", function () {
                if (this._functionResult !== undefined) {
                    return this._functionResult;
                } else {
                    return parent.functionResult;
                }
            });
    TEp.__defineSetter__("functionResult", function (val) {
                if (val) {
                    if (this._functionResult === undefined) { // this frame does not belong to a function; bubble up
                        this.parent.functionResult = val;
                    } else {
                        if (this._functionResult === null) {
                            this._functionResult = val.clone();
                            this._functionResult.registerFlow(val);
                        } else {
                            this._functionResult.equals(val) || reportError("function has polymorphic return type");
                            this._functionResult.registerFlow(val);
                        }
                    }
                }
            });
    // roots encode the roots of the flow graph on types. It should only ever be defined for the top-level function
    // scope.
    TEp.addRoot = function (val) {
        if (this._roots) {
            this._roots.push(val);
        } else {
            return this.parent.addRoot(val);
        }
    }
                    


    //
    // Root environment which models the accesible global scope
    //
    var rootEnvironment = new TEnv();
    rootEnvironment.bind("Math");
    rootEnvironment.update("Math", new TObject("Math"));

    // 
    // Handlers for built in classes
    //
    TOp.registry["Math"] = {
        methodCall : function (thisType, name, tEnv, fEnv, ast) {
            var type;
            // grab argument types first
            ast.children[1] = drive(ast.children[1], tEnv, fEnv);
            var argtypes = tEnv.accu;
            tEnv.resetAccu();

            switch (name) {
                case "abs":
                case "acos":
                case "asin":
                case "atan":
                case "ceil":
                case "cos":
                case "exp":
                case "floor":
                case "log":
                case "round":
                case "sin":
                case "sqrt":
                case "tan":
                    // number -> number functions
                    argtypes.length === 1 || reportError("too many arguments for Math." + name, ast);
                    argtypes[0].isArithType() || reportError("argument to Math." + name + " is not a number", ast);
                    type = new TLiteral(TLiteral.NUMBER);
                    break;

                case "atan2":
                case "pow":
                    // number, number -> number functions
                    argtypes.length === 2 || reportError("too many arguments for Math." + name, ast);
                    argtypes[0].isArithType() || reportError("first argument to Math." + name + " is not a number", ast);
                    argtypes[1].isArithType() || reportError("second argument to Math." + name + " is not a number", ast);
                    type = new TLiteral(TLiteral.NUMBER);
                    break;

                case "max":
                case "min":
                    // number, ..., number -> number
                    argtypes.forEach( function (t, idx) { t.isArithType() || reportError("argument " + (idx + 1) + 
                                                                                         " to Math." + name + " is not " +
                                                                                         "a number", ast); });
                    type = new TLiteral(TLiteral.NUMBER);
                    break;

                default:
                    reportError("Method `" + name + "` of global Math object not supported", ast);
            }

            return type;
        },
        propertySelection : function (name, tEnv, fEnv, ast) {
            var type;

            switch (name) {
                case "E":
                case "LN2":
                case "LN10":
                case "LOG2E":
                case "PI":
                case "SQRT1_2":
                case "SQRT2":
                    type = new TLiteral(TLiteral.NUMBER);
                    break;
                    
                default:
                    reportError("unknown property `Math." + name + "`", ast);
            }

            return type;
        },
        constructor : undefined,
        makeType : null,
        updateOpenCLType : null,
        equals : null
    };

    TOp.registry["Array"] = {
        methodCall : function(thisType, name, tEnv, fEnv, ast) {
            switch (name) {
                // mutators
                case "pop":
                case "push":
                case "shift":
                case "unshift":
                case "reverse":
                case "sort":
                case "splice":
                // accessors
                case "concat":
                case "join":
                case "slice":
                    reportError("method `" + name + "` not yet implemented on array objects", ast);
                    break;

                default:
                    reportError("method `" + name + "` not supported on array objects", ast);
            }
        },
        propertySelection : function (name, tEnv, fEnv, ast) {
            var type;

            switch (name) {
                case "length":
                    type = new TLiteral(TLiteral.NUMBER);
                    break;

                default:
                    reportError("unknown array property `" + name + "`", ast);
            }

            return type;
        },
        constructor : undefined,
        constructors : [Array, Float64Array, Float32Array, Uint32Array, Int32Array, 
                        Uint16Array, Int16Array, Uint8ClampedArray, Uint8Array, Int8Array],
        makeType : function (val) {
            var type;
            if (typeof(val) === "number") {
                type = new TLiteral(TLiteral.NUMBER);
            } else if (val instanceof Array) {
                type = new TObject(TObject.ARRAY);
                type.properties.shape = [val.length];
                if (val.length > 0) {
                    type.properties.elements = this.makeType(val[0]);
                    for (var i = 1; i < val.length; i++) {
                        var eType = this.makeType(val[i]);
                        if (!type.properties.elements.equals(eType)) {
                            reportError("inhomogeneous arrays not supported");
                        }
                    }
                } else {
                    reportError("empty arrays are not supported yet");
                }
                type.updateOpenCLType();
            } else if (RiverTrail.Helper.isTypedArray(val)) {
                // This is cheating, as typed arrays do not have the same interface, really.
                // However, we do not support map/reduce etc. anyway.
                type = new TObject(TObject.ARRAY);
                type.properties.shape = [val.length];
                type.properties.elements = new TLiteral(TLiteral.NUMBER);
                type.properties.elements.OpenCLType = RiverTrail.Helper.inferTypedArrayType(val);
                type.updateOpenCLType();
            } else {
                reportError("unsupported array contents encountered");
            }
            return type;
        },
        updateOpenCLType : function () {
            var elemType = this.properties.elements;
            if (elemType instanceof TLiteral) {
                this.OpenCLType = this.properties.elements.OpenCLType + "*";
            } else if (elemType.isObjectType("Array") || elemType.isObjectType("ParallelArray")) {
                this.OpenCLType = elemType.OpenCLType;
            } else {
                reportBug("unhandled element type in Array");
            }
        },
        getOpenCLShape : function () {
            return this.properties.shape.concat(this.properties.elements.getOpenCLShape());
        },
        getOpenCLSize : function () {
            return this.properties.shape.reduce(function (prev, curr) { return prev*curr; }, 1) * this.properties.elements.getOpenCLSize();
        },
        equals : function (other) {
            return (this.properties.shape.length === other.properties.shape.length) &&
                   this.properties.shape.every( function (val, idx) { return val === other.properties.shape[idx]; }) &&
                   (this.properties.elements.equals(other.properties.elements));
        }
    };

    TOp.registry["ParallelArray"] = {
        methodCall : function(thisType, name, tEnv, fEnv, ast) {
            "use strict";
            var type;
            ast.children[1] = drive(ast.children[1], tEnv, fEnv);
            var argTypes = tEnv.accu;
            tEnv.resetAccu();

            switch (name) {
                case "get":
                    var idxLen;
                    if ((argTypes.length == 1) &&
                        ((argTypes[0].isObjectType(TObject.ARRAY)) ||
                         (argTypes[0].isObjectType(TObject.PARALLELARRAY)))) {
                        // ensure valid index
                        argTypes[0].isObjectType(TObject.ARRAY) || reportError("invalid index in get call", ast);
                        argTypes[0].properties.shape.length === 1 || reportError("only vectors and scalars are allowed as indices in get", ast);
                        argTypes[0].properties.shape[0] <= thisType.properties.shape.length || reportError("index vector too long", ast);
                        idxLen = argTypes[0].properties.shape[0];
                    } else {
                        // index scalars
                        // a) ensure all are numbers
                        argTypes.every( function (t) { return t.isArithType(); }) || reportError("indices in call to get " +
                                "on parallel array are not numbers", ast);
                        // b) ensure index is not too long
                        argTypes.length <= thisType.properties.shape.length || reportError("too many indices in get call", ast);
                        // get idx length
                        idxLen = argTypes.length;
                    }
                    if (idxLen === thisType.properties.shape.length) {
                        type = thisType.properties.elements.clone();
                        if (type.isNumberType()) {
                            // regardless of the type representation inside of the array, on read we
                            // always convert to the default number type
                            type._castRequired = new TLiteral(TLiteral.NUMBER);
                        }
                    } else {
                        type = new TObject(TObject.PARALLELARRAY);
                        type.properties.shape = thisType.properties.shape.slice(idxLen);
                        type.properties.elements = thisType.properties.elements.clone();
                        type.updateOpenCLType();
                    }
                    // add flow information for dataflow graph
                    type.registerFlow(thisType);
                    break;

                case "getShape":
                    argTypes.length === 0 || reportError("too many argument to getShape");
                    type = new TObject(TObject.ARRAY);
                    type.properties.shape = [thisType.properties.shape.length];
                    type.properties.elements = new TLiteral(TLiteral.NUMBER);
                    tEnv.addRoot(type);
                    tEnv.accu = type;
                    break;

                case "concat":
                case "join":
                case "slice":
                case "combine":
                case "map":
                case "reduce":
                case "filer":
                case "scatter":
                    reportError("method `" + name + "` not yet implemented for parallel array objects", ast);

                default:
                    reportError("method `" + name + "` not supported for parallel array objects", ast);
            }

            return type;
        },
        propertySelection : function (name, tEnv, fEnv, ast) {
            var type;

            switch (name) {
                case "length":
                    type = new TLiteral(TLiteral.NUMBER);
                    break;

                default:
                    reportError("unknown parallel array property `" + name + "`", ast);
            }

            return type;
        },
        constructor : ParallelArray,
        makeType : function (val) {
            var type = new TObject(TObject.PARALLELARRAY);
            // TODO: reflect shape information etc
            type.properties.shape = val.getShape();
            type.properties.elements = new TLiteral(TLiteral.NUMBER); // ParallelArrays always contain numbers
            type.properties.elements.OpenCLType = inferPAType(val).inferredType; // but they may use a different representation
            type.updateOpenCLType();
            return type;
        },
        updateOpenCLType : function () {
            debug && ((this.properties.elements instanceof TLiteral) || reportBug("ParallelArray with non literal elements!"));
            this.OpenCLType = this.properties.elements.OpenCLType + "*";
        },
        getOpenCLShape : function () {
            return this.properties.shape.concat(this.properties.elements.getOpenCLShape());
        },
        getOpenCLSize : function () {
            return this.properties.shape.reduce(function (prev, curr) { return prev*curr; }, 1) * this.properties.elements.getOpenCLSize();
        },
        equals : function (other) {
            return (this.properties.shape.length === other.properties.shape.length) &&
                   this.properties.shape.every( function (val, idx) { return val === other.properties.shape[idx]; }) &&
                   (this.properties.elements.equals(other.properties.elements));
        }
    };

    //
    // function environment
    //
    var FEnv = function (env) {
        this.parent = env;
        this.bindings = {};
        this.bindings.__proto__ = null;
    };
    var FEp = FEnv.prototype;
    FEp.lookup = function (name) {
        return (this.bindings[name] || (this.parent && this.parent.lookup(name)) || undefined);
    };
    FEp.add = function (f, name) {
        var fname = name || f.name || reportBug("unnamed functions cannot be added to environment");
        if (this.bindings[fname] !== undefined) reportError("functions need to be uniquely defined within a scope", f);
        this.bindings[fname] = f;
    };
    FEp.toFunDecls = function () {
        var result = [];
        var fun;
        for (var name in this.bindings) {
            fun = this.bindings[name];
            if (fun.typeInfo) {
                // this is actually called somewhere, so we keep it
                // normalize the name (global functions might have a different name than what they were bound to!)
                fun.name = name;
                result.push(fun);
            }
        }
        return result;
    };
    //
    // main analysis driver
    //
    function drive(ast, tEnv, fEnv) {
        "use strict";

        var left, right;

        if (ast === null) {
            throw "Oppsie";
        }

        switch (ast.type) {
            case SCRIPT:
                // create a new type environment for local bindings
                tEnv = new TEnv(tEnv);
                // add all local variable declarations to environment to shadow old
                // ones from previous scopes
                ast.varDecls.forEach(function (name) { tEnv.bind(name.value); });
                // add all locally declared functions to the environment
                // strictly speaking they are not variable bindings yet they can shadow variables and be shadowed
                // by variables so we disallow these
                ast.funDecls.forEach(function (f) {
                        f.name || reportBug("unnamed function in funDecls");
                        tEnv.bind(f.name);
                        });
                // add all locally declared functions to the function store. Other than the variable environment, this
                // is about storing their code in case we find a call. Furhtermore, we have to memoize the functions visible
                // from this function. We do this by glueing the function store to the function instance. 
                fEnv = new FEnv(fEnv);
                ast.funDecls.forEach(function (f) {fEnv.add(f); f.fEnv = fEnv});
                ast.children.map(function (ast) { return drive(ast, tEnv, fEnv); });
                tEnv.resetAccu();
                // remember symbol table for later phases
                ast.symbols = tEnv;
                // add all locally used functions to funDecls (including the globals we dragged into the scope)
                ast.funDecls = fEnv.toFunDecls();
                break;
            case BLOCK:
                ast.children.map(function (ast) { return drive(ast, tEnv, fEnv); });
                tEnv.resetAccu();
                break;

            //
            // statements
            //
            case FUNCTION:
                if (ast.functionForm !== Narcissus.parser.DECLARED_FORM) {
                    reportBug("function literals should not be in statement position", ast);
                }
                // this is not an applied occurence but the declaration, so we do not do anything here
                break;
            case RETURN:
                ast.value = drive(ast.value, tEnv, fEnv);
                tEnv.functionResult = tEnv.accu;
                break;
            case FOR:
                ast.setup = drive(ast.setup, tEnv, fEnv);
                // fallthrough;
            case WHILE:
                ast.condition = drive(ast.condition, tEnv, fEnv);
                var innerEnv = new TEnv(tEnv);
                ast.body = drive(ast.body, innerEnv, fEnv);
                if (ast.update) { // FOR loop
                    ast.update = drive(ast.update, innerEnv, fEnv);
                }
                innerEnv.tagAllUnitialized();
                tEnv.merge(innerEnv);
                break;
            case DO:
                ast.body = drive(ast.body, tEnv, fEnv);
                ast.condition = drive(ast.condition, tEnv, fEnv);
                break;
            case IF:
                ast.condition = drive(ast.condition, tEnv, fEnv);
                tEnv.accu.isTruthType() || reportError("illegal predicate in conditional", ast);
                var thenEnv = new TEnv(tEnv);
                ast.thenPart = drive(ast.thenPart, thenEnv, fEnv);
                var elseEnv = new TEnv(tEnv);
                ast.elsePart && (ast.elsePart = drive(ast.elsePart, elseEnv, fEnv));
                thenEnv.intersect(elseEnv);
                tEnv.merge(thenEnv);
                break;
            case SEMICOLON:
                ast.expression = drive(ast.expression, tEnv, fEnv);
                tEnv.resetAccu();
                break;
            case VAR:
            case CONST:
                ast.children.map(function (ast) {
                                     if (ast.initializer) {
                                         ast.initializer = drive(ast.initializer, tEnv, fEnv);
                                             tEnv.update(ast.name, tEnv.accu); 
                                             ast.typeInfo = tEnv.accu;
                                             tEnv.resetAccu();
                                     }
                                     return ast;
                                 });
                break;
            case ASSIGN:
                // children[0] is the left hand side, children[1] is the right hand side.
                // both can be expressions. 
                ast.children[1] = drive(ast.children[1], tEnv, fEnv);
                switch (ast.children[0].type) {
                    case IDENTIFIER:
                        // simple case of a = expr
                        tEnv.update(ast.children[0].value, tEnv.accu);
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
                ast.children.map(function (ast) { return drive(ast, tEnv, fEnv);});
                // we keep the type of the last child
                break;
            case HOOK:
                // the hook (?) is badly designed. The first child is the condition, second child
                // the then expression, third child the else expression
                ast.children[0] = drive(ast.children[0], tEnv, fEnv);
                tEnv.accu.isTruthType() || reportError("illegal predicate in conditional expression", ast);
                ast.children[1] = drive(ast.children[1], tEnv, fEnv);
                left = tEnv.accu;
                ast.children[2] = drive(ast.children[2], tEnv, fEnv);
                left.equals(tEnv.accu) || reportError( "then and else branch in conditional expression have different types", ast);
                // we create a new node in the DFG
                right = tEnv.accu;
                tEnv.accu = left.clone();
                tEnv.accu.registerFlow(right);
                tEnv.accu.registerFlow(left);
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
                ast.children[0] = drive(ast.children[0], tEnv, fEnv);
                tEnv.accu.isArithType() || reportError("first argument not a number", ast);
                ast.children[1] = drive(ast.children[1], tEnv, fEnv);
                tEnv.accu.isArithType() || reportError("second argument not a number", ast);
                // result always is a number
                tEnv.accu = new TLiteral(TLiteral.NUMBER);
                break;

            // binary operators on bool
            case OR:
            case AND:
                ast.children[0] = drive(ast.children[0], tEnv, fEnv);
                // XXX what do we allow as legal argument types to OR and AND? For now, numbers should do.
                tEnv.accu.isArithType() || reportError("first argument not a number", ast);
                ast.children[1] = drive(ast.children[1], tEnv, fEnv);
                // XXX same here
                tEnv.accu.isArithType() || reportError("second argument not a number", ast);
                // result always is a bool
                tEnv.accu = new TLiteral( TLiteral.BOOL);
                break;

            // unary functions on all literals
            case NOT:
            case BITWISE_NOT:
            case UNARY_PLUS:
            case UNARY_MINUS:
                // we do not support strings yet, so this is the same as the case below
                // fallthrough

            // unary functions on numbers (incl bool)
            case INCREMENT:
            case DECREMENT:
                ast.children[0] = drive(ast.children[0], tEnv, fEnv);
                tEnv.accu.isArithType() || reportError("argument not a number", ast);
                if (ast.type === NOT) {
                    // result is bool
                    tEnv.accu = new TLiteral(TLiteral.BOOL);
                } else {
                    // result is a number
                    tEnv.accu = new TLiteral(TLiteral.NUMBER);
                }
                break;

            // literals
            case IDENTIFIER:
            case THIS:
                var idType = tEnv.lookup(ast.value) || reportError("unbound variable: " + ast.value, ast);
                idType.initialized || reportError("variable " + ast.value + " might be uninitialized", ast);
                tEnv.accu = idType.type;
                break;
            case DOT:
                ast.children[0].type === IDENTIFIER || reportError("unsupported lhs in dot selection", ast);
                var obj = tEnv.lookup(ast.children[0].value) || reportError("unknown object `" + ast.children[0].value + "`", ast);
                obj.initialized || reportError("variable " + ast.children[0].value + " might be uninitialized", ast);
                ast.children[0].typeInfo = obj.type;
                obj.isObjectType() || reportError("dot applied to non-object value", ast);
                tEnv.accu = obj.getHandler().propertySelection(ast.children[1].value, tEnv, fEnv, ast);
                break;

            case NUMBER:
                tEnv.accu = new TLiteral(TLiteral.NUMBER);
                break;
            case TRUE:
            case FALSE:
                tEnv.accu = new TLiteral(TLiteral.BOOL);
                break;

            // array operations
            case INDEX:
                ast.children[1] = drive(ast.children[1], tEnv, fEnv);
                tEnv.accu.isArithType() || reportError("index not a number", ast);
                ast.children[0] = drive(ast.children[0], tEnv, fEnv);
                tEnv.accu.isObjectType("Array") || reportError("Index operator applied to non array value", ast);
                left = tEnv.accu.properties.elements.clone();
                left.registerFlow(tEnv.accu);
                tEnv.accu = left;
                break;

            case ARRAY_INIT:
                left = [];
                for (var idx in ast.children) {
                    ast.children[idx] = drive(ast.children[idx], tEnv, fEnv);
                    left.push(tEnv.accu);
                }
                left.reduce(function(a,b) { a.equals(b) || reportError("inhomogeneous element types in array initialiser", ast); return a;});
                tEnv.accu = new TObject("Array");
                tEnv.accu.properties.elements = left[0];
                tEnv.accu.properties.shape = [ast.children.length];
                tEnv.accu.properties.addressSpace = "__private";
                tEnv.accu.updateOpenCLType();
                tEnv.addRoot(tEnv.accu);
                break;

            // function application
            case CALL:
                switch (ast.children[0].type) {
                    case DOT: // method invocation
                        var dot = ast.children[0];
                        // figure out what type this object is
                        dot.children[0] = drive(dot.children[0], tEnv, fEnv);
                        var objType = tEnv.accu;
                        objType.isObjectType() || reportError("left hand side of method call not an object", ast);
                        // hand off inference to object handler
                        tEnv.accu = objType.getHandler().methodCall(objType, dot.children[1].value, tEnv, fEnv, ast);
                        break;
                    case IDENTIFIER: // function call
                        // grab argument types
                        ast.children[1] = drive(ast.children[1], tEnv, fEnv);
                        var argT = tEnv.accu;
                        tEnv.resetAccu();
                        // grab function
                        var fun = fEnv.lookup(ast.children[0].value);
                        if (!fun) {
                           if (allowGlobalFuns) {
                               // so this is not a local function. first make sure it is not a local variable
                               !tEnv.lookup(ast.children[0].value) || reportError("not a function `" + ast.children[0].value + "`", ast);
                               // CHEAT: we would have to inspect the current functions closure here but we cannot. So we just
                               //        take whatever the name is bound to in the current scope. 
                               //        This should at least be the global scope, really...
                               var obj = eval(ast.children[0].value) || reportError("unknown function `" + ast.children[0].value + "`", ast);
                               (typeof(obj) === 'function') || reportError("not a function `" + ast.children[0].value + "`", ast);
                               fun = RiverTrail.Helper.parseFunction(obj.toString());
                               // if we get here, we can just add the function to the function environment for future use
                               fEnv.add(fun, ast.children[0].value);
                           } else {
                               reportError("unknown function `" + ast.children[0].value + "`", ast);
                           }
                        }
                        if (fun.typeInfo) {
                            // this function has been called before. If the types match, we are fine. Otherwise we have
                            // to create a specialised version. The latter is a TODO;
                            if (argT.some(function(t, idx) { return !t.equals(fun.typeInfo.parameters[idx]); })) {
                                reportBug("specialisation required :(", ast);
                            } else {
                                tEnv.accu = fun.typeInfo.result;
                            }
                        } else {
                            // create a new function frame
                            var innerTEnv = new TEnv(tEnv, true);
                            // add parameter / value type mapping
                            fun.params.length === argT.length || reportError("number of parameters and arguments in call does not match", ast);
                            fun.params.forEach(function(arg, idx) { innerTEnv.bind(arg); innerTEnv.update(arg, argT[idx]); });
                            // go derive
                            fun.body = drive(fun.body, innerTEnv, fEnv);
                            fun.typeInfo = new TFunction(argT, innerTEnv.functionResult);
                            debug && console.log(fun.name + " has type " + fun.typeInfo.toString());
                            tEnv.accu = innerTEnv.functionResult;
                        }
                        break;

                    default:
                        reportError("unexpected target for function call", ast);
                }
                break;

            // argument lists
            case LIST:      
                left = [];
                for (var idx in ast.children) {
                    ast.children[idx] = drive(ast.children[idx], tEnv, fEnv);
                    left.push(tEnv.accu);
                }
                tEnv.accu = left;
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

            case DEBUGGER:  // whatever this is...
            default:
                throw "unhandled node type in analysis: " + ast.type;
        }
        ast.typeInfo = tEnv.accu;
        debug && ast.typeInfo && console.log(Narcissus.decompiler.pp(ast) + " has type " + ast.typeInfo.toString());
        if (ast.typeInfo && ast.typeInfo._castRequired) {
            var newAst = new Narcissus.parser.Node(ast.tokenizer);
            newAst.children.push(ast);
            newAst.type = CAST;
            newAst.typeInfo = ast.typeInfo._castRequired;
            delete ast.typeInfo._castRequired;
            ast = newAst;
            tEnv.accu = ast.typeInfo;
        }

        return ast;
    }

    function typeOracle(val) {
            "use strict";
        var type;

        switch (typeof(val)) {
            case "number":
                type = new TLiteral(TLiteral.NUMBER);
                break;
            case "object":
                var name = TObject.deriveObjectType(val) || reportError("unsupported object as argument encountered");
                var type = TObject.makeType(name, val);
                type.properties.addressSpace = "__global";
                break;
            default:
                reportError("unsupported argument kind encountered");
        };
        
        return type;
    }

    function flow(roots, flowInit, flowPass, flowJoin) {
        var workset = roots.map(function (val) { 
                !val._flow || reportBug ("leftover flow information!");
                val._flow = flowInit(val);
                return val;
            });
                   
        while (workset.length > 0) {
            var current = workset.pop();
            var flowInfo = current._flow;
            delete current._flow;
            current.flowTo && current.flowTo.forEach(function (val) {
                var flowIn = (val._flow) ? flowJoin(flowInfo, val._flow) : flowInfo;
                var flowOut = flowPass(val, flowIn);
                if (flowOut) {
                    if (!val._flow) {
                        workset.push(val);
                    }
                    val._flow = flowOut;
                }});
        }
    }

    function analyze(ast, pa, construct, rank, extraArgs, lowPrecision) {
        var tEnv = new TEnv(rootEnvironment, true, true); // create a new top-level function frame
        var params = ast.params;
        var argT = [];
        // set default precision for numbers
        openCLUseLowPrecision = (lowPrecision === true);
        tEnv.openCLFloatType = (openCLUseLowPrecision ? "float" : "double");
        // create type info for this
        if ((construct === "combine") || (construct === "map")) {
            var thisT = TObject.makeType("ParallelArray", pa);
            thisT.properties.addressSpace = "__global";
            tEnv.bind("this");
            tEnv.update("this", thisT);
            tEnv.addRoot(thisT);
            argT.push(thisT);
        } else if (construct === "map") {
            var thisT;
            thisT = TObject.makeType("ParallelArray", pa);
            if (pa.getShape().length > rank) {
                thisT.properties.addressSpace = "__global";
                thisT.properties.shape.splice(0,rank);
            } else {
                thisT = thisT.properties.elements;
            }
            tEnv.bind("this");
            tEnv.update("this", thisT);
            if (thisT.isObjectType()) {
                tEnv.addRoot(thisT);
            }
            argT.push(thisT);
        }

        // create type information for generated arguments
        if ((construct === "combine") || (construct === "comprehension")) {
            // create type info for vector index argument
            var ivType = new TObject(TObject.ARRAY);
            ivType.properties.shape = [rank];
            ivType.properties.elements = new TLiteral(TLiteral.NUMBER);
            ivType.properties.elements.OpenCLType = "int";
            ivType.updateOpenCLType();
            ivType.properties.addressSpace = "__private";
            tEnv.bind(params[0]);
            tEnv.update(params[0], ivType);
            tEnv.addRoot(ivType);
            params = params.slice(1);
            argT.push(ivType);
        } else if (construct === "comprehensionScalar") {
            // create type info for scalar index argument
            var ivType = new TLiteral(TLiteral.NUMBER);
            tEnv.bind(params[0]);
            tEnv.update(params[0], ivType);
            params = params.slice(1);
            argT.push(ivType);
        } else if (construct === "map") {
            // create type info for current element argument
            var elemT = tEnv.getType("this").clone();
            if (pa.getShape().length > rank) {
                elemT.properties.shape.splice(0,rank);
            } else {
                elemT = elemT.properties.elements;
            }
            tEnv.bind(params[0]);
            tEnv.update(params[0], elemT);
            (!elemT.isObjectType()) || tEnv.addRoot(elemT);
            params = params.slice(1);
            argT.push(elemT);
        }

        // create type info for all arguments
        params.forEach(function (name) { tEnv.bind(name); });
        params.forEach(function (name, idx) { var type = typeOracle(extraArgs[idx]); 
                                              tEnv.update(name, type); 
                                              type.isObjectType() && tEnv.addRoot(type);
                                              argT.push(type);});

        var fEnv = new FEnv();

        ast.body = drive(ast.body, tEnv, fEnv);

        var type = new TFunction(argT, tEnv.functionResult);
        ast.typeInfo = type;

        // propagate address space qualifiers
        flow(tEnv._roots, 
             function (val) {
                 return val.properties.addressSpace;
             },
             function (val, addressspace) {
                 if (val.isObjectType()) { // address space qualifiers are only 
                                           // a property of object types (as they 
                                           // are pointers in OpenCL)
                    if (!val.properties.addressSpace) {
                        val.properties.addressSpace = addressspace;
                        debug && console.log("propagated address space " + addressspace);
                        return addressspace;
                    } else if (val.properties.addressSpace !== addressspace) {
                        val.properties.addressSpace = "__private";
                        debug && console.log("privatized address space due to conflict");
                        return "__private";
                    } 
                }
             },
             function (a,b) {
                 if (a===b) {
                     return a;
                 } else {
                     return "__private";
                 }
             });
                    
        debug && console.log("Overall function has type (first arg. is this) " + type.toString());
        debug && console.log(RiverTrail.dotviz.plotTypes(tEnv._roots));

        return ast;
    }

    return {
        "analyze" : analyze,
        "Type" : Type,
        "TLiteral" : TLiteral,
        "TObject" : TObject,
        "TFunction" : TFunction,
        "typeOracle" : typeOracle
    };
}();
