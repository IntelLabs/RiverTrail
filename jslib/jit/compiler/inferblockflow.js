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


//
// This phase collects flow information of variables, namely
//
// in: all the variables that _may_ be read _before_ they are locally defined
// locals: those variables that are _known_ to be locally defined
// outs: those variables that _may_ flow out of the context
//
// The corresponding information is attached to all block nodes and
// to do/for/while loop nodes.
//
RiverTrail.InferBlockFlow = function () {
    var definitions = Narcissus.definitions;
    eval(definitions.consts);
    eval(RiverTrail.definitions.consts);

    const debug = false;

    //
    // error reporting
    //
    var reportError = RiverTrail.Helper.reportError;
    var reportBug = RiverTrail.Helper.reportBug;

    var findSelectionRoot = RiverTrail.Helper.findSelectionRoot;

    // set for remembering identifiers
    var IdSet = function () {
        this._store = {};
        this._store.__proto__ = null;
        return this;
    }
    var ISP = IdSet.prototype = {};
    ISP.subtract = function subtract (other) {
        if (typeof(other) === 'string') {
            delete this._store[other];
        } else {
            for (var name in other._store) {
                delete this._store[name];
            }
        }
        return this;
    };
    ISP.union = function union (other) {
        if (typeof(other) === 'string') {
            this._store[other] = null;
        } else {
            for (var name in other._store) {
                this._store[name] = null;
            }
        }
        return this;
    };
    ISP.clone = function clone () {
        var result = new IdSet();
        result.union(this);
        return result;
    };
    ISP.contains = function contains (name) {
        return (this._store[name] !== undefined);
    };
    ISP.intersect = function intersect (other) {
        if (typeof(other) === 'string') {
            this.subtract(this).union(other);
        } else {
            for (var name in this._store) {
                if (!other.contains(name)) {
                    delete this._store[name];
                }
            }
        }
        return this;
    };
    ISP.toString = function toString () {
        return "{" + Object.keys(this._store).join(",") + "}";
    };

    function infer(ast, ins, outs, locals) {
        "use strict";

        if ((ins === undefined)) {
            (ast.type === FUNCTION) || reportBug("you probably wanted to start inference with a function!");
            ins = new IdSet();
            outs = new IdSet();
            locals = new IdSet();
            infer(ast.body, ins, outs, locals);
        }
        switch (ast.type) {
            case SCRIPT:
                ast.funDecls.forEach(function (f) {infer(f);});
                // fallthrough
            case BLOCK:
                var blockIns = new IdSet();
                var blockOuts = new IdSet();
                var blockLocals = new IdSet();
                ast.children.forEach(function (ast) { infer(ast, blockIns, blockOuts, blockLocals); });
                ast.ins = blockIns.clone();
                ast.outs = blockOuts;
                ast.locals = blockLocals;
                // add all block in vars that are not locally defined in the outer scope to the outer in vars
                ins.union(blockIns.subtract(locals));
                // add our outs and locals to the global outs and locals
                outs.union(blockOuts);
                locals.union(blockLocals);
                break;

            //
            // statements
            //
            case FUNCTION:
                // this is not an applied occurence but the declaration, so we do not do anything here
                break;
            case RETURN:
                infer(ast.value, ins, outs, locals);
                break;
            //
            // loops
            //
            case DO:
                var doIns = new IdSet();
                var doOuts = new IdSet();
                var doLocals = new IdSet();
                infer(ast.body, doIns, doOuts, doLocals);
                infer(ast.condition, doIns, doOuts, doLocals);
                ast.ins = doIns.clone();
                ast.outs = doOuts;
                ast.locals = doLocals;
                // join things up. For the ins, we have to take the global locals out!
                ins.union(doIns.subtract(locals));
                // outs just become joined
                outs.union(doOuts);
                // as do locals, as the loop is always executed at least once
                locals.union(doLocals);
                break;
            case FOR:
            case WHILE:
                if (ast.setup) {
                    infer(ast.setup, ins, outs, locals);
                }
                // the loop body may not be executed, so we have to consider the union of the ins/outs
                // of the loop with the ins/outs when not executing that path
                var loopIns = new IdSet();
                var loopOuts = new IdSet();
                var loopLocals = new IdSet();
                infer(ast.condition, loopIns, loopOuts, loopLocals);
                // the conditional is executed once more later on, so we remeber its ins and outs
                var condIns = loopIns.clone();
                var condOuts = loopOuts.clone();
                var condLocals = loopLocals.clone();
                // now do the body
                infer(ast.body, loopIns, loopOuts, loopLocals);
                if (ast.update) {
                    infer(ast.update, loopIns, loopOuts, loopLocals);
                }
                ast.ins = loopIns.clone();
                ast.outs = loopOuts;
                ast.locals = loopLocals;
                // now we have the in/out knowledge when executing the loop. Join with outer in/outs
                // we drop the locals here, as we do not know whether this path is actually executed!
                ins.union(loopIns.subtract(locals));
                outs.union(loopOuts);
                // the condition is always executed once at least, so we have to take its ins/outs into account
                ins.union(condIns.subtract(locals));
                outs.union(condOuts);
                locals.union(condLocals);
                break;
            case IF:
                infer(ast.condition, ins, outs, locals);
                var thenIns = new IdSet();
                var thenOuts = new IdSet();
                var thenLocals = new IdSet();
                infer(ast.thenPart, thenIns, thenOuts, thenLocals);
                ins.union(thenIns.subtract(locals));
                outs.union(thenOuts);
                if (ast.elsePart) {
                    var elseIns = new IdSet()
                    var elseOuts = new IdSet()
                    var elseLocals = new IdSet()
                    infer(ast.elsePart, elseIns, elseOuts, elseLocals);
                    ins.union(elseIns.subtract(locals));
                    outs.union(elseOuts);
                    thenLocals.intersect(elseLocals);
                }
                locals.union(thenLocals);
                break;
            case SEMICOLON:
                if (ast.expression) {
                    infer(ast.expression, ins, outs, locals);
                }
                break;
            case VAR:
            case CONST:
                ast.children.forEach(function (ast) {
                                         if (ast.initializer) {
                                             infer(ast.initializer, ins, outs, locals);
                                             locals.union(ast.value);
                                             outs.union(ast.value);
                                         }
                                     });
                break;
            case ASSIGN:
                // children[0] is the left hand side, children[1] is the right hand side.
                // both can be expressions. 
                switch (ast.children[0].type) {
                    case IDENTIFIER:
                        // simple case of a = expr
                        infer(ast.children[1], ins, outs, locals);
                        locals.union(ast.children[0].value);
                        outs.union(ast.children[0].value);
                        if (ast.assignOp) {
                            // this is a id <op>= expr, so we have an in dependency, too
                            ins.union(ast.children[0].value);
                        }
                        break;
                    case INDEX:
                        infer(ast.children[0], ins, outs, locals);
                        infer(ast.children[1], ins, outs, locals);
                        // a[expr_i] = expr
                        // today, a needs to be a nested selection. We walked through it once, which tags
                        // it as an IN. Additionally, it now becomes an out. It, however, does not
                        // become a local, as it is not _fully_ locally defined!
                        outs.union(findSelectionRoot(ast.children[0]).value);
                        break;
                    case DOT:
                        // not allowed for now as object cannot be mutated :-)
                        // we should never get here.
                        //reportBug("objects may not be mutated!");
                        infer(ast.children[0], ins, outs, locals);
                        infer(ast.children[1], ins, outs, locals);
                        break;
                    default:
                        reportBug("unhandled lhs in assignment");
                        break;
                }
                break;
                
            // 
            // expressions
            //
            case COMMA:
                // left to right we go...
                ast.children.forEach(function (ast) { infer(ast, ins, outs, locals); });
                break;
            case HOOK:
                // Same logic as used for conditionals
                infer(ast.children[0], ins, outs, locals);
                var elseIns = ins.clone();
                var elseOuts = outs.clone();
                var elseLocals = locals.clone();
                var thenLocals = locals.clone();
                infer(ast.children[1], ins, outs, thenLocals);
                infer(ast.children[2], elseIns, elseOuts, elseLocals);
                ins.union(elseIns);
                outs.union(elseOuts);
                thenLocals.intersect(elseLocals);
                locals.union(thenLocals);
                break;
                
            // side effecting expressions
            case INCREMENT:
            case DECREMENT:
                ins.union(ast.value);
                locals.union(ast.value); // only if expr is not an array!
                outs.union(ast.value);
                break;

            // n-ary expressions
            case PLUS: 
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
                //fallthrough;
                // misc other stuff that just requires a map
                ast.children.forEach(function (val) { infer(val, ins, outs, locals); });
                break;
            case CALL:
                if(ast.children[0].type === DOT &&
                        (ast.children[0].children[0].value === "RiverTrailUtils" ||
                        ast.children[0].children[1].value === "createArray")) {
                    infer(ast.children[1].children[1], ins, outs, locals);
                    break;
                }
                ast.children.forEach(function (val) { infer(val, ins, outs, locals); });
                break;
            case LIST:      
            case CAST:
            case TOINT32:
            case FLATTEN:
            case ARRAY_INIT:
            case INDEX:
                ast.children.forEach(function (val) { infer(val, ins, outs, locals); });
                break;

            // dot is special: only look at child number one, number two is a label!
            case DOT:
                infer(ast.children[0], ins, outs, locals);
                break;

            // literals
            case IDENTIFIER:
            case THIS:
                if (!locals.contains(ast.value)) {
                    ins.union(ast.value);
                }
                break;


            case NUMBER:
            case TRUE:
            case FALSE:
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
                reportError("general objects not yet implemented", ast);
                break;
            case OBJECT_INIT:
                for(var idx = 0; idx < ast.children.length; idx++) {
                    infer(ast.children[idx].children[1], ins, outs, locals);
                }
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
                throw "unhandled node type in analysis: " + ast.type;
        }
    }

    return {
        "infer" : infer,
    };
}();
