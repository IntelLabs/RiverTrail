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

RiverTrail.RangeAnalysis = function () {
    var definitions = Narcissus.definitions;
    eval(definitions.consts);
    eval(RiverTrail.definitions.consts);

    var stripToBaseType = RiverTrail.Helper.stripToBaseType;

    var debug = false;
    var intraFun = false;
    var maxRangeUpdates = 1;

    var RANGE_MAX = 2147483647;
    var RANGE_MIN = -2147483647;

    //
    // error reporting
    //
    var reportError = RiverTrail.Helper.reportError;
    var reportBug = RiverTrail.Helper.reportBug;
    var findSelectionRoot = RiverTrail.Helper.findSelectionRoot;

    // 
    // Environment to encode constraints on identifiers. A constraint can either be a single 2-element
    // vector [lower bound, upper bound], or, if the identifier represents a vector, an array of such
    // tuples. The value undefined is used to encode that no constraint is known.
    //
    // Adding a constraint to an existing constraint computes the intersection of the ranges.

    var Constraint = function (lb, ub) {
        this.lb = lb;
        this.ub = ub;
        return this;
    }
    var CTp = Constraint.prototype;
    CTp.merge = function (other) {
        var newlb = ((this.lb !== undefined) ? ((other.lb !== undefined) ? Math.max(this.lb, other.lb) : this.lb) : other.lb);
        var newub = ((this.ub !== undefined) ? ((other.ub !== undefined) ? Math.min(this.ub, other.ub) : this.ub) : other.ub);
        return new Constraint(newlb, newub);
    };
    CTp.intersect = function (other) {
        var newlb = ((this.lb !== undefined) ? ((other.lb !== undefined) ? Math.min(this.lb, other.lb) : undefined) : undefined);
        var newub = ((this.ub !== undefined) ? ((other.ub !== undefined) ? Math.max(this.ub, other.ub) : undefined) : undefined);
        return new Constraint(newlb, newub);
    }
    CTp.isComplete = function () {
        return (this.lb !== undefined) && (this.ub !== undefined);
    };
    CTp.toString = function () {
        return "[" + ((this.lb !== undefined) ? this.lb.toString() : "--") + "," + ((this.ub !== undefined) ? this.ub.toString() : "--") + "]";
    };

    var Constraints = function () {
        this.bindings = {};
        this.bindings.__proto__ = null;
        return this;
    };
    var CTSp = Constraints.prototype;
    CTSp.lookup = function (name) {
        return this.bindings[name];
    }
    CTSp.add = function (name, constraint) {
        if (this.bindings[name]) {
            var current = this.bindings[name];
            if (constraint instanceof Array) {
                (current instanceof Array) || reportBug("mixed scalar and array constraints?!?");
                this.bindings[name] = current.map(function (val, idx) { return val.merge(constraint[idx]); });
            } else {
                !(current instanceof Array) || reportBug("mixed scalar and array constraints?!?");
                this.bindings[name] = current.merge(constraint);
            }
        } else {
            this.bindings[name] = constraint;
        }
    };
    CTSp.intersect = function (other) {
        for (name in this.bindings) {
            var mine = this.bindings[name];
            var other = other.bindings[name];
            if (!other) {
                delete this.bindings[name];
            } else {
                if (mine instanceof Array) {
                    this.bindings[name] = mine.map(function (val, idx) { return val.intersect(other[idx]); });
                } else {
                    this.bindings[name] = mine.intersect(other);
                }
            }
        }
    };
    CTSp.merge = function (other) {
        for (name in other.bindings) {
            this.add(name, other.bindings[name]);
        }
    };
    CTSp.addAccu = function (name, accu, index, size) {
        var constraint;
        var type = accu.type;
        if (accu.inverse) {
            switch (type) {
                case LT:
                    type = GE;
                    break;
                case LE:
                    type = GT;
                    break;
                case GT:
                    type = LE;
                    break;
                case GE:
                    type = GT;
                    break;
                default:
                    type = undefined;
            }
        }
        switch (type) {
            case LT:
                if (accu.range.ub !== undefined) {
                    constraint = new Constraint(undefined, accu.range.ub - 1);
                }
                break;
            case LE:
                constraint = new Constraint(undefined, accu.range.ub);
                break;
            case GE:
                constraint = new Constraint(accu.range.lb, undefined);
                break;
            case GT:
                if (accu.range.lb !== undefined) {
                    constraint = new Constraint(accu.range.lb + 1, undefined);
                }
                break;
            case EQ:
            case STRICT_EQ: // strict is tricky. This might actually be a bool,
                            // in which case STRICT_EQ would fail. So our approximation
                            // is inprecise
                constraint = new Constraint(accu.range.lb, accu.range.ub);
                break;
            default:
                constraint = undefined;
        }
        if (constraint) {
            if (index !== undefined) {
                var cArray = new Array(size);
                for (pos = 0; pos < size; pos++) {
                    if (pos === index) {
                        cArray[pos] = constraint;
                    } else {
                        cArray[pos] = new Constraint(undefined, undefined);
                    }
                }
                constraint = cArray;
            }
            this.add(name, constraint);
        }
    };
    var Range = function (lb, ub, isInt) {
        this.lb = lb;
        this.ub = ub;
        this.isInt = (isInt && ((this.lb || 0) > RANGE_MIN) && ((this.ub || 0) < RANGE_MAX)) || false; // normalize away undefined
        return this;
    };
    var Rp = Range.prototype;
    Rp.union = function (val) {
        return new Range(((this.lb === undefined) || (val.lb === undefined)) ? undefined : Math.min(this.lb, val.lb),
                         ((this.ub === undefined) || (val.ub === undefined)) ? undefined : Math.max(this.ub, val.ub),
                         this.isInt && val.isInt);
    };
    Rp.constrain = function (val) {
        return new Range((this.lb === undefined) ? val.lb : ((val.lb === undefined) ? this.lb : Math.max(this.lb, val.lb)),
                         (this.ub === undefined) ? val.ub : ((val.ub === undefined) ? this.ub : Math.min(this.ub, val.ub)),
                         this.isInt);
    };
    Rp.force = function (val) {
        return new Range((val.lb === undefined) ? this.lb : val.lb, (val.ub === undefined) ? this.ub : val.ub, this.isInt);
    };
    Rp.map = function (other, fn, isInt) {
        debug && (isInt === undefined) && reportBug("Rp.map called without isInt argument");
        return new Range(((this.lb === undefined) || (other.lb === undefined)) ? undefined : fn(this.lb, other.lb),
                         ((this.ub === undefined) || (other.ub === undefined)) ? undefined : fn(this.ub, other.ub),
                         isInt);
    };
    Rp.fixedValue = function () {
        return (this.lb !== undefined) && (this.lb === this.ub);
    };
    Rp.covers = function (other) {
        var res = ((this.lb === other.lb) || (this.lb < other.lb)) &&
                  ((this.ub === other.ub) || (this.ub > other.ub));
        return res;
    };
    Rp.clone = function () {
        return new Range(this.lb, this.ub, this.isInt);
    };
    Rp.isUndefined = function () {
        return (this.lb === undefined) && (this.ub === undefined) && !this.isInt;
    };
    Rp.forceInt = function forceInt(val) {
        this.isInt = val;
    };
    Rp.toString = function () {
        return "[" + ((this.lb !== undefined) ? this.lb.toString() : "--") + "," + ((this.ub !== undefined) ? this.ub.toString() : "--") + "]<" + (this.isInt ? "int" : "fp") + ">";
    };

    var RangeArray = function (src, f) {
        this._store = [];
        if (src) {
            if (src instanceof RangeArray) {
                for (var cnt = 0; cnt < src._store.length; cnt++) {
                    this._store[cnt] = f(src._store[cnt], cnt);
                }
            } else {
                for (var cnt = 0; cnt < src.length; cnt++) {
                    this._store[cnt] = f(src[cnt], cnt);
                }
            }
        }
        return this;
    };
    var RAp = RangeArray.prototype;
    RAp.get = function (i) { return this._store[i];};
    RAp.set = function (i,v) { this._store[i] = v; };
    RAp.map = function (f) {
        return function selfF (val) {
            var result = new RangeArray();
            for (var cnt = 0; cnt < this._store.length; cnt++) {
                if (this._store[cnt] instanceof RangeArray) {
                    result._store[cnt] = selfF.call(this._store[cnt], (val instanceof RangeArray ? val._store[cnt] : val));
                } else {
                    result._store[cnt] = f.call(this._store[cnt], (val instanceof RangeArray ? val._store[cnt] : val));
                }
            }
            return result;
        };
    };
    RAp.union = RAp.map(Rp.union);
    RAp.constrain = RAp.map(Rp.constrain);
    RAp.force = RAp.map(Rp.force);
    RAp.clone = function () {
        var result = new RangeArray();
        result._store = this._store.map(function (val) { return val.clone();});
        return result;
    };
    RAp.covers = function (other) {
        if (other instanceof RangeArray) {
            return this._store.every(function (a, idx) { return a.covers(other._store[idx]);});
        } else {
            return false;
        }
    };
    RAp.isInt = function isInt() {
        return this._store.every( function (val) { return (val instanceof RangeArray) ? val.isInt() : val.isInt;});
    };
    RAp.setInt = function setInt(other, union) {
        this._store.forEach( function (mine, idx) { 
                                 if (mine instanceof RangeArray) {
                                     mine.setInt((other instanceof RangeArray ? other._store[idx] : other), union);
                                 } else {
                                     mine.isInt = (other instanceof RangeArray ? other._store[idx] : other).isInt && (!union || mine.isInt);
                                 }
                             });
    };
    RAp.forceInt = function forceInt(val) {
        this._store.forEach( function (v) { v.forceInt(val); });
    };
    RAp.isUndefined = function () {
        // range arrays at least carry some information about how many elements there are
        return false;
    };
    RAp.toString = function toString() {
        var result = "[[";
        for (var cnt = 0; cnt < this._store.length; cnt++) {
            if (cnt > 0) 
                result += ", ";
            result += this._store[cnt].toString();
        }
        result += "]<";
        result += this.isInt() ? "int" : "fp";
        result += ">]";
        return result;
    };
    
    var VarEnv = function (env) {
        this.parent = env;
        this.bindings = {};
        this.bindings.__proto__ = null;
    };
    var VEp = VarEnv.prototype;
    VEp.lookup = function (name) {
        var result = this.bindings[name];
        if (!result && this.parent) {
            result = this.parent.lookup(name);
        }
        return result;
    };
    VEp.update = function (name, range) {
        var current = this.lookup(name);
        if (current) {
            if (!current.isUndefined() && !range.isUndefined()) {
                if (current instanceof RangeArray) {
                    (range instanceof RangeArray) || reportBug("update of array range with scalar range?");
                    this.bindings[name] = range.clone();
                    this.bindings[name].setInt(current, true);
                } else {
                    !(range instanceof RangeArray) || reportBug("update of scalar range with array range?");
                    this.bindings[name] = range.clone();
                    this.bindings[name].isInt = range.isInt && current.isInt;
                }
            } else if (!range.isUndefined()) {
                if (range instanceof RangeArray) {
                    this.bindings[name] = range.clone();
                    this.bindings[name].setInt(current, true);
                } else {
                    this.bindings[name] = range.clone();
                    this.bindings[name].isInt = range.isInt && current.isInt;
                }
            } else {
                this.bindings[name] = new Range(undefined, undefined, false);
            }
        } else {
            this.bindings[name] = range;
        }
        debug && console.log(name + " updated to " + this.bindings[name].toString());
    };
    VEp.apply = function (name, constraint) {
        var current = this.lookup(name);
        if (constraint instanceof Array) {
            if (current) {
                this.bindings[name] = new RangeArray(current, function (val,idx) { return val.constrain(constraint[idx]); });
            } else {
                this.bindings[name] = new RangeArray(constraint, function (val) { return new Range(val.lb, val.ub); });
            }
        } else {
            if (current) {
                this.bindings[name] = current.constrain(constraint);
            } else {
                this.bindings[name] = new Range(constraint.lb, constraint.ub);
            }
        }
        debug && console.log(name + " merged as " + this.bindings[name].toString());
    };
    VEp.enforce = function (name, constraint) {
        var current = this.lookup(name);
        if (constraint instanceof Array) {
            if (current) {
                this.bindings[name] = new RangeArray(this.bindings[name], function (val,idx) { return val.force(constraint[idx]); });
            } else {
                this.bindings[name] = new RangeArray(constraint, function (val) { return new Range(val.lb, val.ub); });
            }
        } else {
            if (current) {
                this.bindings[name] = current.force(constraint);
            } else {
                this.bindings[name] = new Range(constraint.lb, constraint.ub);
            }
        }
        debug && console.log(name + " enforced as " + this.bindings[name].toString());
    };
    VEp.applyConstraints = function (constraints) {
        for (var name in constraints.bindings) {
            this.apply(name, constraints.lookup(name));
        }
    }
    VEp.enforceConstraints = function (constraints) {
        for (var name in constraints.bindings) {
            this.enforce(name, constraints.lookup(name));
        }
    }
    VEp.isEmpty = function () {
        return (Object.keys(this.bindings).length === 0);
    }
    VEp.covers = function (other) {
        var result = true;
        for (key in other.bindings) {
            var own = this.bindings[key];
            if (!own) { 
                result = false;
                break;
            }
            var others = other.bindings[key];
            if (!own.covers(others)) {
                result = false;
                break;
            }
        }
        return result;
    };
    VEp.merge = function (other) {
        for (var name in other.bindings) { // only look at top level additions
            var ours = this.lookup(name);
            if (ours) { // we have previous info, so update
                this.update(name, ours.union(other.bindings[name]));
            } else { // this is new, so it is not defined in the alternative path. 
                     // type inference ensures that, if a variable is only accessed in
                     // one control path, it is not accessed after the join. So we can
                     // just keep whatever we have found. 
                this.update(name, other.bindings[name]);
            }
        }
    };
    VEp.updateAll = function (other) {
        for (var name in other.bindings) { // only look at top level additions
            this.update(name, other.bindings[name]);
        }
    };
    VEp.invalidate = function () {
        for (var name in this.bindings) {
            if (this.bindings[name] instanceof RangeArray) {
                this.bindings[name] = new RangeArray(this.bindings[name], function (v) { return new Range(undefined, undefined, false); });
            } else {
                this.bindings[name] = new Range(undefined, undefined, false);
            }
        }
    };
    VEp.toString = function () {
        var s = "<<";
        for (var name in this.bindings) {
            s = s + name + " => " + this.bindings[name].toString() + ",";
        }
        return s;
    };


    function eraseRangeInfo(ast) {
        RiverTrail.Helper.traverseAst(ast, function (v) { delete v.rangeInfo; return v;});
    }

    function annotateRangeInfo(ast, range, mode) {
        if (mode) {
            ast.rangeInfo = range;
        } else if (range) {
            if (ast.rangeInfo !== undefined) {
                if (ast.rangeInfo instanceof RangeArray) {
                 ast.rangeInfo.setInt(range);
                } else {
                    ast.rangeInfo.isInt = range.isInt;
                }
            }
        }
    }

    function computeRootRangeInfo(ast, range) {
        var index, result, newRange;

        switch (ast.type) {
            case INDEX:
                expr = ast.children[0]; index = ast.children[1];
                if (index.rangeInfo.fixedValue()) {
                    // compute the range of the entire array
                    var newRange = expr.rangeInfo.clone();
                    if (newRange instanceof RangeArray) { // check as undefined ranges are always scalar
                        newRange.set(index.rangeInfo.lb, range.clone());
                    } else {
                        newRange = new Range(undefined, undefined, false); // just to be sure
                    }
                } else {
                    // modify to undefined
                    newRange = new Range(undefined, undefined, false);
                }
                result = computeRootRangeInfo(expr, newRange);
                break;
            case IDENTIFIER:
                result = range;
                break;
            default:
                throw "unexpected node in computeRootRangeInfo. TI must have let something pass that it should not!";
        }

        return result;
    }

    //
    // The abstract interpretation uses the following signature
    //   (source, variable bindings, whether to update the tree with new findings,
    //    current constraint set, constraint to assign, inverse constraints) -> range information
    // The last two arguments might be undefined
    function drive(ast, varEnv, doAnnotate, constraints, constraintAccu, inverse) {
        var result;

        if (!ast) {
            reportBug("malformed syntax tree encountered.", ast);
        }

        if (!ast.type) {
            reportBug("missing type information in syntax tree.", ast);
        }

        switch (ast.type) {
            case SCRIPT:
                varEnv = new VarEnv(varEnv);
                ast.rangeSymbols = varEnv;
                if (!intraFun) {
                    ast.funDecls.forEach(function (f) {
                            var innerVEnv = new VarEnv();
                            f.params.forEach(function (v) { innerVEnv.update(v, new Range(undefined, undefined, false)); });
                            drive(f.body, innerVEnv, true);
                        });
                }
                // fallthrough
            case BLOCK:
                ast.children.forEach(function (ast) { drive(ast, varEnv, doAnnotate); });
                break;

            //
            // statements
            //
            case FUNCTION:
                // this is not an applied occurence but the declaration, so we do not do anything here
                break;
            case RETURN:
                drive(ast.value, varEnv, doAnnotate);
                // return does not really produce a value as it exists the current scope. However,
                // it is a non int ast, as we always return floats. This is modelled this way...
                result = new Range(undefined, undefined, false);
                // also, if the rhs is an identifier with non-scalar type, we promote its type to double to avoid casting on return
                // we do the same if the rhs is an array init that contains a non-scalar identifier
                (function rec (ast) {
                   if (ast.type === ARRAY_INIT) {
                     ast.children.forEach(rec);
                   } else if ((ast.type === IDENTIFIER) && (!ast.typeInfo.isScalarType())) {
                     varEnv.lookup(ast.value).forceInt(false);
                     ast.rangeInfo = varEnv.lookup(ast.value);
                   }
                }(ast.value));

                break;
            //
            // loops (SAH)
            //
            // The handling of loops is not very sophisticated. The current approach only works
            // if all induction variables are constrained by the loop's predicate. To allow
            // unconstrained induction variables we would have to compute the tripcount of the loop.
            // The information this pass currently infers is not good enough for this, though, as 
            // the change of variables per iteration is an approximation and might be larger than
            // the actual change. This in turn would lead to a too low trip count. 
            // To improve on this, the inference would need to keep track of whether a range is
            // tight or just an approximation. Once that is in place, computing the tripcount
            // can be done by dividing the range of the induction variable by the change of its 
            // range during one iteration (if both the lower and upper bound change by the same
            // amount!). 
            // Furthermore, as we do not a-priori know the upper/lower bound of unconstrained
            // induction variables, we would need a closed form expression to reason about
            // how the indcution variable changes. This information is not available, either.
            //
            // I leave this as a future improvement :-)
            //
            case DO:
                // do loops always execute the body once
                drive(ast.body, varEnv, doAnnotate);
                // fallthrough;
            case FOR:
                // setup is run once
                if (ast.setup) {
                    drive(ast.setup, varEnv, doAnnotate);
                }
                // fallthrough;
            case WHILE:
                // constraints are true for the body only. Furthermore, we disallow effects on variables
                // in the predicate for now. To catch this, use a new VE.
                var bodyC = new Constraints();
                var predVE = new VarEnv(varEnv);
                drive(ast.condition, predVE, doAnnotate, bodyC);
                // the body is only evaluated if the constraints hold, so its effects might not be visible
                // in the exit path
                var bodyVE = new VarEnv(varEnv);
                bodyVE.enforceConstraints(bodyC); 
                drive(ast.body, bodyVE, doAnnotate);
                // now we execute the update, if we have one
                if (ast.update) {
                    drive(ast.update, bodyVE, doAnnotate);
                }
                // now we do a second pass of the body to see whether the ranges we have cover
                // further iterations. We do not update the tree while we do this, as we have
                // incorrect lower bound information (its the second iteration!) However, 
                // we do update whether a variable is an integer!
                var bodyVE2 = new VarEnv(bodyVE);
                bodyVE2.enforceConstraints(bodyC);
                drive(ast.body, bodyVE2, false); 
                // the second iteration includes the update, as this happens
                // before we exit
                if (ast.update) {
                    drive(ast.update, bodyVE2, false);
                }
                // the range information is only valid iff the second environment is covered
                // by the first. In this case, the constraints delimit all non-invariant loop
                // variables
                if (!bodyVE.covers(bodyVE2) || !predVE.isEmpty()) {
                    // the range information is invalid, so destroy it
                    //eraseRangeInfo(ast);
                    // and invalidate all range info of things touched in the outgoing VE
                    bodyVE.invalidate();
                    predVE.invalidate();
                    bodyVE.merge(predVE);

                    // push the invalidation through the ast
                    drive(ast.condition, bodyVE, doAnnotate);
                    drive(ast.body, bodyVE, doAnnotate);
                    if (ast.update) {
                        drive(ast.update, bodyVE, doAnnotate);
                    }
                } else {
                    // we need to propagate what we have found to the conditional, too
                    drive(ast.condition, bodyVE, doAnnotate);
                }
                // Take the union of both execution paths, as we never know which one is taken
                varEnv.merge(bodyVE);
                break;
            case IF:
                var predC = new Constraints();
                drive(ast.condition, varEnv, doAnnotate, predC);
                var thenVE = new VarEnv(varEnv);
                thenVE.applyConstraints(predC);
                drive(ast.thenPart, thenVE, doAnnotate);
                var predCE = new Constraints();
                drive(ast.condition, varEnv, doAnnotate, predCE, undefined, true); // compute inverse
                var elseVE = new VarEnv(varEnv);
                elseVE.applyConstraints(predCE);
                if (ast.elsePart) {
                    drive(ast.elsePart, elseVE, doAnnotate);
                }
                thenVE.merge(elseVE);
                varEnv.updateAll(thenVE);
                break;
            case SEMICOLON:
                if (ast.expression) {
                    result = drive(ast.expression, varEnv, doAnnotate);
                } else {
                    result = new Range(undefined, undefined, false);
                }
                break;
            case VAR:
            case CONST:
                ast.children.forEach(function (ast) {
                                         if (ast.initializer) {
                                             varEnv.update(ast.value, drive(ast.initializer, varEnv, doAnnotate));
                                         }
                                         annotateRangeInfo(ast, varEnv.lookup(ast.value), doAnnotate);
                                     });
                break;
            case ASSIGN:
                // children[0] is the left hand side, children[1] is the right hand side.
                // both can be expressions. 
                drive(ast.children[0], varEnv, doAnnotate);
                var right = drive(ast.children[1], varEnv, doAnnotate);
                switch (ast.children[0].type) {
                    case IDENTIFIER:
                        // simple case of a = expr
                        varEnv.update(ast.children[0].value, right);
                        annotateRangeInfo(ast.children[0], right.clone(), doAnnotate);
                        result = right; // assignment yields the rhs as value
                        break;
                    case INDEX:
                        // the lhs can only be a nested selection, so it suffices to push the update through 
                        // until we find the identifier to update the variable environment. A nifty little helper does
                        // this task. Note that the expression itself was already annotated, as it is evaluated _before_
                        // the rhs.
                        var rootRange = computeRootRangeInfo(ast.children[0], right);
                        var root = findSelectionRoot(ast.children[0]);
                        varEnv.update(root.value, rootRange);
                        result = right;
                    case DOT:
                        // we do not infer range information for objects 
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
                // we keep the type of the last child
                ast.children.forEach(function (ast) { result = drive(ast, varEnv, doAnnotate, constraints, constraintAccu);});
                break;
            case HOOK:
                // the hook (?) is badly designed. The first child is the condition, second child
                // the then expression, third child the else expression
                var predC = new Constraints();
                drive(ast.children[0], varEnv, doAnnotate, predC);
                var thenVE = new VarEnv(varEnv);
                thenVE.applyConstraints(predC);
                left = drive(ast.children[1], thenVE, doAnnotate); 
                var predCE = new Constraints();
                drive(ast.children[0], varEnv, doAnnotate, predCE, undefined, true); // compute inverse
                var elseVE = new VarEnv(varEnv);
                elseVE.applyConstraints(predCE);
                right = drive(ast.children[2], elseVE, doAnnotate); 
                thenVE.merge(elseVE);
                varEnv.updateAll(thenVE);
                result = left.union(right);
                break;
                
            // binary operations on all literals
            case INCREMENT:
            case PLUS: 
                var left = drive(ast.children[0], varEnv, doAnnotate);
                if (ast.children[1]) {
                    var right = drive(ast.children[1], varEnv, doAnnotate);
                } else {
                    var right = new Range(1,1, true);
                }
                result = left.map( right, function (a,b) { return a+b; }, left.isInt && right.isInt); 
                if (!ast.children[1]) { // INCREMENT
                    varEnv.update(ast.children[0].value, result);
                }
                break;
            case DECREMENT:
            case MINUS:
                var left = drive(ast.children[0], varEnv, doAnnotate);
                if (ast.children[1]) {
                    var right = drive(ast.children[1], varEnv, doAnnotate);
                } else {
                    var right = new Range(1,1, true);
                }
                result = left.map( right, function (a,b) { return a-b; }, left.isInt && right.isInt); 
                if (!ast.children[1]) { // DECREMENT
                    varEnv.update(ast.children[0].value, result);
                }
                break;
            case MUL:
                var left = drive(ast.children[0], varEnv, doAnnotate);
                var right = drive(ast.children[1], varEnv, doAnnotate);
                var newLb = Math.min(left.lb * right.lb, left.ub * right.lb, left.ub * right.lb, left.ub * right.ub);
                var newUb = Math.max(left.lb * right.lb, left.ub * right.lb, left.ub * right.lb, left.ub * right.ub);

                result = new Range( isNaN(newLb) ? undefined : newLb,
                                    isNaN(newUb) ? undefined : newUb,
                                    left.isInt && right.isInt);
                break;

            case DIV:
                var left = drive(ast.children[0], varEnv, doAnnotate);
                var right = drive(ast.children[1], varEnv, doAnnotate);
                if ((left.lb !== undefined) && (left.ub !== undefined) && (Math.abs(right.lb) >= 1) && (Math.abs(right.ub) >= 1)) {
                    var newLb = Math.min(left.lb / right.lb, left.ub / right.lb, left.ub / right.lb, left.ub / right.ub);
                    var newUb = Math.max(left.lb / right.lb, left.ub / right.lb, left.ub / right.lb, left.ub / right.ub);
                    result = new Range( isNaN(newLb) ? undefined : newLb, isNaN(newUb) ? undefined : newUb, false);
                } else {
                    result = new Range(undefined, undefined, false);
                }
                break;
                
            case EQ:
            case NE:
            case STRICT_EQ:
            case STRICT_NE:
            case LT:
            case LE:
            case GE:
            case GT:
                var right = drive(ast.children[1], varEnv, doAnnotate, constraints, undefined, inverse); // grab rhs range
                var left = drive(ast.children[0], varEnv, doAnnotate, constraints, {"type" : ast.type, "range" : right, "inverse" : inverse}, inverse); // apply constraint to lhs
                result = new Range(0, 1, true); // result is a bool
                break;

            // we do not implement these yet
            case BITWISE_OR:
            case BITWISE_XOR:
            case BITWISE_AND:
            case LSH:
            case RSH:
            case URSH:
            case MOD:    
                var left = drive(ast.children[0], varEnv, doAnnotate);
                var right = drive(ast.children[1], varEnv, doAnnotate);
                result = new Range(undefined, undefined, false);
                break;

            // binary operators on bool
            case AND: 
            case OR:
                if (((ast.type === AND) && !inverse) ||
                    ((ast.type === OR ) && inverse)) { // merge both branches
                    drive(ast.children[0], varEnv, doAnnotate, constraints, undefined, inverse);
                    drive(ast.children[1], varEnv, doAnnotate, constraints, undefined, inverse);
                } else { // intersect branches
                    var leftC = new Constraints();
                    drive(ast.children[0], varEnv, doAnnotate, leftC, undefined, inverse);
                    var rightC = new Constraints();
                    drive(ast.children[1], varEnv, doAnnotate, rightC, undefined, inverse);
                    leftC.intersect(rightC);
                    constraints.merge(leftC);
                }
                result = new Range(0, 1, true); // the result is a boolean :)
                break;
            // unary functions on all literals
            case NOT:
                drive(ast.children[0], varEnv, doAnnotate, constraints, undefined, !inverse); 
                result = new Range(0, 1, true); // the result is a boolean :)
                break;
            case UNARY_PLUS:
                result = drive(ast.children[0], varEnv, doAnnotate);
                break;
            case UNARY_MINUS:
                var left = drive(ast.children[0], varEnv, doAnnotate);
                result = new Range((left.ub === undefined) ? undefined : -left.ub,
                                   (left.lb === undefined) ? undefined : -left.lb,
                                   left.isInt);
                break;
            case BITWISE_NOT:
                drive(ast.children[0], varEnv, doAnnotate);
                result = new Range(undefined, undefined, false);
                break;

            // literals
            case IDENTIFIER:
            case THIS:
                if (constraintAccu && constraints) { // we have a new constraint here, so add it to constraints
                    constraints.addAccu(ast.value, constraintAccu);
                }
                result = varEnv.lookup(ast.value) || new Range(undefined, undefined, false);
                break;
            case DOT:
                // we support array.length and PA.length as it is somewhat a common loop bound. Could be more elaborate
                drive(ast.children[0], varEnv, doAnnotate);
                //drive(ast.children[1], varEnv, doAnnotate); // this needs to be an identifier, so no need to range infer it
                if ((ast.children[1].value === "length") && ast.children[0].typeInfo.isArrayishType()) {
                    result = new Range(ast.children[0].typeInfo.properties.shape[0], ast.children[0].typeInfo.properties.shape[0], true);
                } else {
                    result = new Range(undefined, undefined, false);
                }
                break;

            case NUMBER:
                result = new Range(ast.value, ast.value, (Math.floor(ast.value) === ast.value));
                break;
            case TRUE:
                result = new Range(1, 1, true);
                break;
            case FALSE:
                result = new Range(0, 0, true);
                break;

            // array operations
            case INDEX:
                var index = drive(ast.children[1], varEnv, doAnnotate);
                var array = drive(ast.children[0], varEnv, doAnnotate);
                // special case for selecting elements from the index vector
                if (index.fixedValue()) {
                    if (constraintAccu && constraints && (ast.children[0].type === IDENTIFIER)) { // we have new constraint information to assign
                        constraints.addAccu(ast.children[0].value, constraintAccu, index.lb, ast.children[0].typeInfo.properties.shape[0]);
                    }
                    if (array && (array instanceof RangeArray)) { // undefined results are always scalar, so we have to check here
                        result = array.get(index.lb);
                    } 
                } 
                if (!result) {
                    result = new Range(undefined, undefined, false);
                }
                break;

            case ARRAY_INIT:
                result = new RangeArray(ast.children, function (ast) { return drive(ast, varEnv, doAnnotate);});
                break;

            // function application
            case CALL:
                drive(ast.children[0], varEnv, doAnnotate);
                drive(ast.children[1], varEnv, doAnnotate);
                switch (ast.children[0].type) {
                    case DOT:
                        // we support getShape on Parallel Arrays, as it is a common bound for loops
                        var dot = ast.children[0];
                        if(dot.children[0].value === "RiverTrailUtils" &&
                                dot.children[1].value === "createArray") {
                            result = new Range(undefined, undefined, false);
                            break;
                        }

                        if (dot.children[0].typeInfo.isObjectType("ParallelArray") &&
                            (dot.children[1].value === "getShape")) {
                            result = new RangeArray(dot.children[0].typeInfo.properties.shape, function (val) { return new Range(val, val, true); });
                        } else {
                            result = new Range(undefined, undefined, false);
                        }
                        break;

                    default:
                        // functions arguments are always represented as double, so we have to enforce that
                        // here for all identifiers passed in to avoid later casts.
                        ast.children[1].children.forEach(function (v) { 
                                if (v.type === IDENTIFIER) {
                                    varEnv.lookup(v.value).forceInt(false);
                                }
                            });
                        if (intraFun) {
                            if (ast.callFrame) { // we have dispatch information available, so we can directly go there
                                var target = ast.callFrame.frame.ast; // grab the target instance

                                if (!target.rangeUpdate || (target.rangeUpdate < maxRangeUpdates)) {
                                    debug && console.log("inferring/updating range information for " + target.dispatch);
                                    var innerVEnv = new VarEnv();
                                    var updatedRI = false;
                                    if (!target.paramRanges) { target.paramRanges = []; }
                                    target.params.forEach(function (v, idx) { 
                                            if (target.paramRanges[idx]) {
                                                var oldRange = target.paramRanges[idx];
                                                var newRange = oldRange.union(ast.children[1].children[idx].rangeInfo);
                                                if (!oldRange.covers(newRange)) {
                                                  updatedRI = true;
                                                  target.paramRanges[idx] = newRange;
                                                }
                                            } else {
                                                updatedRI = true;
                                                target.paramRanges[idx] = ast.children[1].children[idx].rangeInfo.clone();
                                            }
                                            innerVEnv.update(v, target.paramRanges[idx]);
                                   });
                                   if (updatedRI) {
                                       target.rangeUpdate = (target.rangeUpdate || 0) + 1;
                                       drive(target.body, innerVEnv, true);
                                   }
                                } else if (target.rangeUpdate == maxRangeUpdates) {
                                    debug && console.log("neutralizing range information for " + target.dispatch);
                                    var innerVEnv = new VarEnv();
                                    target.params.forEach(function (v,idx) { 
                                            target.paramRanges[idx] = new Range(undefined, undefined, false);
                                            innerVEnv.update(v, target.paramRanges[idx]);
                                   });
                                   drive(target.body, innerVEnv, true);
                                   target.rangeUpdate++;
                                } 
                                // we do not yet propagate result ranges yet
                                result = new Range(undefined, undefined, false);
                            } else {
                                // this really should not happen
                                debug && console.log("missing callFrame");
                                result = new Range(undefined, undefined, false);
                            }
                        } else {
                            result = new Range(undefined, undefined, false);
                        }
                }
                break;

            // argument lists
            case LIST:      
                result = new RangeArray(ast.children, function (ast) { return drive(ast, varEnv, doAnnotate); });
                break;

            case CAST:
                // TODO: be more sensible here
                drive(ast.children[0], varEnv, doAnnotate);
                result = new Range(undefined, undefined, false);
                break;

            case FLATTEN:
                drive(ast.children[0], varEnv, doAnnotate);
                result = ast.children[0].rangeInfo.clone();
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
                reportError("break/continure)/labels not yet implemented", ast);
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
                result = new Range(undefined, undefined, false);
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

        annotateRangeInfo(ast, result, doAnnotate);
        if (debug && result) {
            console.log(RiverTrail.Helper.wrappedPP(ast) + " has range " + result.toString());
        }

        if (debug && (ast.type === SCRIPT)) {
            console.log("overall range map for SCRIPT node: " + ast.rangeSymbols.toString());
        }
        return result;
    }

        function analyze(ast, array, construct, rankOrShape, args) {
            var env = new VarEnv();
            var argoffset = 0;

            // add range info for index vector. 
            if (construct === "combine")  {
                var shape = array.getShape().slice(0,rankOrShape);
                var range = new RangeArray(shape, function (val) { return new Range(0, val - 1, true); });
                env.update(ast.params[0], range);
                argoffset = 1;
            } else if (construct === "comprehension") {
                var range = new RangeArray(rankOrShape, function (val) { return new Range(0, val - 1, true); });
                env.update(ast.params[0], range);
                argoffset = 1;
            } else if (construct === "comprehensionScalar") {
                var range = new Range(0, rankOrShape[0] - 1, true);
                env.update(ast.params[0], range);
                argoffset = 1;
            }
            // add empty range info for all arguments
            ast.params.forEach(function (v, idx) { 
                    if (idx >= argoffset) {
                        env.update(v, new Range(undefined, undefined, false));
                    }
                });

            try {
                drive(ast.body, env, true);
            } catch (e) {
                if ((e instanceof TypeError) || (e instanceof ReferenceError)) {
                    throw e;
                }
                console.log("range analysis failed: " + e.toString());
            }
            debug && console.log(env.toString());

            return ast;
        }

        //
        // Second phase: use range information to identify variables with integer storage class
        //

        // returns true of the OpenCL type can be stored as int
        function validIntRepresentation(type) {
            type = stripToBaseType(type);
            return (type === "int") || (type === "bool");
        }

        function isIntValue(ast) {
            return ast.rangeInfo && ((ast.rangeInfo instanceof RangeArray) ? ast.rangeInfo.isInt() : ast.rangeInfo.isInt);
        }

        function updateToNew(type, target) {
            debug && console.log("updating " + type.toString() + " to " + target);
            if (type.isNumberType()) {
                type.OpenCLType = target;
            } else if (type.isArrayishType()) {
                updateToNew(type.properties.elements, target);
                type.updateOpenCLType();
            } else if (type.isBoolType()) {
                // do nothing. bool and int work nicely together.
            } else {
                reportBug("update to new called on unsupported type");
            }
        }

        function makeCast(ast, type) {
            debug && console.log("casting " + RiverTrail.Helper.wrappedPP(ast) + " to " + type);
            if (ast.type === CAST) {
                /* we just eat the cast */
                return makeCast(ast.children[0], type);
            } else if (ast.type === ARRAY_INIT) {
                /* special case: we push the cast down to the values */
                ast.children.map(function (v) { return makeCast(v, type); });
                updateToNew(ast.typeInfo, type);
                return ast;
            } else {
                /* general case, we cast right here */
                var result = new Narcissus.parser.Node(ast.tokenizer);
                result.type = CAST;
                result.typeInfo = ast.typeInfo.clone();
                updateToNew(result.typeInfo, type);
                result.children = [ast];
                return result;
            }
        }

        function adaptStatusToRoot( expr, tEnv) {
            var result = false;

            switch (expr.type) {
                case IDENTIFIER:
                    result = validIntRepresentation(tEnv.lookup(expr.value).type.OpenCLType);
                    break;
                case INDEX:
                    result = adaptStatusToRoot(expr.children[0], tEnv);
                    break;
            }
            expr.rangeInfo.forceInt(result);

            return result;
        }

        function push(ast, tEnv, expectInt) {
            if (!ast) {
                reportBug("malformed syntax tree encountered.", ast);
            }

            if (!ast.type) {
                reportBug("missing type information in syntax tree.", ast);
            }

            switch (ast.type) {
                case SCRIPT:
                    // handle nested functions
                    ast.funDecls.forEach(function (f) {
                            push(f.body);
                        });
                    // update types of variable declarations based on range info
                    ast.varDecls.forEach( function (decl) {
                            var rangeInfo = ast.rangeSymbols.lookup(decl.value);
                            var typeInfo = ast.symbols.lookup(decl.value).type;
                            var makeInt = false;
                            if (rangeInfo) { // dead variables may not carry any range information
                                if (rangeInfo instanceof RangeArray) {
                                    makeInt = rangeInfo.isInt();
                                } else {
                                    makeInt = rangeInfo.isInt;
                                }
                            }
                            if (makeInt) {
                                // as we got a reference to the type in the environment, we
                                // can simply update it directly here
                                updateToNew(typeInfo, "int");
                            }
                    });
                    tEnv = ast.symbols;
                    // fallthrough
                case BLOCK:
                    ast.children = ast.children.map(function (ast) { return push(ast, tEnv, undefined); });
                    break;

                //
                // statements
                //
                case FUNCTION:
                    // this is not an applied occurence but the declaration, so we do not do anything here
                    break;
                case RETURN:
                    ast.value = push(ast.value, tEnv, false); // we always return floating point values
                    break;
                //
                // loops 
                //
                case FOR:
                    ast.setup = push(ast.setup, tEnv, undefined);
                    ast.update = push(ast.update, tEnv, undefined);
                    // fallthrough;
                case DO:
                    // fallthrough;
                case WHILE:
                    ast.condition = push(ast.condition, tEnv, undefined);
                    ast.body = push(ast.body, tEnv, undefined);
                    break;
                case IF:
                    ast.condition = push(ast.condition, tEnv, undefined);
                    ast.thenPart = push(ast.thenPart, tEnv, undefined);
                    if (ast.elsePart) {
                        ast.elsePart = push(ast.elsePart, tEnv, undefined);
                    }
                    break;
                case SEMICOLON:
                    if (ast.expression) {
                        ast.expression = push(ast.expression, tEnv, isIntValue(ast));
                    }
                    break;
                case VAR:
                case CONST:
                    ast.children = ast.children.map(function (ast) {
                                         // update type information on this node
                                         ast.typeInfo = tEnv.lookup(ast.value).type;
                                         if (ast.initializer) {
                                            if (isIntValue(ast) && (!validIntRepresentation(ast.typeInfo.OpenCLType))) {
                                                ast.initializer = push(ast.initializer, tEnv, false);
                                            } else {
                                                ast.initializer = push(ast.initializer, tEnv, isIntValue(ast));
                                            }
                                         }
                                         return ast;
                                     });
                    break;
                case ASSIGN:
                    // children[0] is the left hand side, children[1] is the right hand side.
                    // both can be expressions. 
                    switch (ast.children[0].type) {
                        case IDENTIFIER:
                            // simple case of a = expr
                            // we first update the type information for the lhs to the new global state. 
                            // It might be that we compute on int but the variable is a double. In such
                            // a case, we have to cast the expression to double.
                            ast.children[1] = push(ast.children[1], tEnv, isIntValue(ast.children[0]));
                            ast.children[0].typeInfo = tEnv.lookup(ast.children[0].value).type;
                            if (validIntRepresentation(ast.children[1].typeInfo.OpenCLType) && 
                                (!validIntRepresentation(ast.children[0].typeInfo.OpenCLType))) {
                                ast.children[1] = makeCast(ast.children[1], tEnv.openCLFloatType);
                            }
                            break;
                        case INDEX:
                            // first do the lhs expression. We do not care whether the lhs is int or not, we will adapt. We have to take
                            // special care for the case where the LHS's root has been demoted to double after the selection was processed.
                            // For this, we first adapt the integer status of the range information back from the root.
                            adaptStatusToRoot(ast.children[0], tEnv);
                            ast.children[0] = push(ast.children[0], tEnv, undefined);
                            // as above, we have to make sure that the types match...
                            if (validIntRepresentation(ast.children[1].typeInfo.OpenCLType) && 
                                (!validIntRepresentation(ast.children[0].typeInfo.OpenCLType))) {
                                ast.children[1] = makeCast(ast.children[1], tEnv.openCLFloatType);
                            }
                            ast.children[1] = push(ast.children[1], tEnv, isIntValue(ast.children[0]));
                        case DOT:
                            // we do not infer range information for objects 
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
                    // we only care about the last result
                    ast.children = ast.children.map(function (child, idx) { return push(child, tEnv, (idx === ast.children.length - 1) ? isIntValue(ast) : undefined);});
                    break;
                case HOOK:
                    // the hook (?) is badly designed. The first child is the condition, second child
                    // the then expression, third child the else expression
                    ast.children[0] = push(ast.children[0], tEnv, undefined);
                    ast.children[1] = push(ast.children[1], tEnv, isIntValue(ast));
                    ast.children[2] = push(ast.children[2], tEnv, isIntValue(ast));
                    break;
                    
                // binary operations on all literals
                case INCREMENT:
                case PLUS: 
                case DECREMENT:
                case MINUS:
                case MUL:
                case DIV:
                case MOD:    
                case NOT:
                case UNARY_PLUS:
                case UNARY_MINUS:
                    ast.children = ast.children.map( function (child) { return push(child, tEnv, isIntValue(ast)); });
                    break;

                // boolean operations: these do an implicit conversion to int. If either of the arguments is not int, we have
                //                     to cast the other to not int, too.
                case EQ:
                case NE:
                case STRICT_EQ:
                case STRICT_NE:
                case LT:
                case LE:
                case GE:
                case GT:
                case AND: 
                case OR:
                    ast.children = ast.children.map( function (child) { return push(child, tEnv, isIntValue(ast.children[0]) && isIntValue(ast.children[1])); });
                    break;

                // bitwise operations: these always require INT32 arguments
                case LSH:
                case RSH:
                case URSH:
                case BITWISE_NOT:
                case BITWISE_OR:
                case BITWISE_XOR:
                case BITWISE_AND:
                    ast.children = ast.children.map( function (child) { return push(child, tEnv, true); });
                    break;

                // literals
                case IDENTIFIER:
                case THIS:
                    ast.typeInfo = tEnv.lookup(ast.value).type;
                    // if the variable is a float but this expression is known to be 
                    // an int, we have to put a cast here
                    if (isIntValue(ast) && (!validIntRepresentation(ast.typeInfo.OpenCLType))) {
                        ast = makeCast(ast, "int");
                        ast.rangeInfo = ast.children[0].rangeInfo; // inherit range info
                    }
                    break;
                    break;
                case DOT:
                    ast.children[0] = push(ast.children[0], tEnv, undefined);
                    break;

                case NUMBER:
                    break;
                case TRUE:
                    break;
                case FALSE:
                    break;

                // array operations
                case INDEX:
                    ast.children[1] = push(ast.children[1], tEnv, true);
                    ast.children[0] = push(ast.children[0], tEnv, undefined);
                    break;

                case ARRAY_INIT:
                    // SAH: special case here: If we need the result of an ARRAY literal to be int, we propagate this
                    //      information into the elements. This saves us allocating space for the float array, which 
                    //      would be copied into the int array anyhow. Same holds true the other way round, so if we have 
                    //      an int array, but floats are expected, we propagate this on. 
                    //      The generic handler at the end of this function takes this into account, as well.
                    ast.children = ast.children.map(function (child) { return push(child, tEnv, isIntValue(ast) && expectInt);});
                    break;

                // function application
                case CALL:
                    switch (ast.children[0].type) {
                        case DOT:
                            // all method calls except "get" on PA expect floating point values.
                            var dot = ast.children[0];
                            if(dot.children[0].value === "RiverTrailUtils" &&
                                    dot.children[1].value === "createArray") {
                                ast.children[1].children[1] = push(ast.children[1].children[1], tEnv, false);
                                break;
                            }

                            // traverse the lhs of the dot. Although the result 
                            // is an object, there might be some other calls in 
                            // there that have constraints. child 1 is a name, 
                            // so nothing to traverse there.

                            dot.children[0] = push(dot.children[0], tEnv, undefined);
                            if (dot.children[0].typeInfo.isObjectType("ParallelArray") &&
                                (dot.children[1].value === "get")) {
                                ast.children[1] = push(ast.children[1], tEnv, true); 
                                break;
                            } 
                            // fallthrough;
                        default:
                            // TODO: handle nested functions!
                            ast.children[1] = push(ast.children[1], tEnv, false); // all arguments are floats
                    }
                    break;

                // argument lists
                case LIST:      
                    ast.children = ast.children.map(function (ast) { return push(ast, tEnv, expectInt); });
                    break;

                case CAST:
                    ast.children[0] = push(ast.children[0], tEnv, isIntValue(ast));
                    break;

                case FLATTEN:
                    ast.children[0] = push(ast.children[0], tEnv, expectInt);
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
                    ast.children[1].children[1] = push(ast.children[1].children[1], tEnv, false);
                    break;
                case PROPERTY_INIT:
                    ast.children[1] = push(ast.children[1], tEnv, false);
                    break;
                case OBJECT_INIT:
                    for(var idx in ast.children) {
                        ast.children[idx] = push(ast.children[idx], tEnv, false);
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

            // postprocess all but LIST nodes.
            if (ast.type !== LIST) {
                if (isIntValue(ast)) {
                    if (ast.type !== ARRAY_INIT) {
                        // change type information to be int
                        ast.typeInfo && updateToNew(ast.typeInfo, "int");
                        // if the node one level up cannot live with int, cast to a float representation
                        if (expectInt === false) {
                            ast = makeCast(ast, tEnv.openCLFloatType);
                        }
                    } else {
                        // SAH: special case for array literals: we propagate the double requirement to
                        //      the elements, so those will already be doubles or CAST nodes.
                        updateToNew(ast.typeInfo.properties.elements, (expectInt ? "int" : tEnv.openCLFloatType));
                        ast.typeInfo.updateOpenCLType();
                    }
                } else {
                    if (expectInt && !validIntRepresentation(ast.typeInfo.OpenCLType)) {
                        if (ast.type !== ARRAY_INIT) {
                            var newAst = new Narcissus.parser.Node(ast.tokenizer);
                            newAst.type = TOINT32;
                            newAst.typeInfo = ast.typeInfo.clone();
                            updateToNew(newAst.typeInfo, "int");
                            newAst.rangeInfo = ast.rangeInfo.clone(); // if we have valid range info, TOINT32 will preserve it
                            newAst.children[0] = ast;
                            ast = newAst;
                        } else {
                            // SAH: special case for array literals: we propagate the int requirement to
                            //      the elements, so those will already be int or calls to TOINT32.
                            updateToNew(ast.typeInfo.properties.elements, "int");
                            ast.typeInfo.updateOpenCLType();
                        }
                    }
                }
            }

            return ast;
        }

        function propagate(ast) {
            return push(ast.body, null, undefined);
        }

        return {
            "analyze" : analyze,
            "propagate" : propagate
        };
}();
