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

RiverTrail.InferMem = function () {
    var definitions = Narcissus.definitions;
    eval(definitions.consts);
    eval(RiverTrail.definitions.consts);

    const debug = false;

    // A MemSet models a set of memory variables for a given size. Optinally,
    // each memory name might be associated with a set of aliases that may
    // refer to the same memory. Such aliases are created when two memory sets
    // are overlayed, e.g., because they correspond to two independent control
    // flow paths.
    var MemSet = function () {
        var unique = {value : 0};
        return function () {
            this._store = {};
            this._store.__proto__ = null;
            this._unique = unique;
            return this;
        };
    }();
    var MSP = MemSet.prototype = {};
    MSP.create = function create (name) {
        var memName = "_mem_" + name + "_" + this._unique.value++;
        this.add(memName);
        return memName;
    }
    MSP.add = function add (name) {
        this._store[name] = null;
    }
    MSP.union = function union (other) {
        for (var mem in other._store) {
            if (other._store[mem] !== null) {
                // this entry has a set of aliases attached to it, so copy
                this._store[mem] = new MemSet();
                this._store[mem].union(other.store[mem]);
            } else {
                this.add(mem);
            }
        }
    };
    MSP.overlay = function overlap (other) {
        var keys = Object.keys(this._store);
        var keyPos = 0;
        for (var mem in other._store) {
            if (keyPos < keys.length) {
                if (this._store[keys[keyPos]] === null) {
                    this._store[keys[keyPos]] = new MemSet();
                }
                this._store[keys[keyPos]].add(mem);
            } else {
                this.add(mem);
            }
        }
    };
    MSP.declare = function declare (size) {
        var result = "";
        for (var name in this._store) {
            result += "char " + name + "[" + size + "];";
            if (this._store[name] !== null) {
                result += this._store[name].declareAlias(name);
            }
        };
        return result;
    };
    MSP.declareAlias = function declareAlias (alias) {
        result = "";
        for (var name in this._store) {
            result += "int *" + name + " = " + alias + ";";
        }
        return result;
    }

    // A memory list models a mapping from memory sizes to memory variables.
    // I sort them by sizes so that I can more easily overlay different
    // memory lists.
    var MemList = function () {
        this._store = [];
        return this;
    };
    var MLP = MemList.prototype = {};
    MLP.allocate = function allocate (size, name) {
        if (this._store[size] === undefined) {
            this._store[size] = new MemSet();
        }
        return this._store[size].create(name);
    };
    MLP.join = function join (other) {
        for (var size in other._store) {
            if (this._store[size] === undefined) {
                this._store[size] = new MemSet();
            }
            this._store[size].union(other._store[size]);
        }
    };
    MLP.overlay = function overlay (other) {
        for (var size in other._store) {
            if (this._store[size] === undefined) {
                this._store[size] = new MemSet();
            }
            this._store[size].overlay(other._store[size]);
        }
    };
    MLP.declare = function declare () {
        var result = "";
        for (var size in this._store) {
            result += this._store[size].declare(size);
        }
        return result;
    };

    //
    // error reporting
    //
    function reportError(msg, t) {
        throw "Error: " + msg + " <" + (t ? RiverTrail.Helper.wrappedPP(t) : "no context") + ">"; // could be more elaborate
    }
    function reportBug(msg, t) {
        throw "Bug: " + msg; // could be more elaborate
    }

    function infer(ast, memVars, ins, outs) {
        "use strict";

        switch (ast.type) {
            case SCRIPT:
                ast.funDecls.forEach(function (f) {infer(f.body);});
                memVars = new MemList();
                ast.children.forEach(function (child) { infer(child, memVars, ast.ins, ast.outs); });
                ast.memVars = memVars;
                break;

            case BLOCK:
                ast.children.forEach(function (child) { infer(child, memVars, ins, outs); });
                break;

            //
            // statements
            //
            case FUNCTION:
                // this is not an applied occurence but the declaration, so we do not do anything here
                break;
            case RETURN:
                infer(ast.value, memVars, ins, outs);
                break;
            //
            // loops
            //
            case DO:
                // fallthrough;
            case FOR:
                // setup is run once
                if (ast.setup) {
                    infer(ast.setup, memVars, ins, outs);
                }
                // fallthrough;
            case WHILE:
                infer(ast.condition, memVars, ins, outs);
                infer(ast.body, memVars, ast.ins, ast.outs);
                if (ast.update) {
                    infer(ast.update, memVars, ast.ins, ast.outs);
                }
                break;
            case IF:
                infer(ast.condition, memVars, ins, outs);
                var thenMem = new MemList();
                infer(ast.thenPart, thenMem, ins, outs);
                if (ast.elsePart) {
                    var elseMem = new MemList();
                    infer(ast.elsePart, elseMem, ins, outs);
                    thenMem.overlay(elseMem);
                }
                memVars.join(thenMem);
                break;
            case SEMICOLON:
                infer(ast.expression, memVars, ins, outs);
                break;
            case VAR:
            case CONST:
                ast.children.forEach(function (ast) {
                                         if (ast.initializer) {
                                             infer(ast.initializer, memVars, ins, outs);
                                         }
                                     });
                break;
            case ASSIGN:
                // children[0] is the left hand side, children[1] is the right hand side.
                // both can be expressions. 
                infer(ast.children[0], memVars, ins, outs);
                infer(ast.children[1], memVars, ins, outs);
                switch (ast.children[0].type) {
                    case IDENTIFIER:
                        // a = expr
                        //
                        // case 1:
                        // If <expr> is in the __private address space, then if <a> is an in and out var we have to copy, 
                        // as the memory we have allocated for <expr> could potentially be reused in the next iteration 
                        // of the loop before <a> has been read.
                        //
                        // case 2:
                        // If <expr> is in a different address space than <a>, we have to copy, too.
                        var aVar = ast.children[0];
                        if ((ast.children[1].typeInfo.getOpenCLAddressSpace() === "__private") && // case 1
                            (ins.contains(aVar.value) && outs.contains(aVar.value)) ||
                            (aVar.typeInfo.getOpenCLAddressSpace() != ast.children[1].typeInfo.getOpenCLAddressSpace())) { // case 2
                            ast.allocatedMem = memVars.allocate(aVar.typeInfo.getOpenCLSize(), ast.children[0].value);
                        }
                        break;
                    case INDEX:
                        // case of a[iv] = expr. 
                        break;
                    case DOT:
                        // we do not support this yet
                        // fallthrough;
                    default:
                        reportBug("unhandled lhs in assignment");
                        break;
                }
                break;
                
            // 
            // expressions
            //

            case HOOK:
                // the hook (?) is badly designed. The first child is the condition, second child
                // the then expression, third child the else expression
                infer(ast.children[0], memVars, ins, outs);
                var thenMem = new MemList();
                infer(ast.children[1], thenMem, ins, outs); 
                var elseMem = new MemList();
                infer(ast.children[2], elseMem, ins, outs);
                thenMem.overlay(elseMem);
                memVars.join(thenMem);
                break;
                
            // literals
            case IDENTIFIER:
            case THIS:
            case NUMBER:
            case TRUE:
            case FALSE:
                // nothing to do here
                break;

            case ARRAY_INIT:
                // these require allocation
                ast.allocatedMem = memVars.allocate(ast.typeInfo.getOpenCLSize(), "ARRAY_INIT");
                // fallthrough;
                
            // stuff where we just look at the children
            case COMMA:
            case INCREMENT:
            case PLUS: 
            case DECREMENT:
            case MINUS:
            case MUL:
            case EQ:
            case NE:
            case STRICT_EQ:
            case STRICT_NE:
            case LT:
            case LE:
            case GE:
            case GT:
            case BITWISE_OR:
            case BITWISE_XOR:
            case BITWISE_AND:
            case LSH:
            case RSH:
            case URSH:
            case DIV:
            case MOD:    
            case AND: 
            case OR:
            case NOT:
            case UNARY_PLUS:
            case UNARY_MINUS:
            case BITWISE_NOT:
            case DOT:
            case INDEX:
            case CALL:
            case LIST:      
            case CAST:
            case TOINT32:
                if (ast.children) {
                    ast.children.forEach( function (child) { infer(child, memVars, ins, outs); });
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

            case DEBUGGER:  // whatever this is...
            default:
                throw "unhandled node type in analysis: " + ast.type;
        }

        if (debug && ast.allocatedMem) {
            console.log("new allocation " + ast.allocatedMem);
        }
    };

    function doInfer (ast) {
        if (ast.type !== FUNCTION) {
            reportBug("you probaly wanted to call the inference on a function node!");
        } else {
            infer(ast.body);
        }
    };

    return {
        "infer" : doInfer
    };
}();
