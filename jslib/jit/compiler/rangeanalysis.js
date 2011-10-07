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

    const debug = false;

    const RANGE_MAX = 2147483647;
    const RANGE_MIN = -2147483647;

    //
    // error reporting
    //
    function reportError(msg, t) {
        throw "Error: " + msg + " <" + (t ? RiverTrail.Helper.wrappedPP(t) : "no context") + ">"; // could be more elaborate
    }
    function reportBug(msg, t) {
        throw "Bug: " + msg; // could be more elaborate
    }

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
                mine.intersect(other);
            }
        }
    };
    CTSp.merge = function (other) {
        for (name in other.bindings) {
            this.add(other.bindings[name]);
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
    Rp.intersect = function (val) {
        return new Range((this.lb === undefined) ? val.lb : ((val.lb === undefined) ? this.lb : Math.max(this.lb, val.lb)),
                         (this.ub === undefined) ? val.ub : ((val.ub === undefined) ? this.ub : Math.min(this.ub, val.ub)),
                         this.isInt && val.isInt);
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
        return ((this.lb === other.lb) || (this.lb < other.lb)) &&
               ((this.ub === other.ub) || (this.ub > other.ub));
    };
    Rp.clone = function () {
        return new Range(this.lb, this.ub, this.isInt);
    };
    Rp.toString = function () {
        return "[" + ((this.lb !== undefined) ? this.lb.toString() : "--") + "," + ((this.ub !== undefined) ? this.ub.toString() : "--") + "]<" + (this.isInt ? "int" : "fp") + ">";
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
            if (current instanceof Array) {
                (range instanceof Array) || reportBug("update of array range with scalar range?");
                this.bindings[name] = current.map(function (val, idx) { return range[idx].clone(); });
            } else {
                !(range instanceof Array) || reportBug("update of scalar range with array range?");
                this.bindings[name] = range.clone();
            }
        } else {
            this.bindings[name] = range;
        }
        debug && console.log(name + " updated to " + this.bindings[name].toString());
        if (name === "offX"){
            var k ="debug here";
        }
    };
    VEp.apply = function (name, constraint) {
        var current = this.lookup(name);
        if (constraint instanceof Array) {
            if (current) {
                this.bindings[name] = current.map(function (val,idx) { return val.intersect(constraint[idx]); });
            } else {
                this.bindings[name] = constraint.map(function (val) { return new Range(val.lb, val.ub); });
            }
        } else {
            if (current) {
                this.bindings[name] = current.intersect(constraint);
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
                this.bindings[name] = current.map(function (val,idx) { return val.force(constraint[idx]); });
            } else {
                this.bindings[name] = constraint.map(function (val) { return new Range(val.lb, val.ub); });
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
            var constraint = constraints.lookup(name);
            this.apply(name, constraints.lookup(name));
        }
    }
    VEp.enforceConstraints = function (constraints) {
        for (var name in constraints.bindings) {
            var constraint = constraints.lookup(name);
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
    VEp.invalidate = function () {
        for (var name in this.bindings) {
            if (this.bindings[name] instanceof Array) {
                this.bindings[name] = this.bindings[name].map( function (v) { return new Range(undefined, undefined, false); });
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

    //
    // The abstract interpretation uses the following signature
    //   (source, variable bindings, current constraint set, constraint to assign, inverse constraints) -> range information
    // The last two arguments might be undefined
    function drive(ast, varEnv, constraints, constraintAccu, inverse) {
        var result;

        if (!ast) {
            throw "Oppsie";
        }

        if (!ast.type) {
            throw "Oppsie";
        }

        switch (ast.type) {
            case SCRIPT:
                varEnv = new VarEnv(varEnv);
                ast.rangeSymbols = varEnv;
                // fallthrough
            case BLOCK:
                ast.children.forEach(function (ast) { drive(ast, varEnv); });
                break;

            //
            // statements
            //
            case FUNCTION:
                // this is not an applied occurence but the declaration, so we do not do anything here
                break;
            case RETURN:
                result = drive(ast.value, varEnv);
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
                drive(ast.body, varEnv);
                // fallthrough;
            case FOR:
                // setup is run once
                if (ast.setup) {
                    drive(ast.setup, varEnv);
                }
                // fallthrough;
            case WHILE:
                // constraints are true for the body only. Furthermore, we disallow effects on variables
                // in the predicate for now. To catch this, use a new VE.
                var bodyC = new Constraints();
                var predVE = new VarEnv(varEnv);
                drive(ast.condition, predVE, bodyC);
                // the body is only evaluated if the constraints hold, so its effects might not be visible
                // in the exit path
                var bodyVE = new VarEnv(varEnv);
                bodyVE.enforceConstraints(bodyC); 
                drive(ast.body, bodyVE);
                // now we execute the update, if we have one
                if (ast.update) {
                    drive(ast.update, bodyVE);
                }
                // now we do a second pass of the body to see whether the ranges we have cover
                // further iterations
                var bodyVE2 = new VarEnv(bodyVE);
                bodyVE2.enforceConstraints(bodyC);
                drive(ast.body, bodyVE2);
                // the second iteration includes the update, as this happens
                // before we exit
                if (ast.update) {
                    drive(ast.update, bodyVE2);
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
                    drive(ast.condition, bodyVE);
                    drive(ast.body, bodyVE);
                    if (ast.update) {
                        drive(ast.update, bodyVE);
                    }
                } else {
                    // we need to propagate what we have found to the conditional, too
                    drive(ast.condition, bodyVE);
                }
                // Take the union of both execution paths, as we never know which one is taken
                varEnv.merge(bodyVE);
                break;
            case IF:
                var predC = new Constraints();
                drive(ast.condition, varEnv, predC);
                var thenVE = new VarEnv(varEnv);
                thenVE.applyConstraints(predC);
                drive(ast.thenPart, thenVE);
                var predCE = new Constraints();
                drive(ast.condition, varEnv, predCE, undefined, true); // compute inverse
                var elseVE = new VarEnv(varEnv);
                elseVE.applyConstraints(predCE);
                if (ast.elsePart) {
                    // we can just use the main env for this alternative path as 
                    // the join in the end will keep whatever we have found if it
                    // is not present in the other part.
                    drive(ast.elsePart, elseVE);
                }
                thenVE.merge(elseVE);
                varEnv.merge(thenVE);
                break;
            case SEMICOLON:
                result = drive(ast.expression, varEnv);
                break;
            case VAR:
            case CONST:
                ast.children.forEach(function (ast) {
                                         if (ast.initializer) {
                                             varEnv.update(ast.value, drive(ast.initializer, varEnv));
                                         }
                                         ast.rangeInfo = varEnv.lookup(ast.value);
                                     });
                break;
            case ASSIGN:
                // children[0] is the left hand side, children[1] is the right hand side.
                // both can be expressions. 
                drive(ast.children[0], varEnv);
                var right = drive(ast.children[1], varEnv);
                switch (ast.children[0].type) {
                    case IDENTIFIER:
                        // simple case of a = expr
                        varEnv.update(ast.children[0].value, right);
                        ast.children[0].rangeInfo = right.clone();
                        result = right; // assignment yields the rhs as value
                        break;
                    case INDEX:
                        throw "handle me"; 
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
                ast.children.forEach(function (ast) { result = drive(ast, varEnv, constraints, constraintAccu);});
                break;
            case HOOK:
                // the hook (?) is badly designed. The first child is the condition, second child
                // the then expression, third child the else expression
                var predC = new Constraints();
                drive(ast.children[0], varEnv, predC);
                var thenVE = new VarEnv(varEnv);
                thenVE.applyConstraints(predC);
                drive(ast.children[1], thenVE); // we do not forward constraints here, nor collect new ones, as we do 
                drive(ast.children[2], varEnv); // not know which branch will be taken
                varEnv.merge(thenVE);
                break;
                
            // binary operations on all literals
            case INCREMENT:
            case PLUS: 
                var left = drive(ast.children[0], varEnv);
                if (ast.children[1]) {
                    var right = drive(ast.children[1], varEnv);
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
                var left = drive(ast.children[0], varEnv);
                if (ast.children[1]) {
                    var right = drive(ast.children[1], varEnv);
                } else {
                    var right = new Range(1,1, true);
                }
                result = left.map( right, function (a,b) { return a-b; }, left.isInt && right.isInt); 
                if (!ast.children[1]) { // DECREMENT
                    varEnv.update(ast.children[0].value, result);
                }
                break;
            case MUL:
                var left = drive(ast.children[0], varEnv);
                var right = drive(ast.children[1], varEnv);
                if ((left.lb >= 0) && (left.ub >= 0) && (right.lb >= 0) && (right.ub >= 0)) {
                    result = left.map( right, function (a,b) { return a*b; }, left.isInt && right.isInt);
                } else {
                    // TODO: add all the special cases
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
                var right = drive(ast.children[1], varEnv, constraints, undefined, inverse); // grab rhs range
                var left = drive(ast.children[0], varEnv, constraints, {"type" : ast.type, "range" : right, "inverse" : inverse}, inverse); // apply constraint to lhs
                result = new Range(0, 1, true); // result is a bool
                break;

            // we do not implement these yet
            case BITWISE_OR:
            case BITWISE_XOR:
            case BITWISE_AND:
            case LSH:
            case RSH:
            case URSH:
            case DIV:
            case MOD:    
                var left = drive(ast.children[0], varEnv);
                var right = drive(ast.children[1], varEnv);
                result = new Range(undefined, undefined, false);
                break;

            // binary operators on bool
            case AND: 
            case OR:
                if (((ast.type === AND) && !inverse) ||
                    ((ast.type === OR ) && inverse)) { // merge both branches
                    drive(ast.children[0], varEnv, constraints, undefined, inverse);
                    drive(ast.children[1], varEnv, constraints, undefined, inverse);
                } else { // intersect branches
                    var leftC = new Constraints();
                    drive(ast.children[0], varEnv, leftC, undefined, inverse);
                    var rightC = new Constraints();
                    drive(ast.children[1], varEnv, rightC, undefined, inverse);
                    leftC.intersect(rightC);
                    constraints.merge(leftC);
                }
                result = new Range(0, 1, true); // the result is a boolean :)
                break;
            // unary functions on all literals
            case NOT:
                drive(ast.children[0], varEnv, constraints, undefined, !inverse); 
                result = new Range(0, 1, true); // the result is a boolean :)
                break;
            case UNARY_PLUS:
                result = drive(ast.children[0], varEnv);
                break;
            case UNARY_MINUS:
                var left = drive(ast.children[0], varEnv);
                result = new Range((left.ub === undefined) ? undefined : -left.ub,
                                   (left.lb === undefined) ? undefined : -left.lb,
                                   left.isInt);
                break;
            case BITWISE_NOT:
                drive(ast.children[0], varEnv);
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
                // we support array.length and PA.getShape() as it is somewhat a common loop bound. Could be more elaborate
                drive(ast.children[0], varEnv);
                //drive(ast.children[1], varEnv); // this needs to be an identifier, so no need to range infer it
                if ((ast.children[1].value === "length") &&
                    ((ast.children[0].typeInfo.isObjectType("Array") ||
                      ast.children[0].typeInfo.isObjectType("ParallelArray")))) {
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
                var index = drive(ast.children[1], varEnv);
                var array = drive(ast.children[0], varEnv);
                // special case for selecting elements from the index vector
                if (index.fixedValue()) {
                    if (constraintAccu && constraints && (ast.children[0].type === IDENTIFIER)) { // we have new constraint information to assign
                        constraints.addAccu(ast.children[0].value, constraintAccu, index.lb, ast.children[0].typeInfo.properties.shape[0]);
                    }
                    if (array && (array instanceof Array)) { // undefined results are always scalar, so we have to check here
                        result = array[index.lb];
                    } 
                } 
                if (!result) {
                    result = new Range(undefined, undefined, false);
                }
                break;

            case ARRAY_INIT:
                result = ast.children.map(function (ast) { return drive(ast, varEnv);});
                break;

            // function application
            case CALL:
                drive(ast.children[0], varEnv);
                drive(ast.children[1], varEnv);
                switch (ast.children[0].type) {
                    case DOT:
                        // we support getShape on Parallel Arrays, as it is a common bound for
                        // loops
                        var dot = ast.children[0];
                        if (dot.children[0].typeInfo.isObjectType("ParallelArray") &&
                            (dot.children[1].value === "getShape")) {
                            result = dot.children[0].typeInfo.properties.shape.map( function (val) { return new Range(val, val, true); });
                        } else {
                            result = new Range(undefined, undefined, false);
                        }
                        break;

                    default:
                        // TODO: handle nested functions!
                        result = new Range(undefined, undefined, false);
                }
                break;

            // argument lists
            case LIST:      
                result = ast.children.map(function (ast) { return drive(ast, varEnv); });
                break;

            case CAST:
                // TODO: be more sensible here
                drive(ast.children[0], varEnv);
                result = new Range(undefined, undefined, false);
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

        ast.rangeInfo = result;
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

        // add range info for index vector. 
        if (construct === "combine")  {
            var shape = array.getShape().slice(0,rankOrShape);
            var range = shape.map(function (val) { return new Range(0, val - 1, true); });
            env.update(ast.params[0], range);
        } else if (construct === "comprehension") {
            var range = rankOrShape.map(function (val) { return new Range(0, val - 1, true); });
            env.update(ast.params[0], range);
        } else if (construct === "comprehensionScalar") {
            var range = new Range(0, rankOrShape[0] - 1, true);
            env.update(ast.params[0], range);
        }

        try {
            drive(ast.body, env);
        } catch (e) {
            if ((e instanceof TypeError) || (e instanceof ReferenceError)) {
                throw e;
            }
            debug && console.log(e.toString());
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
        return ast.rangeInfo && ((ast.rangeInfo instanceof Array) ? ast.rangeInfo.every( function (r) { return r.isInt; }) : ast.rangeInfo.isInt);
    }

    function updateToNew(type, target) {
        if (type.isNumberType()) {
            type.OpenCLType = target;
        } else if (type.isObjectType("Array")) {
            updateToNew(type.properties.elements, target);
            type.updateOpenCLType();
        } else if (type.isBoolType()) {
            // do nothing. bool and int work nicely together.
        } else {
            reportBug("update to new called on unsupported type");
        }
    }

    function makeCast(ast, type) {
        var result = new Narcissus.parser.Node(ast.tokenizer);
        result.type = CAST;
        result.typeInfo = ast.typeInfo.clone();
        updateToNew(result.typeInfo, type);
        result.children = [ast];
        return result;
    }

    function push(ast, tEnv, expectInt) {
        if (!ast) {
            throw "Oppsie";
        }

        if (!ast.type) {
            throw "Oppsie";
        }

        switch (ast.type) {
            case SCRIPT:
                // update types of variable declarations based on range info
                ast.varDecls.forEach( function (decl) {
                        var rangeInfo = ast.rangeSymbols.lookup(decl.value);
                        var typeInfo = ast.symbols.lookup(decl.value).type;
                        var makeInt = false;
                        if (rangeInfo) { // dead variables may not carry any range information
                            if (rangeInfo instanceof Array) {
                                makeInt = rangeInfo.every( function (info) { return info.isInt; });
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
                ast.expression = push(ast.expression, tEnv, isIntValue(ast));
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
                ast.children[1] = push(ast.children[1], tEnv, isIntValue(ast.children[0]));
                switch (ast.children[0].type) {
                    case IDENTIFIER:
                        // simple case of a = expr
                        // It might be that we compute on int but the variable is a double. In such
                        // a case, we have to cast and update the variable's type information.
                        ast.children[0].typeInfo = tEnv.lookup(ast.children[0].value).type;
                        if (isIntValue(ast.children[1]) && (!validIntRepresentation(ast.children[0].typeInfo.OpenCLType))) {
                            ast = makeCast(ast, "int");
                        }
                        break;
                    case INDEX:
                        throw "handle me"; 
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
                //      would be copied into the int array anyhow. The generic handler at the end of this
                //      function takes this into account, as well.
                ast.children = ast.children.map(function (child) { return push(child, tEnv, isIntValue(ast) || expectInt);});
                break;

            // function application
            case CALL:
                switch (ast.children[0].type) {
                    case DOT:
                        // all method calls except "get" on PA expect floating point values.
                        var dot = ast.children[0];
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

        // postprocess all but LIST nodes.
        if (ast.type !== LIST) {
            if (isIntValue(ast)) {
                // change type information to be int
                ast.typeInfo && updateToNew(ast.typeInfo, "int");
                // if the node one level up cannot live with int, cast to a float representation
                if (expectInt === false) {
                    ast = makeCast(ast, tEnv.openCLFloatType);
                }
            } else {
                if (expectInt) {
                    if (ast.type !== ARRAY_INIT) {
                        var newAst = new Narcissus.parser.Node(ast.tokenizer);
                        newAst.type = TOINT32;
                        newAst.typeInfo = ast.typeInfo.clone();
                        updateToNew(newAst.typeInfo, "int");
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
