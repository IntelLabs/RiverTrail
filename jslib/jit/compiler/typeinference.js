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


var globalInlineObjectTypes = [];
RiverTrail.Typeinference = function () {
    var stackTrace = [];

    var definitions = Narcissus.definitions;
    eval(definitions.consts);
    eval(RiverTrail.definitions.consts);

    var inferPAType = RiverTrail.Helper.inferPAType;
    var nameGen = RiverTrail.Helper.nameGen;
    
    const debug = false;
    //const allowGlobalFuns = false; // Set to true so kernel functions can call global functions.
    const allowGlobalFuns = true; // Set to true so kernel functions can call global functions.
    const lazyJSArrayCheck = true; // check for homogeneity of JS Arrays at runtime

    var openCLUseLowPrecision = false;

    //
    // error reporting
    //
    function reportError(msg, ast) {
        msg = stackTrace.reduce(function (p, c) {
                        return p + " -> " + c.fun.name + " [call was: " + RiverTrail.Helper.wrappedPP(c.ast) + "]";
                    }, "In main") + ": " + msg;

        RiverTrail.Helper.reportError(msg, ast);
    }
    var reportBug = RiverTrail.Helper.reportBug;

    // 
    // tree copying
    //
    var cloneFunctionNoTypes = RiverTrail.Helper.cloneFunction(true);
    var cloneFunction = RiverTrail.Helper.cloneFunction(false);

    //
    // unique label generator
    //
    var labelGen = function () {
        var cnt = 0;

        return function () { return cnt++; };
    }();

    //
    //
    // Base prototype shared by all type structures
    //
    var Type = function (kind) {
        this.kind = kind;
        this.label = labelGen();
    };
    Type.OBJECT = "OBJECT";
    Type.LITERAL = "LITERAL";
    Type.FUNCTION = "FUNCTION";
    Type.BOTTOM = "BOTTOM";

    var Tp = Type.prototype;
    Tp.toString = function () { return "<general type>"; };
    Tp.equals = function(other, considerStorageFormat) {
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
    Tp.isArrayishType = function () { // checks whether the type is an array like type
        return this.isObjectType(TObject.ARRAY) || this.isObjectType(TObject.JSARRAY) || this.isObjectType(TObject.PARALLELARRAY);
    };
    Tp.isBottomType = function () {
        return (this.kind === Type.BOTTOM);
    };
    Tp.registerFlow = function (from) {
        (from.flowTo || (from.flowTo = [])).push(this);
    };
    Tp.registerParamFlow = function (param) {
        (this.flowTo || (this.flowTo = [])).push(param);
    };
    Tp.getOpenCLShape = function () {
        return []; // everything is a scalar unless defined otherwise
    };
    Tp.getOpenCLSize = function () {
        reportBug("size of type not known:" + this.kind);
    };
    Tp.getOpenCLAddressSpace = function () {
        return "";
    };
    Tp.hasAddressSpace = function () {
        return (this.getAddressSpace() !== undefined);
    };
    Tp.getAddressSpace = function () {
        return undefined;
    };
    Tp.setAddressSpace = function (val) {
        return;
    };

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
        this.label = labelGen();
    };
    TLiteral.NUMBER = "NUMBER";
    TLiteral.STRING = "STRING";
    TLiteral.BOOL = "BOOL";

    var TLp = TLiteral.prototype = new Type(Type.LITERAL);
    TLp.toString = function () { return "Literal: " + this.type + "<" + this.OpenCLType + ">"};
    TLp.equals = function (other, considerStorageFormat) {
        return (this.constructor.prototype.equals.call(this, other, considerStorageFormat) &&
                (this.type === other.type) &&
                (!considerStorageFormat || (this.OpenCLType === other.OpenCLType)));
    };
    TLp.clone = function (lut) {
        var result;
        if (lut && (result = lut[this.label])) {
           return result;
        }
        result = new TLiteral(this.type);
        result.OpenCLType = this.OpenCLType;

        lut && (lut[this.label] = result);
        return result;
    };
    TLp.getOpenCLSize = function getOpenCLSize() {
        switch (this.OpenCLType) {
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
        this.label = labelGen();
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
    TFp.equals = function (other, argsOnly, considerStorageFormat) {
        return (this.constructor.prototype.equals.call(this, other, considerStorageFormat) &&
                (argsOnly || this.result.equals(other.result, considerStorageFormat)) &&
                (this.parameters.length === other.parameters.length) &&
                this.parameters.every( function (oneP, index) { return oneP.equals(other.parameters[index], considerStorageFormat);}));
    };
    TFp.clone = function (lut) {
        var result;
        if (lut && (result = lut[this.label])) {
            return result;
        }
        result = new TFunction(this.parameters, this.result);
        lut && (lut[this.label] = result);

        result.parameters = result.parameters.map(function (v) { return v.clone(lut); });
        result.result = result.result.clone(lut);

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
        this.label = labelGen();
    };
    TObject.ARRAY = "Array";
    TObject.JSARRAY = "JSArray";
    TObject.PARALLELARRAY = "ParallelArray";
    TObject.INLINEOBJECT = "InlineObject";
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
    TOp.equals = function (other, considerStorageFormat) {
        return (this.constructor.prototype.equals.call(this, other, considerStorageFormat) &&
                (this.name === other.name) &&
                (this.registry[this.name].equals.call(this, other, considerStorageFormat)));
    };
    TOp.clone = function (lut) {
        var result;
        if (lut && (result = lut[this.label])) {
            return result;
        }
        result = new TObject(this.name);

        lut && (lut[this.label] = result);

        if(this.properties.fields) {
            result.properties.fields = {};
            for(var i in this.properties.fields) {
                result.properties.fields[i] = this.properties.fields[i].clone(lut);
            }
        }
        else if (this.properties.elements) {
                result.properties.elements = this.properties.elements.clone(lut);
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
    TOp.getAddressSpace = function () {
        return this.properties.addressSpace;
    };
    TOp.setAddressSpace = function (val) {
        if (this.registry[this.name].setAddressSpace) {
            return this.registry[this.name].setAddressSpace.call(this, val);
        } else {
            this.properties.adressSpace = val;
        }
    }

    //
    // Bottom type for error states
    //
    var TBottom = function () { 
        this.label = labelGen();
    };
    var TBp = TBottom.prototype = new Type(Type.BOTTOM);
    TBp.equals = function (other, considerStorageFormat) { return false; };

    // 
    // type environment AKA symbol table
    //
    var TEnv = function (env, functionFrame) {
        this.parent = env;
        this.bindings = {};
        this.bindings.__proto__ = null;
        this._accu = null;
        if (functionFrame) {
            this._functionResult = null;
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
                debug && console.log("variable bound twice in single scope: " + name);
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
            // mark type as initialized
            current.initialized = true;
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
                mType.type.registerFlow(oType.type);
            }
        }
        for (var name in other.bindings) {
            if (this.bindings[name] === undefined) {
                this.bindings[name] = {initialized : false, type : other.bindings[name].type};
                this.bindings[name].type.registerFlow(other.bindings[name].type);
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
    TEp.toString = function () {
        var s = "";
        for (var name in this.bindings) {
            s = s + ((s === "") ? "" : ", ") + name + " => " + this.bindings[name].type.toString();
        }
        return "{{" + s + "}}";
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
    };
    TEp.getRoots = function () {
        if (this._roots) {
            return this._roots;
        } else {
            return this.parent.getRoots();
        }
    };

    TEp.emitDeclarations = function (renamer) {
        var s = "";
        for (var name in this.bindings) {
            var type = this.bindings[name].type;
            // only declare variables that are actually used (and thus have a type) 
            if (type) {
                s = s + " " + type.getOpenCLAddressSpace() + " " + type.OpenCLType + " " + (renamer ? renamer(name) : name) + "; ";
            } 
        }
        return s;
    };

                    


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
                    argtypes[0].isArithType() || reportError("argument to Math." + name + " is not a number (found " + argTypes[0].toString() + ")", ast);
                    type = new TLiteral(TLiteral.NUMBER);
                    break;

                case "atan2":
                case "pow":
                    // number, number -> number functions
                    argtypes.length === 2 || reportError("too many arguments for Math." + name, ast);
                    argtypes[0].isArithType() || reportError("first argument to Math." + name + " is not a number (found " + argTypes[0].toString() + ")", ast);
                    argtypes[1].isArithType() || reportError("second argument to Math." + name + " is not a number (found " + argTypes[1].toString() + ")", ast);
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

				case "random":
					argtypes.length === 0 || reportError("too many arguments for Math." + name, ast);
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

    TOp.registry["InlineObject"] = {
        methodCall : function(thisType, name, tEnv, fEnv, ast) {
            reportError("Methods not supported on Objects");
        },
        propertySelection : function (name, tEnv, fEnv, ast) {
            var type = null;
            var fields = ast.children[0].typeInfo.properties.fields;
            for(var idx in fields) {
                if(name === idx) {
                    return fields[idx];
                }
            }
            reportError("Could not find property", name, "in Object");
        },
        makeType : function(val) {
            var type = new TObject(TObject.INLINEOBJECT);
            type.updateOpenCLType();
            return type;
        },
        getOpenCLSize : function () {
        },
        updateOpenCLType : function () {
        },
        setAddressSpace : function (val) {
            this.properties.addressSpace = val;
            //this.properties.elements.setAddressSpace(val);
        },
        constructor : undefined,
        equals : function (other, considerStorageFormat) {
            if(other.kind !== "OBJECT" || other.name !== "InlineObject")
                return false;
            var fields = this.properties.fields;
            var other_fields = other.properties.fields;
            if(other_fields === undefined)  return false;
            // other_fields should have exactly the properties which
            // are also in fields, no more, no less. Order doesn't matter since
            // we don't allow "f2 = &(a.f1)+sizeof(f1)" type property addressing.
            if(other_fields.length !== fields.length) return false;
            for(var idx in fields) {
                //if(!fields.hasOwnProperty(idx))
                //    return false;
                if(!other_fields.hasOwnProperty(idx))
                    return false;
                if(!fields[idx].equals(other_fields[idx], considerStorageFormat))
                    return false;
                /*
                if(fields[idx] === other_fields[idx])
                    continue;
                if(fields[idx].OpenCLType !== other_fields[idx].OpenCLType)
                    return false;
                // The following only compares the outer shape!
                // Fix this to compare the entire shape array
                if(fields[idx].properties.shape !== other_fields[idx].properties.shape)
                    return false;
                */
            }
            return true;
        }
    };

    TOp.registry[TObject.ARRAY] = {
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
        constructors : [Float64Array, Float32Array, Uint32Array, Int32Array, 
                        Uint16Array, Int16Array, Uint8ClampedArray, Uint8Array, Int8Array,
                        RiverTrail.Helper.FlatArray],
        makeType : function (val) {
            var type;
            if (typeof(val) === "number") {
                type = new TLiteral(TLiteral.NUMBER);
            } else if (val instanceof RiverTrail.Helper.FlatArray) {
                type = new TLiteral(TLiteral.NUMBER);
                type.OpenCLType = RiverTrail.Helper.inferTypedArrayType(val.data);
                for (var i = val.shape.length-1; i >= 0; i--) {
                    var ntype = new TObject(TObject.ARRAY);
                    ntype.properties.shape = [val.shape[i]];
                    ntype.properties.elements = type;
                    type = ntype;
                    type.updateOpenCLType();
                }
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
            } else if( (elemType.properties.addressSpace === "__private") && (elemType.isObjectType(TObject.ARRAY) || elemType.isObjectType(TObject.PARALLELARRAY))) {
                // JS : Generate right type for nested local arrays (JS Arrays and ParallelArrays)
                this.OpenCLType = elemType.OpenCLType + "*";
            } else if (elemType.isObjectType(TObject.ARRAY) || elemType.isObjectType(TObject.PARALLELARRAY)) {
                // TODO: Global arrays of element type T should have type T* here
                //
                this.OpenCLType = elemType.OpenCLType;
            } else if (elemType.isObjectType("InlineObject")) {
                this.OpenCLType = elemType.OpenCLType + "*";
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
        equals : function (other, considerStorageFormat) {
            return (this.properties.shape.length === other.properties.shape.length) &&
                   this.properties.shape.every( function (val, idx) { return val === other.properties.shape[idx]; }) &&
                   (this.properties.elements.equals(other.properties.elements, considerStorageFormat));
        },
        setAddressSpace : function (val) {
            this.properties.addressSpace = val;
            this.properties.elements.setAddressSpace(val);
        }
    };

    TOp.registry[TObject.JSARRAY] = {
        methodCall : TOp.registry[TObject.ARRAY].methodCall,
        propertySelection : TOp.registry[TObject.ARRAY].propertySelection,
        constructor : Array,
        makeType : function (val) {
            var type;
            if (typeof(val) === "number") {
                type = new TLiteral(TLiteral.NUMBER);
                type.OpenCLType = "double";
            } else if (val instanceof Array) {
                type = new TObject(TObject.JSARRAY);
                type.properties.shape = [val.length];
                if (val.length > 0) {
                    type.properties.elements = this.makeType(val[0]);
                    if (!lazyJSArrayCheck) {
                        for (var i = 1; i < val.length; i++) {
                            var eType = this.makeType(val[i]);
                            if (!type.properties.elements.equals(eType)) {
                                reportError("inhomogeneous arrays not supported");
                            }
                        }
                    }
                } else {
                    reportError("empty arrays are not supported yet");
                }
                type.updateOpenCLType();
            } else {
                reportError("unsupported array contents encountered");
            }
            return type;
        },
        updateOpenCLType : function () {
            /* this type is hardwired */
            this.OpenCLType = "/* jsval */ double*";
        },
        getOpenCLShape : TOp.registry[TObject.ARRAY].getOpenCLShape,
        getOpenCLSize : TOp.registry[TObject.ARRAY].getOpenCLSize,
        equals : TOp.registry[TObject.ARRAY].equals,
        setAddressSpace : TOp.registry[TObject.ARRAY].setAddressSpace
    };

    TOp.registry[TObject.PARALLELARRAY] = {
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
                        type.properties.addressSpace = thisType.properties.addressSpace;
                        type.properties.elements = thisType.properties.elements.clone();
                        type.updateOpenCLType();
                    }
                    // add flow information for dataflow graph
                    type.registerFlow(thisType);
                    // tell the allocator that this result will share the memory of the source
                    if (!type.isScalarType()) {
                        type.properties.isShared = true;
                    }
                    break;

                case "getShape":
                    argTypes.length === 0 || reportError("too many argument to getShape");
                    type = new TObject(TObject.ARRAY);
                    type.properties.shape = [thisType.properties.shape.length];
                    type.properties.elements = new TLiteral(TLiteral.NUMBER);
                    type.properties.addressSpace = "__private"
                    type.updateOpenCLType();
                    tEnv.addRoot(type);
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
        equals : function (other, considerStorageFormat) {
            return (this.properties.shape.length === other.properties.shape.length) &&
                   this.properties.shape.every( function (val, idx) { return val === other.properties.shape[idx]; }) &&
                   (this.properties.elements.equals(other.properties.elements, considerStorageFormat));
        },
        setAddressSpace : function (val) {
            this.properties.addressSpace = val;
            this.properties.elements.setAddressSpace(val);
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
    FEp.add = function (f, name, global) {
        if (global && this.parent) {
            this.parent.add(f, name, global);
        } else {
            var fname = name || f.name || reportBug("unnamed functions cannot be added to environment");
            if (this.bindings[fname] !== undefined) reportError("functions need to be uniquely defined within a scope", f);
            this.bindings[fname] = f;
        }
    };
    FEp.toFunDecls = function () {
        var result = [];
        var fun;
        for (var name in this.bindings) {
            fun = this.bindings[name];
            if (fun.specStore) {
                // this is actually called somewhere, so we keep it and all its specialisations
                fun.specStore.forEach(function (f) { result.push(f); });
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

        if ((ast === null) || (ast === undefined)) {
            reportBug("malformed syntax tree", ast);
        }

        switch (ast.type) {
            case CAST:
            case TOINT32:
                // These can only be encountered during a function specialisation. As we recompute
                // them, we can safely scrap those here.
                ast = ast.children[0];
                // fallthrough!
                
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
                // is about storing their code in case we find a call. 
                fEnv = new FEnv(fEnv);
                ast.funDecls.forEach(function (f) {fEnv.add(f);});
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
                ast.value || reportError("functions need to return a value", ast);
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
                if (ast.expression) {
                    ast.expression = drive(ast.expression, tEnv, fEnv);
                }
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
                left = ast.children[0];
                switch (ast.children[0].type) {
                    case IDENTIFIER:
                        // simple case of a = expr
                        tEnv.update(left.value, tEnv.accu);
                        left = drive(left, tEnv, fEnv);
                        break;
                    case INDEX:
                        // array update <expr>[iv] = expr
                        // 1) infer types for lhs
                        left = drive(left, tEnv, fEnv);
                        // 2) figure out what <expr> is. Has to yield an Array object of some sort.
                        left.children[0].typeInfo.isObjectType(TObject.ARRAY) || reportError("illegal object in lhs selection; type seen was " 
                                                                                       + left.children[0].typeInfo, ast);
                        // 3) ensure the update is monomorphic
                        left.typeInfo.equals(ast.children[1].typeInfo) || reportError("mutation of array invalidates types: " 
                                                                                      + left.typeInfo + " updated with " 
                                                                                      + ast.children[1].typeInfo, ast);
                        // 4) the result of the assignment is the rhs...
                        tEnv.accu = ast.children[0].typeInfo.clone();
                        break;
                    case DOT:
                        // Property update on an InlineObject
                        // We have a.b = <expr>
                        // 1) Infer type for lhs's child 0 - should be an inline object
                        // 2) Check if the field (lhs's child 1) is valid
                        // 3) Check if the update is monomorphic
                        left = drive(left, tEnv, fEnv);
                        if(!left.children[0].typeInfo.isObjectType("InlineObject") || 
                                !left.children[0].typeInfo.properties.fields.hasOwnProperty(left.children[1].value))
                            reportError("Invalid field " + left.children[1].value + " referenced on object " + left.children[0].value);
                        tEnv.accu = ast.children[0].typeInfo.clone();
                        break;
                    case ARRAY_INIT:
                        // Destructuring assignment
                        // [a,b,c] = <expr>
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
                tEnv.accu.isArithType() || reportError("first argument not a number (found " + tEnv.accu.toString() + ")", ast);
                ast.children[1] = drive(ast.children[1], tEnv, fEnv);
                tEnv.accu.isArithType() || reportError("second argument not a number (found " + tEnv.accu.toString() + ")", ast);
                // result always is a number
                tEnv.accu = new TLiteral(TLiteral.NUMBER);
                break;

            // binary operators on bool
            case OR:
            case AND:
                ast.children[0] = drive(ast.children[0], tEnv, fEnv);
                // XXX what do we allow as legal argument types to OR and AND? For now, numbers should do.
                tEnv.accu.isArithType() || reportError("first argument not a number (found " + tEnv.accu.toString() + ")", ast);
                ast.children[1] = drive(ast.children[1], tEnv, fEnv);
                // XXX same here
                tEnv.accu.isArithType() || reportError("second argument not a number (found " + tEnv.accu.toString() + ")", ast);
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
                tEnv.accu.isArithType() || reportError("argument not a number (found " + tEnv.accu.toString() + ")", ast);
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
                tEnv.accu = idType.type.clone();
                tEnv.accu.registerFlow(idType.type);
                break;
            case DOT:
                ast.children[0] = drive(ast.children[0], tEnv, fEnv);
                var obj = tEnv.accu;
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
                tEnv.accu.isArithType() || reportError("index not a number (found " + tEnv.accu.toString() + ")", ast);
                ast.children[0] = drive(ast.children[0], tEnv, fEnv);
                if (tEnv.accu.isObjectType(TObject.ARRAY) || tEnv.accu.isObjectType(TObject.JSARRAY)) {
                    left = tEnv.accu.properties.elements.clone();
                    left.registerFlow(tEnv.accu);
                    tEnv.accu = left;
                } else if (tEnv.accu.isObjectType(TObject.PARALLELARRAY)) {
                    if (tEnv.accu.properties.shape.length === 1) {
                        // result is a scalar
                        left = tEnv.accu.properties.elements.clone();
                        left.registerFlow(tEnv.accu);
                    } else {
                        // result is a ParallelArray again
                        left = new TObject(TObject.PARALLELARRAY);
                        left.properties.shape = tEnv.accu.properties.shape.slice(1);
                        left.properties.addressSpace = tEnv.accu.properties.addressSpace;
                        left.properties.elements = tEnv.accu.properties.elements.clone();
                        left.updateOpenCLType();
                        left.registerFlow(tEnv.accu);
                    }
                    tEnv.accu = left;
                } else {
                    reportError("Index operator applied to non array value. Type found: " + tEnv.accu.toString(), ast);
                }
                break;

            case ARRAY_INIT:
                left = [];
                for (var idx in ast.children) {
                    ast.children[idx] = drive(ast.children[idx], tEnv, fEnv);
                    left.push(tEnv.accu);
                }
                (left.length > 0) || reportError("empty arrays are not supported", ast);
                left.reduce(function(a,b) { a.equals(b) || reportError("inhomogeneous element types in array initialiser", ast); return a;});
                tEnv.accu = new TObject(TObject.ARRAY);
                tEnv.accu.properties.elements = left[0].clone();
                tEnv.accu.properties.shape = [ast.children.length];
                tEnv.accu.updateOpenCLType();
                tEnv.addRoot(tEnv.accu);
                // Store flow information for local array. If the elements are scalars, there is no flow information, so this is save.
                // If the elements are arrays themselves, their address space will flow to the local array. As local arrays essentially are
                // arrays of pointers to the elements, they can point to the global address space, although they are local. Also, the n:1
                // flow will automatically demote mixed arrays to the private address space.
                // left.forEach(function (v) { tEnv.accu.registerFlow(v); });
                // this needs a more sophisticated type representation, so we leave it at local for now.
                tEnv.accu.setAddressSpace("__private");
                break;

            // function application
            case CALL:
                switch (ast.children[0].type) {
                    case DOT: // method invocation
                        if(ast.children[0].children[0].value === "RiverTrailUtils") {
                            RiverTrailUtils_Trap(ast, tEnv, fEnv);
                            break;
                        }
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
                        var fname = ast.children[0].value;
                        var fun = fEnv.lookup(fname);
                        if (!fun) {
                           if (allowGlobalFuns) {
                               // so this is not a local function. first make sure it is not a local variable
                               !tEnv.lookup(fname) || reportError("not a function `" + fname + "`", ast);
                               // CHEAT: we would have to inspect the current functions closure here but we cannot. So we just
                               //        take whatever the name is bound to in the current scope. 
                               //        This should at least be the global scope, really...
                               var obj = eval(fname) || reportError("unknown function `" + fname + "`", ast);
                               (typeof(obj) === 'function') || reportError("not a function `" + fname + "`", ast);
                               fun = RiverTrail.Helper.parseFunction(obj.toString());
                               // if we get here, we can just add the function to the function environment for future use
                               fEnv.add(fun, ast.children[0].value, true);
                           } else {
                               reportError("unknown function `" + fname + "`", ast);
                           }
                        }
                        var resType = undefined;
                        var rootFun = fun;
                        if (fun.typeInfo) {
                            // this function has been called before. Try and find the correct specialisation
                            var found;
                            for (var cnt = 0; cnt < fun.specStore.length; cnt++) {
                                if (argT.every(function(t, idx) { return t.equals(fun.specStore[cnt].typeInfo.parameters[idx], true);})) {
                                    found = fun.specStore[cnt];
                                    break;
                                }
                            }
                            if (true && found) {
                                resType = found.typeInfo.result;
                                fun = found;
                            } else {
                                // specialize
                                fun = cloneFunctionNoTypes(fun);
                            }
                        } 
                        
                        if (!resType) {
                            // Ensure that the function has a unique, valid name to simplify
                            // the treatment downstream
                            fun.dispatch = nameGen(fun.name);
                            // create a new function frame
                            var innerTEnv = new TEnv(tEnv, true);
                            // put this call on the stack for tracing
                            stackTrace.push({ast: ast, fun: fun});
                            // add parameter / value type mapping
                            fun.params.length === argT.length || reportError("number of parameters and arguments in call does not match", ast);
                            // we clone the argument types here to ensure that later type
                            // upgrades do not propagate to function signatures!
                            fun.params.forEach(function(arg, idx) { innerTEnv.bind(arg); innerTEnv.update(arg, argT[idx].clone()); });
                            // go derive
                            fun.body = drive(fun.body, innerTEnv, fEnv);
                            // initialize specialisation store
                            if (rootFun.specStore === undefined) {
                                rootFun.specStore = [];
                            }
                            rootFun.specStore.push(fun);
                            resType = innerTEnv.functionResult;
                            // drop call from tracing stack
                            stackTrace.pop();
                            // create a new flow frame around this function
                            var innerArgT = fun.params.map(function (v) { return innerTEnv.lookup(v).type; });
                            innerArgT.forEach(function (v) { innerTEnv.addRoot(v); });
                            fun.flowFrame = new FFunction(innerArgT, resType, fun);
                            fun.typeInfo = new TFunction(innerArgT, resType);
                            fun.flowRoots = innerTEnv.getRoots();
                            fun.symbols = innerTEnv;
                            debug && console.log(fun.name + " has type " + fun.typeInfo.toString());
                        }
                        // tie the arguments to the function call
                        ast.callFrame = new FCall(argT, fun.flowFrame, resType.clone(), ast);
                        argT.forEach(function(arg, idx) {arg.registerParamFlow(new FParam(idx, ast.callFrame))});
                        // remember how often this instance is used
                        fun.flowFrame.uses++;
                        // store the name of the instance
                        ast.children[0].dispatch = fun.dispatch;
                        tEnv.accu = ast.callFrame.result;
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
                    var inner = tEnv.accu.clone();
                    inner.registerFlow(tEnv.accu);
                    left.push(inner);
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
                reportError("break not yet implemented", ast);
				break;
            case CONTINUE:
                reportError("continue not yet implemented", ast);
				break;
            case LABEL:
                reportError("break/continure2/labels not yet implemented", ast);
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
                if ((ast.children[0].type === IDENTIFIER) &&
                    (ast.children[0].value === "ParallelArray") &&
                    (ast.children[1].type === LIST) &&
                    (ast.children[1].children.length === 1)) { 
                    // special case of new ParallelArray(<expr>)
                    //
                    // this turns into the identity modulo type
                    ast.children[1].children[0] = drive(ast.children[1].children[0], tEnv, fEnv);
                    right = tEnv.accu.clone();
                    if (right.isObjectType(TObject.ARRAY)) {
                        // Change the type. We have to construct the resulting type
                        // by hand here, as usually parallel arrays objects do not
                        // fall from the sky but are passed in or derived from
                        // selections. As this is potentially a nested array,
                        // we have to flatten the type here.
                        right.name = TObject.PARALLELARRAY;
                        right.properties.shape = right.getOpenCLShape();
                        right.properties.elements = function getLast(type) { return type.isScalarType() ? type : getLast(type.properties.elements);}(right);
                        ast.type = FLATTEN;
                        ast.children[0] = ast.children[1].children[0];
                        delete ast.children[1];
                    } else if (right.isObjectType(TObject.PARALLELARRAY)) {
                        // simply get rid of the new
                        ast = ast.children[1].children[0];
                    } else {
                        reportError("Only the simple form of ParallelArray's constructor is implemented", ast);
                    }
                    tEnv.accu = right;
                    break;
                }
                reportError("general object construction not yet implemented", ast);
            case OBJECT_INIT:
                var property_names = [];
                var property_typeInfo = [];
                var fields = {};
                for(var idx in ast.children) {
                    var prop = drive(ast.children[idx], tEnv, fEnv);
                    if(prop.type === PROPERTY_INIT) {
                        property_names.push(prop.typeInfo.name);
                        property_typeInfo.push(prop.typeInfo.tInfo);
                        fields[prop.typeInfo.name] = prop.typeInfo.tInfo;
                    }
                    else {
                        reportError("Unknown element in Object initializer", ast);
                    }
                }
                // Check if we have an equivalent type already. This avoids
                // generating a new type and specializing functions that take
                // this type as a parameter.
                var obj_typeinfo = null; var found = false;
                for(var i = 0; i < globalInlineObjectTypes.length; i++) {
                    var ofields = globalInlineObjectTypes[i].properties.fields;
                    for(var idx in fields) {
                        if(ofields.hasOwnProperty(idx) && ofields[idx].equals(fields[idx])) {
                            obj_typeinfo = globalInlineObjectTypes[i];
                            break;
                        }
                    }
                }
                if(obj_typeinfo === null) {
                    obj_typeinfo = new TObject("InlineObject");
                    obj_typeinfo.properties.fields = fields;
                    // We will defer generating the OpenCLType to actual code
                    // generation
                    obj_typeinfo.baseType = "InlineObj_struct" + labelGen();
                    obj_typeinfo.OpenCLType =  obj_typeinfo.baseType + "*";
                    globalInlineObjectTypes.push(obj_typeinfo);
                }
                tEnv.accu = obj_typeinfo;
                tEnv.accu.setAddressSpace("__private");
                break;
            case PROPERTY_INIT:
                var right = drive(ast.children[1], tEnv, fEnv);
                tEnv.accu = {name:ast.children[0].value, tInfo:ast.children[1].typeInfo};
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

            case DEBUGGER:  // whatever this is...
            default:
                throw "unhandled node type in analysis: " + ast.type + " is " + RiverTrail.Helper.wrappedPP(ast);
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

    // Handle RiverTrailUtils...() calls
    function RiverTrailUtils_Trap(ast, tEnv, fEnv) {
        if(! (ast.children[1].type === LIST) ||
                !(ast.children[1].children.length === 2) ) {
            reportError("Invalid method signature on RiverTrailUtils", ast);
        }
        switch(ast.children[0].children[1].value) {
            case "createArray":
                var elementTypeInfo = drive(ast.children[1].children[1], tEnv, fEnv);
                if(elementTypeInfo.typeInfo.kind === "LITERAL" &&
                        elementTypeInfo.typeInfo.type === "NUMBER") {
                    ast.initializer = ast.children[1].children[1].value;
                }
                else {
                    reportError("Invalid value initializer", ast);
                }
                var objshape = [];
                // Infer shape description
                ast.children[1].children[0] = drive(ast.children[1].children[0], tEnv, fEnv);
                var shapes = ast.children[1].children[0].children;
                var shapes_length = shapes.length;
                for(var idx = 0; idx < shapes_length; idx++) {
                    if(shapes[idx].typeInfo.kind !== "LITERAL" ||
                            shapes[idx].typeInfo.type !== "NUMBER" ||
                            shapes[idx].type !== 61) {
                        reportError("Shape description must consist of literals only, e.g: [3, 4, 2]", ast);
                    }
                    objshape.push(shapes[idx].value);
                }
                tEnv.accu = new TObject(TObject.ARRAY);
                var elements = [];
                var d;
                var top_level_type = "";
                for(d = 0; d < objshape.length; d++) {
                    top_level_type += "*";
                }
                for(d = 0; d < objshape.length; d++) {
                    if(d === objshape.length-1) {
                        elements[d] = elementTypeInfo.typeInfo;
                        elements[d].properties = {};
                    }
                    else {
                        elements[d] = new TObject(TObject.ARRAY);
                        elements[d].OpenCLType = elementTypeInfo.typeInfo.OpenCLType +
                            top_level_type.slice(0, top_level_type.length - d - 1);
                        elements[d].properties = {};
                        elements[d].properties.shape = [objshape[d+1]];
                        elements[d].properties.addressSpace = "__private";
                    }
                    if(d > 0) elements[d-1].properties.elements = elements[d];
                }
                tEnv.accu.properties.elements = elements[0];
                // Given an n x m x p array, the shape in 'typeInfo' for this ast node
                // is 'n'.
                tEnv.accu.properties.shape = [objshape[0]];
                tEnv.accu.updateOpenCLType();
                tEnv.addRoot(tEnv.accu);
                tEnv.accu.setAddressSpace("__private");
                break;
            default:
                reportError("Invalid method called on RiverTrailUtils", ast);
        }
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
                type.setAddressSpace("__global");
                break;
            default:
                reportError("unsupported argument kind encountered");
        };
        
        return type;
    }

    // 
    // data flow graph for address space forwarding
    //
    // The graph is double linked, directed. It consits of three kinds of nodes:
    //
    // Type objects: these are data objects in the DFG.
    // FFunction objects: these keep the ins and outs of the DFG of a function in one place.
    // FCall objects: encode a call site
    // FParam objects: these are pointers into a FFunction object, encoding arguments that flow in.
    //
    var FlowNode = function () {
        return this;
    };
    var FFunction = function (params, result, root, ast) {
        this.params = params;
        this.result = result;
        this.root = root;
        this.ast = ast || root;
        this.uses = 0;
        this.label = labelGen();
    };
    FFunction.prototype = new FlowNode();
    var FCall = function (params, frame, result, ast) {
        this.params = params;
        this.frame = frame;
        this.result = result;
        this.ast = ast;
        this.label = labelGen();
    };
    FCall.prototype = new FlowNode();
    var FParam = function (number, call) {
        this.number = number;
        this.call = call;
        this.label = labelGen();
    };
    var FPp = FParam.prototype = new FlowNode();
    FPp.getTarget = function () {
        return this.call.frame.params[this.number];
    };
    FPp.getFrame = function () {
        return this.call.frame;
    };
    FPp.redispatch = function (frame) {
        this.call.frame.uses--;
        this.call.frame = frame;
        this.call.frame.uses++;
        this.call.ast.children[0].dispatch = this.call.frame.ast.dispatch;
    };
    FPp.getCall = function () {
        return this.call;
    };

    function resetAddressSpaces(roots) {
        var seen = [];
        var workset = roots.map(function (val) {
                !val._reset || reportBug ("leftover reset flow information!");
                val._reset = true;
                debug && console.log("RESET: adding root " + val.toString());
                return val;
            });
        while (workset.length > 0) {
            var current = workset.pop();
            seen.push(current);
            if (current.flowTo) {
                current.flowTo.forEach( function (v) {
                    if (!v._reset) {
                        v._reset = true;
                        v.setAddressSpace && v.setAddressSpace(undefined);
                        workset.push(v);
                    }
                });
            } else if (current instanceof FParam) {
                if (!current.call._reset) {
                    current.call._reset = true;
                    workset.push(current.call);
                }
            } else if (current instanceof FCall) {
                if (!current.result._reset) {
                    current.result._reset = true;
                    workset.push(current.result);
                }
            }
        }
        seen.forEach( function (v) { delete v._reset; });
    };

    function propagateAddressSpaces(roots) {
        var workset = roots.map(function (val) { 
                !val._flow || reportBug ("leftover flow information!");
                val._flow = true;
                debug && console.log("FLOW: adding root " + val.toString());
                return val;
            });
        var mergeFlow = function (val, currentAS) {
            if (!val._flowVisited && !val._flow) {
                // every node is visited once no matter what
                workset.push(val);
                val._flow = true;
            }
            if (!val.hasAddressSpace()) {
                val.setAddressSpace(currentAS);
                if (!val._flow) {
                    workset.push(val);
                    val._flow = true;
                }
                debug && console.log("propagated address space " + currentAS);
            } else if (val.getAddressSpace() !== currentAS) {
                if (val.getAddressSpace() !== "__private") {
                    val.setAddressSpace("__private");
                    if (!val._flow) {
                        workset.push(val);
                        val._flow = true;
                    }
                    debug && console.log("privatized address space due to conflict");
                }
            } else {
                debug && console.log("address space remains " + val.properties.addressSpace);
            }
        };

        while (workset.length > 0) {
            var current = workset.pop();
            delete current._flow;
            current._flowVisited = true;
            var currentAS = current.getAddressSpace();
            debug && console.log("FLOW: processing " + current.toString() + " with addressspace " + currentAS);
            if (current.flowTo !== undefined) {
                current.flowTo.forEach(function (val) {
                    if (val instanceof FParam) {
                        // we have a function call, which might need specialisation
                        var target = val.getTarget();
                        var frame = val.getFrame();
                        debug && console.log("inspecting call " + RiverTrail.Helper.wrappedPP(val.getCall().ast) + " currently at " + frame.ast.dispatch);
                        debug && console.log("signature is " + frame.params.reduce(function (p,v) { return p + " " + v.getAddressSpace(); }, "") + ", propagating " + val.number + " as " + currentAS);
                        // we do not propagate undefined address spaces (like scalar arguments)
                        if ((currentAS !== undefined) && (!target.hasAddressSpace() || (target.getAddressSpace() !== currentAS))) {
                            // first, we try to find a matching specialization
                            var specs = frame.root.adrSpecStore;
                            var match = undefined;
                            if (specs) {
                                specs.some(function (v) { 
                                        if (v.typeInfo.parameters.every(function (v,idx) {
                                                if (idx === val.number) {
                                                    // current arg
                                                    return (v.getAddressSpace() === currentAS);
                                                } else {
                                                    return (v.getAddressSpace() === frame.params[idx].getAddressSpace());
                                                }
                                            })) {
                                            match = v;
                                            return true;
                                        } else {
                                            return false;
                                        }
                                    });
                            }
                            if (match) {
                                // redispatch things
                                debug && console.log("redispatching call " + RiverTrail.Helper.wrappedPP(val.getCall().ast) + " to " + match.dispatch);
                                val.redispatch(match.flowFrame);
                                target = val.getTarget();
                                frame = val.getFrame();
                            } else {
                                // we need to create a new version
                                if (frame.uses !== 1) {
                                    // we share this call site, so create a new specialisation
                                    var newfun = cloneFunction(frame.ast);
                                    debug && console.log("specializing call " + RiverTrail.Helper.wrappedPP(val.getCall().ast) + " to " + newfun.dispatch);
                                    // store this specialisation
                                    if (!frame.root.adrSpecStore) {
                                        // setup store for specialisations
                                        frame.root.adrSpecStore = [frame.root];
                                    }
                                    frame.root.adrSpecStore.push(newfun);
                                    val.redispatch(newfun.flowFrame);
                                    // update local state
                                    target = val.getTarget();
                                    frame = val.getFrame();
                                } else {
                                    debug && console.log("re-specializing call " + RiverTrail.Helper.wrappedPP(val.getCall().ast) + " instance " + frame.ast.dispatch);
                                }
                                // propagate new information into function
                                target.setAddressSpace(currentAS);
                                frame._flowVisited = true;
                                debug && console.log("looking into function " + frame.ast.dispatch);
                                debug && console.log("signature is " + frame.params.reduce(function (p,v) { return p + " " + v.getAddressSpace(); }, ""));
                                resetAddressSpaces(frame.ast.flowRoots);
                                propagateAddressSpaces(frame.ast.flowRoots);
                                debug && console.log("done with function " + frame.ast.dispatch);
                            }
                        } else if (!frame._flowVisited) {
                            // we have to look at each function at least once
                            debug && console.log("looking into function " + frame.ast.dispatch);
                            frame._flowVisited = true;
                            propagateAddressSpaces(frame.ast.flowRoots);
                            debug && console.log("done with function " + frame.ast.dispatch);
                        }
                        // apply the new result address space to the return node
                        if (frame.result.hasAddressSpace()) {
                            mergeFlow(val.getCall().result, frame.result.getAddressSpace());
                        }
                        debug && console.log("signature of " + RiverTrail.Helper.wrappedPP(val.getCall().ast) + " now is " + frame.params.reduce(function (p,v) { return p + " " + v.getAddressSpace(); }, ""));
                    } else {
                        // merge flow information
                        mergeFlow(val, currentAS);
                    }
                });
            }
        }
    }

    function insertSpecialisations(ast, where) {
        (ast.type === FUNCTION) || reportBug("unexpected node found");
        if (ast.adrSpecStore) {
            where || reportBug("fun specs found but no target to insert into");
            ast.adrSpecStore.forEach(function (v,idx) { if ((idx>0) && (v.flowFrame.uses > 0)) { where.push(v); } });
        }
        ast.body.funDecls.forEach(function (v) {insertSpecialisations(v, ast.body.funDecls);});
    }

    function analyze(ast, pa, construct, rank, extraArgs, lowPrecision) {
        var tEnv = new TEnv(rootEnvironment, true); // create a new top-level function frame
        var params = ast.params;
        var argT = [];

        // clear away old stack traces
        (stackTrace.length === 0) || (stackTrace = []);

        // set default precision for numbers
        openCLUseLowPrecision = (lowPrecision === true);
        tEnv.openCLFloatType = (openCLUseLowPrecision ? "float" : "double");
        // create type info for this
        if ((construct === "combine") || (construct === "map")) {
            var thisT = TObject.makeType(TObject.PARALLELARRAY, pa);
            thisT.properties.addressSpace = "__global";
            tEnv.bind("this");
            tEnv.update("this", thisT);
            tEnv.addRoot(thisT);
            argT.push(thisT);
        }

        // create type information for generated arguments
        if ((construct === "combine") || (construct === "comprehension")) {
            // create type info for vector index argument
            var ivType = new TObject(TObject.ARRAY);
            ivType.properties.shape = [rank];
            ivType.properties.elements = new TLiteral(TLiteral.NUMBER);
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
                elemT.properties.shape = elemT.properties.shape.slice(rank);
            } else {
                elemT = elemT.properties.elements;
            }
            tEnv.bind(params[0]);
            tEnv.update(params[0], elemT);
            (!elemT.isObjectType()) || tEnv.addRoot(elemT);
            params = params.slice(1);
            argT.push(elemT);
        }

        // ensure we have enough arguments
        params.length === extraArgs.length || reportError("number of arguments does not match number of parameters: " + extraArgs.length + " vs. " + params.length);

        // create type info for all arguments
        params.forEach(function (name) { tEnv.bind(name); });
        params.forEach(function (name, idx) { var type = typeOracle(extraArgs[idx]); 
                                              tEnv.update(name, type); 
                                              type.isObjectType() && tEnv.addRoot(type);
                                              argT.push(type);});

        ast.body = drive(ast.body, tEnv, undefined);

        var type = new TFunction(argT, tEnv.functionResult);
        ast.typeInfo = type;
        ast.symbols = tEnv;

        // propagate address space qualifiers
        propagateAddressSpaces(tEnv.getRoots());
        insertSpecialisations(ast);
                    
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
        "FlowNode" : FlowNode,
        "FFunction" : FFunction,
        "FParam" : FParam,
        "FCall" : FCall,
        "typeOracle" : typeOracle
    };
}();
