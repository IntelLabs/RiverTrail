/* File jit/narcissus/jsdefs.js*/
/* vim: set sw=4 ts=4 et tw=78: */
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Narcissus JavaScript engine.
 *
 * The Initial Developer of the Original Code is
 * Brendan Eich <brendan@mozilla.org>.
 * Portions created by the Initial Developer are Copyright (C) 2004
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Tom Austin <taustin@ucsc.edu>
 *   Brendan Eich <brendan@mozilla.org>
 *   Shu-Yu Guo <shu@rfrn.org>
 *   Dave Herman <dherman@mozilla.com>
 *   Dimitris Vardoulakis <dimvar@ccs.neu.edu>
 *   Patrick Walton <pcwalton@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/*
 * Narcissus - JS implemented in JS.
 *
 * Well-known constants and lookup tables.  Many consts are generated from the
 * tokens table via eval to minimize redundancy, so consumers must be compiled
 * separately to take advantage of the simple switch-case constant propagation
 * done by SpiderMonkey.
 */

(function() {

    var narcissus = {
        options: {
            version: 185,
            // Global variables to hide from the interpreter
            hiddenHostGlobals: { Narcissus: true },
            // Desugar SpiderMonkey language extensions?
            desugarExtensions: false,
            // Allow HTML comments?
            allowHTMLComments: false
        },
        hostSupportsEvalConst: (function() {
            try {
                return eval("(function(s) { eval(s); return x })('const x = true;')");
            } catch (e) {
                return false;
            }
        })(),
        hostGlobal: this
    };
    Narcissus = narcissus;
})();

Narcissus.definitions = (function(hostGlobal) {

    var tokens = [
        // End of source.
        "END",

        // Operators and punctuators.  Some pair-wise order matters, e.g. (+, -)
        // and (UNARY_PLUS, UNARY_MINUS).
        "\n", ";",
        ",",
        "=",
        "?", ":", "CONDITIONAL",
        "||",
        "&&",
        "|",
        "^",
        "&",
        "==", "!=", "===", "!==",
        "<", "<=", ">=", ">",
        "<<", ">>", ">>>",
        "+", "-",
        "*", "/", "%",
        "!", "~", "UNARY_PLUS", "UNARY_MINUS",
        "++", "--",
        ".",
        "[", "]",
        "{", "}",
        "(", ")",

        // Nonterminal tree node type codes.
        "SCRIPT", "BLOCK", "LABEL", "FOR_IN", "CALL", "NEW_WITH_ARGS", "INDEX",
        "ARRAY_INIT", "OBJECT_INIT", "PROPERTY_INIT", "GETTER", "SETTER",
        "GROUP", "LIST", "LET_BLOCK", "ARRAY_COMP", "GENERATOR", "COMP_TAIL",

        // Terminals.
        "IDENTIFIER", "NUMBER", "STRING", "REGEXP",

        // Keywords.
        "break",
        "case", "catch", "const", "continue",
        "debugger", "default", "delete", "do",
        "else", "export",
        "false", "finally", "for", "function",
        "if", "import", "in", "instanceof",
        "let", "module",
        "new", "null",
        "return",
        "switch",
        "this", "throw", "true", "try", "typeof",
        "var", "void",
        "yield",
        "while", "with",
    ];

    var statementStartTokens = [
        "break",
        "const", "continue",
        "debugger", "do",
        "for",
        "if",
        "return",
        "switch",
        "throw", "try",
        "var",
        "yield",
        "while", "with",
    ];

    // Whitespace characters (see ECMA-262 7.2)
    var whitespaceChars = [
        // normal whitespace:
        "\u0009", "\u000B", "\u000C", "\u0020", "\u00A0", "\uFEFF",

        // high-Unicode whitespace:
        "\u1680", "\u180E",
        "\u2000", "\u2001", "\u2002", "\u2003", "\u2004", "\u2005", "\u2006",
        "\u2007", "\u2008", "\u2009", "\u200A",
        "\u202F", "\u205F", "\u3000"
    ];

    var whitespace = {};
    for (var i = 0; i < whitespaceChars.length; i++) {
        whitespace[whitespaceChars[i]] = true;
    }

    // Operator and punctuator mapping from token to tree node type name.
    // NB: because the lexer doesn't backtrack, all token prefixes must themselves
    // be valid tokens (e.g. !== is acceptable because its prefixes are the valid
    // tokens != and !).
    var opTypeNames = {
        '\n':   "NEWLINE",
        ';':    "SEMICOLON",
        ',':    "COMMA",
        '?':    "HOOK",
        ':':    "COLON",
        '||':   "OR",
        '&&':   "AND",
        '|':    "BITWISE_OR",
        '^':    "BITWISE_XOR",
        '&':    "BITWISE_AND",
        '===':  "STRICT_EQ",
        '==':   "EQ",
        '=':    "ASSIGN",
        '!==':  "STRICT_NE",
        '!=':   "NE",
        '<<':   "LSH",
        '<=':   "LE",
        '<':    "LT",
        '>>>':  "URSH",
        '>>':   "RSH",
        '>=':   "GE",
        '>':    "GT",
        '++':   "INCREMENT",
        '--':   "DECREMENT",
        '+':    "PLUS",
        '-':    "MINUS",
        '*':    "MUL",
        '/':    "DIV",
        '%':    "MOD",
        '!':    "NOT",
        '~':    "BITWISE_NOT",
        '.':    "DOT",
        '[':    "LEFT_BRACKET",
        ']':    "RIGHT_BRACKET",
        '{':    "LEFT_CURLY",
        '}':    "RIGHT_CURLY",
        '(':    "LEFT_PAREN",
        ')':    "RIGHT_PAREN"
    };

    // Hash of keyword identifier to tokens index.  NB: we must null __proto__ to
    // avoid toString, etc. namespace pollution.
    var keywords = {__proto__: null};

    // Define const END, etc., based on the token names.  Also map name to index.
    var tokenIds = {};

    // Building up a string to be eval'd in different contexts.
    var consts = Narcissus.hostSupportsEvalConst ? "const " : "var ";
    for (var i = 0, j = tokens.length; i < j; i++) {
        if (i > 0)
            consts += ", ";
        var t = tokens[i];
        var name;
        if (/^[a-z]/.test(t)) {
            name = t.toUpperCase();
            keywords[t] = i;
        } else {
            name = (/^\W/.test(t) ? opTypeNames[t] : t);
        }
        consts += name + " = " + i;
        tokenIds[name] = i;
        tokens[t] = i;
    }
    consts += ";";

    var isStatementStartCode = {__proto__: null};
    for (i = 0, j = statementStartTokens.length; i < j; i++)
        isStatementStartCode[keywords[statementStartTokens[i]]] = true;

    // Map assignment operators to their indexes in the tokens array.
    var assignOps = ['|', '^', '&', '<<', '>>', '>>>', '+', '-', '*', '/', '%'];

    for (i = 0, j = assignOps.length; i < j; i++) {
        t = assignOps[i];
        assignOps[t] = tokens[t];
    }

    function defineGetter(obj, prop, fn, dontDelete, dontEnum) {
        Object.defineProperty(obj, prop,
                              { get: fn, configurable: !dontDelete, enumerable: !dontEnum });
    }

    function defineGetterSetter(obj, prop, getter, setter, dontDelete, dontEnum) {
        Object.defineProperty(obj, prop, {
            get: getter,
            set: setter,
            configurable: !dontDelete,
            enumerable: !dontEnum
        });
    }

    function defineMemoGetter(obj, prop, fn, dontDelete, dontEnum) {
        Object.defineProperty(obj, prop, {
            get: function() {
                var val = fn();
                defineProperty(obj, prop, val, dontDelete, true, dontEnum);
                return val;
            },
            configurable: true,
            enumerable: !dontEnum
        });
    }

    function defineProperty(obj, prop, val, dontDelete, readOnly, dontEnum) {
        Object.defineProperty(obj, prop,
                              { value: val, writable: !readOnly, configurable: !dontDelete,
                                enumerable: !dontEnum });
    }

    // Returns true if fn is a native function.  (Note: SpiderMonkey specific.)
    function isNativeCode(fn) {
        // Relies on the toString method to identify native code.
        return ((typeof fn) === "function") && fn.toString().match(/\[native code\]/);
    }

    var Fpapply = Function.prototype.apply;

    function apply(f, o, a) {
        return Fpapply.call(f, [o].concat(a));
    }

    var applyNew;

    // ES5's bind is a simpler way to implement applyNew
    if (Function.prototype.bind) {
        applyNew = function applyNew(f, a) {
            return new (f.bind.apply(f, [,].concat(a)))();
        };
    } else {
        applyNew = function applyNew(f, a) {
            switch (a.length) {
              case 0:
                return new f();
              case 1:
                return new f(a[0]);
              case 2:
                return new f(a[0], a[1]);
              case 3:
                return new f(a[0], a[1], a[2]);
              default:
                var argStr = "a[0]";
                for (var i = 1, n = a.length; i < n; i++)
                    argStr += ",a[" + i + "]";
                return eval("new f(" + argStr + ")");
            }
        };
    }

    function getPropertyDescriptor(obj, name) {
        while (obj) {
            if (({}).hasOwnProperty.call(obj, name))
                return Object.getOwnPropertyDescriptor(obj, name);
            obj = Object.getPrototypeOf(obj);
        }
    }

    function getPropertyNames(obj) {
        var table = Object.create(null, {});
        while (obj) {
            var names = Object.getOwnPropertyNames(obj);
            for (var i = 0, n = names.length; i < n; i++)
                table[names[i]] = true;
            obj = Object.getPrototypeOf(obj);
        }
        return Object.keys(table);
    }

    function getOwnProperties(obj) {
        var map = {};
        for (var name in Object.getOwnPropertyNames(obj))
            map[name] = Object.getOwnPropertyDescriptor(obj, name);
        return map;
    }

    function blacklistHandler(target, blacklist) {
        var mask = Object.create(null, {});
        var redirect = Dict.create(blacklist).mapObject(function(name) { return mask; });
        return mixinHandler(redirect, target);
    }

    function whitelistHandler(target, whitelist) {
        var catchall = Object.create(null, {});
        var redirect = Dict.create(whitelist).mapObject(function(name) { return target; });
        return mixinHandler(redirect, catchall);
    }

    function mirrorHandler(target, writable) {
        var handler = makePassthruHandler(target);

        var defineProperty = handler.defineProperty;
        handler.defineProperty = function(name, desc) {
            if (!desc.enumerable)
                throw new Error("mirror property must be enumerable");
            if (!desc.configurable)
                throw new Error("mirror property must be configurable");
            if (desc.writable !== writable)
                throw new Error("mirror property must " + (writable ? "" : "not ") + "be writable");
            defineProperty(name, desc);
        };

        handler.fix = function() { };
        handler.getOwnPropertyDescriptor = handler.getPropertyDescriptor;
        handler.getOwnPropertyNames = getPropertyNames.bind(handler, target);
        handler.keys = handler.enumerate;
        handler["delete"] = function() { return false; };
        handler.hasOwn = handler.has;
        return handler;
    }

    /*
     * Mixin proxies break the single-inheritance model of prototypes, so
     * the handler treats all properties as own-properties:
     *
     *                  X
     *                  |
     *     +------------+------------+
     *     |                 O       |
     *     |                 |       |
     *     |  O         O    O       |
     *     |  |         |    |       |
     *     |  O    O    O    O       |
     *     |  |    |    |    |       |
     *     |  O    O    O    O    O  |
     *     |  |    |    |    |    |  |
     *     +-(*)--(w)--(x)--(y)--(z)-+
     */

    function mixinHandler(redirect, catchall) {
        function targetFor(name) {
            return hasOwn(redirect, name) ? redirect[name] : catchall;
        }

        function getMuxPropertyDescriptor(name) {
            var desc = getPropertyDescriptor(targetFor(name), name);
            if (desc)
                desc.configurable = true;
            return desc;
        }

        function getMuxPropertyNames() {
            var names1 = Object.getOwnPropertyNames(redirect).filter(function(name) {
                return name in redirect[name];
            });
            var names2 = getPropertyNames(catchall).filter(function(name) {
                return !hasOwn(redirect, name);
            });
            return names1.concat(names2);
        }

        function enumerateMux() {
            var result = Object.getOwnPropertyNames(redirect).filter(function(name) {
                return name in redirect[name];
            });
            for (name in catchall) {
                if (!hasOwn(redirect, name))
                    result.push(name);
            };
            return result;
        }

        function hasMux(name) {
            return name in targetFor(name);
        }

        return {
            getOwnPropertyDescriptor: getMuxPropertyDescriptor,
            getPropertyDescriptor: getMuxPropertyDescriptor,
            getOwnPropertyNames: getMuxPropertyNames,
            defineProperty: function(name, desc) {
                Object.defineProperty(targetFor(name), name, desc);
            },
            "delete": function(name) {
                var target = targetFor(name);
                return delete target[name];
            },
            // FIXME: ha ha ha
            fix: function() { },
            has: hasMux,
            hasOwn: hasMux,
            get: function(receiver, name) {
                var target = targetFor(name);
                return target[name];
            },
            set: function(receiver, name, val) {
                var target = targetFor(name);
                target[name] = val;
                return true;
            },
            enumerate: enumerateMux,
            keys: enumerateMux
        };
    }

    function makePassthruHandler(obj) {
        // Handler copied from
        // http://wiki.ecmascript.org/doku.php?id=harmony:proxies&s=proxy%20object#examplea_no-op_forwarding_proxy
        return {
            getOwnPropertyDescriptor: function(name) {
                var desc = Object.getOwnPropertyDescriptor(obj, name);

                // a trapping proxy's properties must always be configurable
                desc.configurable = true;
                return desc;
            },
            getPropertyDescriptor: function(name) {
                var desc = getPropertyDescriptor(obj, name);

                // a trapping proxy's properties must always be configurable
                desc.configurable = true;
                return desc;
            },
            getOwnPropertyNames: function() {
                return Object.getOwnPropertyNames(obj);
            },
            defineProperty: function(name, desc) {
                Object.defineProperty(obj, name, desc);
            },
            "delete": function(name) { return delete obj[name]; },
            fix: function() {
                if (Object.isFrozen(obj)) {
                    return getOwnProperties(obj);
                }

                // As long as obj is not frozen, the proxy won't allow itself to be fixed.
                return undefined; // will cause a TypeError to be thrown
            },

            has: function(name) { return name in obj; },
            hasOwn: function(name) { return ({}).hasOwnProperty.call(obj, name); },
            get: function(receiver, name) { return obj[name]; },

            // bad behavior when set fails in non-strict mode
            set: function(receiver, name, val) { obj[name] = val; return true; },
            enumerate: function() {
                var result = [];
                for (name in obj) { result.push(name); };
                return result;
            },
            keys: function() { return Object.keys(obj); }
        };
    }

    var hasOwnProperty = ({}).hasOwnProperty;

    function hasOwn(obj, name) {
        return hasOwnProperty.call(obj, name);
    }

    function Dict(table, size) {
        this.table = table || Object.create(null, {});
        this.size = size || 0;
    }

    Dict.create = function(table) {
        var init = Object.create(null, {});
        var size = 0;
        var names = Object.getOwnPropertyNames(table);
        for (var i = 0, n = names.length; i < n; i++) {
            var name = names[i];
            init[name] = table[name];
            size++;
        }
        return new Dict(init, size);
    };

    Dict.prototype = {
        has: function(x) { return hasOwnProperty.call(this.table, x); },
        set: function(x, v) {
            if (!hasOwnProperty.call(this.table, x))
                this.size++;
            this.table[x] = v;
        },
        get: function(x) { return this.table[x]; },
        getDef: function(x, thunk) {
            if (!hasOwnProperty.call(this.table, x)) {
                this.size++;
                this.table[x] = thunk();
            }
            return this.table[x];
        },
        forEach: function(f) {
            var table = this.table;
            for (var key in table)
                f.call(this, key, table[key]);
        },
        map: function(f) {
            var table1 = this.table;
            var table2 = Object.create(null, {});
            this.forEach(function(key, val) {
                table2[key] = f.call(this, val, key);
            });
            return new Dict(table2, this.size);
        },
        mapObject: function(f) {
            var table1 = this.table;
            var table2 = Object.create(null, {});
            this.forEach(function(key, val) {
                table2[key] = f.call(this, val, key);
            });
            return table2;
        },
        toObject: function() {
            return this.mapObject(function(val) { return val; });
        },
        choose: function() {
            return Object.getOwnPropertyNames(this.table)[0];
        },
        remove: function(x) {
            if (hasOwnProperty.call(this.table, x)) {
                this.size--;
                delete this.table[x];
            }
        },
        copy: function() {
            var table = Object.create(null, {});
            for (var key in this.table)
                table[key] = this.table[key];
            return new Dict(table, this.size);
        },
        keys: function() {
            return Object.keys(this.table);
        },
        toString: function() { return "[object Dict]" }
    };

    // shim for ES6 WeakMap with poor asymptotics
    function WeakMap(array) {
        this.array = array || [];
    }

    function searchMap(map, key, found, notFound) {
        var a = map.array;
        for (var i = 0, n = a.length; i < n; i++) {
            var pair = a[i];
            if (pair.key === key)
                return found(pair, i);
        }
        return notFound();
    }

    WeakMap.prototype = {
        has: function(x) {
            return searchMap(this, x, function() { return true }, function() { return false });
        },
        set: function(x, v) {
            var a = this.array;
            searchMap(this, x,
                      function(pair) { pair.value = v },
                      function() { a.push({ key: x, value: v }) });
        },
        get: function(x) {
            return searchMap(this, x,
                             function(pair) { return pair.value },
                             function() { return null });
        },
        "delete": function(x) {
            var a = this.array;
            searchMap(this, x,
                      function(pair, i) { a.splice(i, 1) },
                      function() { });
        },
        toString: function() { return "[object WeakMap]" }
    };

    // non-destructive stack
    function Stack(elts) {
        this.elts = elts || null;
    }

    Stack.prototype = {
        push: function(x) {
            return new Stack({ top: x, rest: this.elts });
        },
        top: function() {
            if (!this.elts)
                throw new Error("empty stack");
            return this.elts.top;
        },
        isEmpty: function() {
            return this.top === null;
        },
        find: function(test) {
            for (var elts = this.elts; elts; elts = elts.rest) {
                if (test(elts.top))
                    return elts.top;
            }
            return null;
        },
        has: function(x) {
            return Boolean(this.find(function(elt) { return elt === x }));
        },
        forEach: function(f) {
            for (var elts = this.elts; elts; elts = elts.rest) {
                f(elts.top);
            }
        }
    };

    if (!Array.prototype.copy) {
        defineProperty(Array.prototype, "copy",
                       function() {
                           var result = [];
                           for (var i = 0, n = this.length; i < n; i++)
                               result[i] = this[i];
                           return result;
                       }, false, false, true);
    }

    if (!Array.prototype.top) {
        defineProperty(Array.prototype, "top",
                       function() {
                           return this.length && this[this.length-1];
                       }, false, false, true);
    }

    return {
        tokens: tokens,
        whitespace: whitespace,
        opTypeNames: opTypeNames,
        keywords: keywords,
        isStatementStartCode: isStatementStartCode,
        tokenIds: tokenIds,
        consts: consts,
        assignOps: assignOps,
        defineGetter: defineGetter,
        defineGetterSetter: defineGetterSetter,
        defineMemoGetter: defineMemoGetter,
        defineProperty: defineProperty,
        isNativeCode: isNativeCode,
        apply: apply,
        applyNew: applyNew,
        mirrorHandler: mirrorHandler,
        mixinHandler: mixinHandler,
        whitelistHandler: whitelistHandler,
        blacklistHandler: blacklistHandler,
        makePassthruHandler: makePassthruHandler,
        Dict: Dict,
        WeakMap: hostGlobal.WeakMap || WeakMap,
        Stack: Stack
    };
}(this));

/* File jit/narcissus/jslex.js*/
/* vim: set sw=4 ts=4 et tw=78: */
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Narcissus JavaScript engine.
 *
 * The Initial Developer of the Original Code is
 * Brendan Eich <brendan@mozilla.org>.
 * Portions created by the Initial Developer are Copyright (C) 2004
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Tom Austin <taustin@ucsc.edu>
 *   Brendan Eich <brendan@mozilla.org>
 *   Shu-Yu Guo <shu@rfrn.org>
 *   Stephan Herhut <stephan.a.herhut@intel.com>
 *   Dave Herman <dherman@mozilla.com>
 *   Dimitris Vardoulakis <dimvar@ccs.neu.edu>
 *   Patrick Walton <pcwalton@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/*
 * Narcissus - JS implemented in JS.
 *
 * Lexical scanner.
 */

Narcissus.lexer = (function() {

    var definitions = Narcissus.definitions;

    // Set constants in the local scope.
    eval(definitions.consts);

    // Banned keywords by language version
    const blackLists = { 160: {}, 185: {}, harmony: {} };
    blackLists[160][LET] = true;
    blackLists[160][MODULE] = true;
    blackLists[160][YIELD] = true;
    blackLists[185][MODULE] = true;

    // Build up a trie of operator tokens.
    var opTokens = {};
    for (var op in definitions.opTypeNames) {
        if (op === '\n' || op === '.')
            continue;

        var node = opTokens;
        for (var i = 0; i < op.length; i++) {
            var ch = op[i];
            if (!(ch in node))
                node[ch] = {};
            node = node[ch];
            node.op = op;
        }
    }

    /*
     * Since JavaScript provides no convenient way to determine if a
     * character is in a particular Unicode category, we use
     * metacircularity to accomplish this (oh yeaaaah!)
     */
    function isValidIdentifierChar(ch, first) {
        // check directly for ASCII
        if (ch <= "\u007F") {
            if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '$' || ch === '_' ||
                (!first && (ch >= '0' && ch <= '9'))) {
                return true;
            }
            return false;
        }

        // create an object to test this in
        var x = {};
        x["x"+ch] = true;
        x[ch] = true;

        // then use eval to determine if it's a valid character
        var valid = false;
        try {
            valid = (Function("x", "return (x." + (first?"":"x") + ch + ");")(x) === true);
        } catch (ex) {}

        return valid;
    }

    function isIdentifier(str) {
        if (typeof str !== "string")
            return false;

        if (str.length === 0)
            return false;

        if (!isValidIdentifierChar(str[0], true))
            return false;

        for (var i = 1; i < str.length; i++) {
            if (!isValidIdentifierChar(str[i], false))
                return false;
        }

        return true;
    }

    /*
     * Tokenizer :: (source, filename, line number) -> Tokenizer
     */
    function Tokenizer(s, f, l) {
        this.cursor = 0;
        this.source = String(s);
        this.tokens = [];
        this.tokenIndex = 0;
        this.lookahead = 0;
        this.scanNewlines = false;
        this.unexpectedEOF = false;
        this.filename = f || "";
        this.lineno = l || 1;
        this.blackList = blackLists[Narcissus.options.version];
        this.blockComments = null;
    }

    Tokenizer.prototype = {
        get done() {
            // We need to set scanOperand to true here because the first thing
            // might be a regexp.
            return this.peek(true) === END;
        },

        get token() {
            return this.tokens[this.tokenIndex];
        },

        match: function (tt, scanOperand, keywordIsName) {
            return this.get(scanOperand, keywordIsName) === tt || this.unget();
        },

        mustMatch: function (tt, keywordIsName) {
            if (!this.match(tt, false, keywordIsName)) {
                throw this.newSyntaxError("Missing " +
                                          definitions.tokens[tt].toLowerCase());
            }
            return this.token;
        },

        peek: function (scanOperand) {
            var tt, next;
            if (this.lookahead) {
                next = this.tokens[(this.tokenIndex + this.lookahead) & 3];
                tt = (this.scanNewlines && next.lineno !== this.lineno)
                     ? NEWLINE
                     : next.type;
            } else {
                tt = this.get(scanOperand);
                this.unget();
            }
            return tt;
        },

        peekOnSameLine: function (scanOperand) {
            this.scanNewlines = true;
            var tt = this.peek(scanOperand);
            this.scanNewlines = false;
            return tt;
        },

        lastBlockComment: function() {
            var length = this.blockComments.length;
            return length ? this.blockComments[length - 1] : null;
        },

        // Eat comments and whitespace.
        skip: function () {
            var input = this.source;
            this.blockComments = [];
            for (;;) {
                var ch = input[this.cursor++];
                var next = input[this.cursor];
                // handle \r, \r\n and (always preferable) \n
                if (ch === '\r') {
                    // if the next character is \n, we don't care about this at all
                    if (next === '\n') continue;

                    // otherwise, we want to consider this as a newline
                    ch = '\n';
                }

                if (ch === '\n' && !this.scanNewlines) {
                    this.lineno++;
                } else if (ch === '/' && next === '*') {
                    var commentStart = ++this.cursor;
                    for (;;) {
                        ch = input[this.cursor++];
                        if (ch === undefined)
                            throw this.newSyntaxError("Unterminated comment");

                        if (ch === '*') {
                            next = input[this.cursor];
                            if (next === '/') {
                                var commentEnd = this.cursor - 1;
                                this.cursor++;
                                break;
                            }
                        } else if (ch === '\n') {
                            this.lineno++;
                        }
                    }
                    this.blockComments.push(input.substring(commentStart, commentEnd));
                } else if ((ch === '/' && next === '/') ||
                           (Narcissus.options.allowHTMLComments && ch === '<' && next === '!' &&
                            input[this.cursor + 1] === '-' && input[this.cursor + 2] === '-' &&
                            (this.cursor += 2))) {
                    this.cursor++;
                    for (;;) {
                        ch = input[this.cursor++];
                        next = input[this.cursor];
                        if (ch === undefined)
                            return;

                        if (ch === '\r') {
                            // check for \r\n
                            if (next !== '\n') ch = '\n';
                        }

                        if (ch === '\n') {
                            if (this.scanNewlines) {
                                this.cursor--;
                            } else {
                                this.lineno++;
                            }
                            break;
                        }
                    }
                } else if (!(ch in definitions.whitespace)) {
                    this.cursor--;
                    return;
                }
            }
        },

        // Lex the exponential part of a number, if present. Return true iff an
        // exponential part was found.
        lexExponent: function() {
            var input = this.source;
            var next = input[this.cursor];
            if (next === 'e' || next === 'E') {
                this.cursor++;
                ch = input[this.cursor++];
                if (ch === '+' || ch === '-')
                    ch = input[this.cursor++];

                if (ch < '0' || ch > '9')
                    throw this.newSyntaxError("Missing exponent");

                do {
                    ch = input[this.cursor++];
                } while (ch >= '0' && ch <= '9');
                this.cursor--;

                return true;
            }

            return false;
        },

        lexZeroNumber: function (ch) {
            var token = this.token, input = this.source;
            token.type = NUMBER;

            ch = input[this.cursor++];
            if (ch === '.') {
                do {
                    ch = input[this.cursor++];
                } while (ch >= '0' && ch <= '9');
                this.cursor--;

                this.lexExponent();
                token.value = parseFloat(
                                input.substring(token.start, this.cursor));
            } else if (ch === 'x' || ch === 'X') {
                do {
                    ch = input[this.cursor++];
                } while ((ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') ||
                         (ch >= 'A' && ch <= 'F'));
                this.cursor--;

                token.value = parseInt(input.substring(token.start, this.cursor));
            } else if (ch >= '0' && ch <= '7') {
                do {
                    ch = input[this.cursor++];
                } while (ch >= '0' && ch <= '7');
                this.cursor--;

                token.value = parseInt(input.substring(token.start, this.cursor));
            } else {
                this.cursor--;
                this.lexExponent();     // 0E1, &c.
                token.value = 0;
            }
        },

        lexNumber: function (ch) {
            var token = this.token, input = this.source;
            token.type = NUMBER;

            var floating = false;
            do {
                ch = input[this.cursor++];
                if (ch === '.' && !floating) {
                    floating = true;
                    ch = input[this.cursor++];
                }
            } while (ch >= '0' && ch <= '9');

            this.cursor--;

            var exponent = this.lexExponent();
            floating = floating || exponent;

            var str = input.substring(token.start, this.cursor);
            token.value = floating ? parseFloat(str) : parseInt(str);
        },

        lexDot: function (ch) {
            var token = this.token, input = this.source;
            var next = input[this.cursor];
            if (next >= '0' && next <= '9') {
                do {
                    ch = input[this.cursor++];
                } while (ch >= '0' && ch <= '9');
                this.cursor--;

                this.lexExponent();

                token.type = NUMBER;
                token.value = parseFloat(
                                input.substring(token.start, this.cursor));
            } else {
                token.type = DOT;
                token.assignOp = null;
                token.value = '.';
            }
        },

        lexString: function (ch) {
            var token = this.token, input = this.source;
            token.type = STRING;

            var hasEscapes = false;
            var delim = ch;
            if (input.length <= this.cursor)
                throw this.newSyntaxError("Unterminated string literal");
            while ((ch = input[this.cursor++]) !== delim) {
                if (this.cursor == input.length)
                    throw this.newSyntaxError("Unterminated string literal");
                if (ch === '\\') {
                    hasEscapes = true;
                    if (++this.cursor == input.length)
                        throw this.newSyntaxError("Unterminated string literal");
                }
            }

            token.value = hasEscapes
                          ? eval(input.substring(token.start, this.cursor))
                          : input.substring(token.start + 1, this.cursor - 1);
        },

        lexRegExp: function (ch) {
            var token = this.token, input = this.source;
            token.type = REGEXP;

            do {
                ch = input[this.cursor++];
                if (ch === '\\') {
                    this.cursor++;
                } else if (ch === '[') {
                    do {
                        if (ch === undefined)
                            throw this.newSyntaxError("Unterminated character class");

                        if (ch === '\\')
                            this.cursor++;

                        ch = input[this.cursor++];
                    } while (ch !== ']');
                } else if (ch === undefined) {
                    throw this.newSyntaxError("Unterminated regex");
                }
            } while (ch !== '/');

            do {
                ch = input[this.cursor++];
            } while (ch >= 'a' && ch <= 'z');

            this.cursor--;

            token.value = eval(input.substring(token.start, this.cursor));
        },

        lexOp: function (ch) {
            var token = this.token, input = this.source;

            // A bit ugly, but it seems wasteful to write a trie lookup routine
            // for only 3 characters...
            var node = opTokens[ch];
            var next = input[this.cursor];
            if (next in node) {
                node = node[next];
                this.cursor++;
                next = input[this.cursor];
                if (next in node) {
                    node = node[next];
                    this.cursor++;
                    next = input[this.cursor];
                }
            }

            var op = node.op;
            if (definitions.assignOps[op] && input[this.cursor] === '=') {
                this.cursor++;
                token.type = ASSIGN;
                token.assignOp = definitions.tokenIds[definitions.opTypeNames[op]];
                op += '=';
            } else {
                token.type = definitions.tokenIds[definitions.opTypeNames[op]];
                token.assignOp = null;
            }

            token.value = op;
        },

        // FIXME: Unicode escape sequences
        lexIdent: function (ch, keywordIsName) {
            var token = this.token;
            var id = ch;

            while ((ch = this.getValidIdentifierChar(false)) !== null) {
                id += ch;
            }

            token.type = IDENTIFIER;
            token.value = id;

            if (keywordIsName)
                return;

            var kw = definitions.keywords[id];
            if (kw && !(kw in this.blackList))
                token.type = kw;
        },

        /*
         * Tokenizer.get :: [boolean[, boolean]] -> token type
         *
         * Consume input *only* if there is no lookahead.
         * Dispatch to the appropriate lexing function depending on the input.
         */
        get: function (scanOperand, keywordIsName) {
            var token;
            while (this.lookahead) {
                --this.lookahead;
                this.tokenIndex = (this.tokenIndex + 1) & 3;
                token = this.tokens[this.tokenIndex];
                if (token.type !== NEWLINE || this.scanNewlines)
                    return token.type;
            }

            this.skip();

            this.tokenIndex = (this.tokenIndex + 1) & 3;
            token = this.tokens[this.tokenIndex];
            if (!token)
                this.tokens[this.tokenIndex] = token = {};

            var input = this.source;
            if (this.cursor >= input.length)
                return token.type = END;

            token.start = this.cursor;
            token.lineno = this.lineno;

            var ich = this.getValidIdentifierChar(true);
            var ch = (ich === null) ? input[this.cursor++] : null;
            if (ich !== null) {
                this.lexIdent(ich, keywordIsName);
            } else if (scanOperand && ch === '/') {
                this.lexRegExp(ch);
            } else if (ch in opTokens) {
                this.lexOp(ch);
            } else if (ch === '.') {
                this.lexDot(ch);
            } else if (ch >= '1' && ch <= '9') {
                this.lexNumber(ch);
            } else if (ch === '0') {
                this.lexZeroNumber(ch);
            } else if (ch === '"' || ch === "'") {
                this.lexString(ch);
            } else if (this.scanNewlines && (ch === '\n' || ch === '\r')) {
                // if this was a \r, look for \r\n
                if (ch === '\r' && input[this.cursor] === '\n') this.cursor++;
                token.type = NEWLINE;
                token.value = '\n';
                this.lineno++;
            } else {
                throw this.newSyntaxError("Illegal token");
            }

            token.end = this.cursor;
            return token.type;
        },

        /*
         * Tokenizer.unget :: void -> undefined
         *
         * Match depends on unget returning undefined.
         */
        unget: function () {
            if (++this.lookahead === 4) throw "PANIC: too much lookahead!";
            this.tokenIndex = (this.tokenIndex - 1) & 3;
        },

        newSyntaxError: function (m) {
            m = (this.filename ? this.filename + ":" : "") + this.lineno + ": " + m;
            var e = new SyntaxError(m, this.filename, this.lineno);
            e.source = this.source;
            e.cursor = this.lookahead
                       ? this.tokens[(this.tokenIndex + this.lookahead) & 3].start
                       : this.cursor;
            return e;
        },


        /* Gets a single valid identifier char from the input stream, or null
         * if there is none.
         */
        getValidIdentifierChar: function(first) {
            var input = this.source;
            if (this.cursor >= input.length) return null;
            var ch = input[this.cursor];

            // first check for \u escapes
            if (ch === '\\' && input[this.cursor+1] === 'u') {
                // get the character value
                try {
                    ch = String.fromCharCode(parseInt(
                        input.substring(this.cursor + 2, this.cursor + 6),
                        16));
                } catch (ex) {
                    return null;
                }
                this.cursor += 5;
            }

            var valid = isValidIdentifierChar(ch, first);
            if (valid) this.cursor++;
            return (valid ? ch : null);
        },
    };


    return {
        isIdentifier: isIdentifier,
        Tokenizer: Tokenizer
    };

}());

/* File jit/narcissus/jsparse.js*/
/* -*- Mode: JS; tab-width: 4; indent-tabs-mode: nil; -*-
 * vim: set sw=4 ts=4 et tw=78:
 * ***** BEGIN LICENSE BLOCK *****
 *
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Narcissus JavaScript engine.
 *
 * The Initial Developer of the Original Code is
 * Brendan Eich <brendan@mozilla.org>.
 * Portions created by the Initial Developer are Copyright (C) 2004
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Tom Austin <taustin@ucsc.edu>
 *   Brendan Eich <brendan@mozilla.org>
 *   Shu-Yu Guo <shu@rfrn.org>
 *   Dave Herman <dherman@mozilla.com>
 *   Dimitris Vardoulakis <dimvar@ccs.neu.edu>
 *   Patrick Walton <pcwalton@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/*
 * Narcissus - JS implemented in JS.
 *
 * Parser.
 */

Narcissus.parser = (function() {

    var lexer = Narcissus.lexer;
    var definitions = Narcissus.definitions;

    const Dict = definitions.Dict;
    const Stack = definitions.Stack;

    // Set constants in the local scope.
    eval(definitions.consts);

    // Banned statement types by language version.
    const blackLists = { 160: {}, 185: {}, harmony: {} };
    blackLists[160][IMPORT] = true;
    blackLists[160][EXPORT] = true;
    blackLists[160][LET] = true;
    blackLists[160][MODULE] = true;
    blackLists[160][YIELD] = true;
    blackLists[185][IMPORT] = true;
    blackLists[185][EXPORT] = true;
    blackLists[185][MODULE] = true;
    blackLists.harmony[WITH] = true;

    /*
     * pushDestructuringVarDecls :: (node, hoisting node) -> void
     *
     * Recursively add all destructured declarations to varDecls.
     */
    function pushDestructuringVarDecls(n, s) {
        for (var i in n) {
            var sub = n[i];
            if (sub.type === IDENTIFIER) {
                s.varDecls.push(sub);
            } else {
                pushDestructuringVarDecls(sub, s);
            }
        }
    }

    function StaticContext(parentScript, parentBlock, inModule, inFunction) {
        this.parentScript = parentScript;
        this.parentBlock = parentBlock || parentScript;
        this.inModule = inModule || false;
        this.inFunction = inFunction || false;
        this.inForLoopInit = false;
        this.topLevel = true;
        this.allLabels = new Stack();
        this.currentLabels = new Stack();
        this.labeledTargets = new Stack();
        this.defaultLoopTarget = null;
        this.defaultTarget = null;
        this.blackList = blackLists[Narcissus.options.version];
        Narcissus.options.ecma3OnlyMode && (this.ecma3OnlyMode = true);
        Narcissus.options.parenFreeMode && (this.parenFreeMode = true);
    }

    StaticContext.prototype = {
        ecma3OnlyMode: false,
        parenFreeMode: false,
        // non-destructive update via prototype extension
        update: function(ext) {
            var desc = {};
            for (var key in ext) {
                desc[key] = {
                    value: ext[key],
                    writable: true,
                    enumerable: true,
                    configurable: true
                }
            }
            return Object.create(this, desc);
        },
        pushLabel: function(label) {
            return this.update({ currentLabels: this.currentLabels.push(label),
                                 allLabels: this.allLabels.push(label) });
        },
        pushTarget: function(target) {
            var isDefaultLoopTarget = target.isLoop;
            var isDefaultTarget = isDefaultLoopTarget || target.type === SWITCH;

            if (this.currentLabels.isEmpty()) {
                if (isDefaultLoopTarget) this.update({ defaultLoopTarget: target });
                if (isDefaultTarget) this.update({ defaultTarget: target });
                return this;
            }

            target.labels = new Dict();
            this.currentLabels.forEach(function(label) {
                target.labels.set(label, true);
            });
            return this.update({ currentLabels: new Stack(),
                                 labeledTargets: this.labeledTargets.push(target),
                                 defaultLoopTarget: isDefaultLoopTarget
                                                    ? target
                                                    : this.defaultLoopTarget,
                                 defaultTarget: isDefaultTarget
                                                ? target
                                                : this.defaultTarget });
        },
        nest: function() {
            return this.topLevel ? this.update({ topLevel: false }) : this;
        },
        allow: function(type) {
            switch (type) {
              case EXPORT:
                if (!this.inModule || this.inFunction || !this.topLevel)
                    return false;
                // FALL THROUGH

              case IMPORT:
                return !this.inFunction && this.topLevel;

              case MODULE:
                return !this.inFunction && this.topLevel;

              default:
                return true;
            }
        }
    };

    /*
     * Script :: (tokenizer, boolean, boolean) -> node
     *
     * Parses the toplevel and module/function bodies.
     */
    function Script(t, inModule, inFunction) {
        var n = new Node(t, scriptInit());
        Statements(t, new StaticContext(n, n, inModule, inFunction), n);
        return n;
    }

    /*
     * Node :: (tokenizer, optional init object) -> node
     */
    function Node(t, init) {
        var token = t.token;
        if (token) {
            // If init.type exists it will override token.type.
            this.type = token.type;
            this.value = token.value;
            this.lineno = token.lineno;

            // Start and end are file positions for error handling.
            this.start = token.start;
            this.end = token.end;
        } else {
            this.lineno = t.lineno;
        }

        // Node uses a tokenizer for debugging (getSource, filename getter).
        this.tokenizer = t;
        this.children = [];

        for (var prop in init)
            this[prop] = init[prop];
    }

    /*
     * SyntheticNode :: (tokenizer, optional init object) -> node
     */
    function SyntheticNode(t, init) {
        // print("SYNTHETIC NODE");
        // if (init.type === COMMA) {
        //     print("SYNTHETIC COMMA");
        //     print(init);
        // }
        this.tokenizer = t;
        this.children = [];
        for (var prop in init)
            this[prop] = init[prop];
        this.synthetic = true;
    }

    var Np = Node.prototype = SyntheticNode.prototype = {};
    Np.constructor = Node;

    const TO_SOURCE_SKIP = {
        type: true,
        value: true,
        lineno: true,
        start: true,
        end: true,
        tokenizer: true,
        assignOp: true
    };
    function unevalableConst(code) {
        var token = definitions.tokens[code];
        var constName = definitions.opTypeNames.hasOwnProperty(token)
                      ? definitions.opTypeNames[token]
                      : token in definitions.keywords
                      ? token.toUpperCase()
                      : token;
        return { toSource: function() { return constName } };
    }
    Np.toSource = function toSource() {
        var mock = {};
        var self = this;
        mock.type = unevalableConst(this.type);
        // avoid infinite recursion in case of back-links
        if (this.generatingSource)
            return mock.toSource();
        this.generatingSource = true;
        if ("value" in this)
            mock.value = this.value;
        if ("lineno" in this)
            mock.lineno = this.lineno;
        if ("start" in this)
            mock.start = this.start;
        if ("end" in this)
            mock.end = this.end;
        if (this.assignOp)
            mock.assignOp = unevalableConst(this.assignOp);
        for (var key in this) {
            if (this.hasOwnProperty(key) && !(key in TO_SOURCE_SKIP))
                mock[key] = this[key];
        }
        try {
            return mock.toSource();
        } finally {
            delete this.generatingSource;
        }
    };

    // Always use push to add operands to an expression, to update start and end.
    Np.push = function (kid) {
        // kid can be null e.g. [1, , 2].
        if (kid !== null) {
            if (kid.start < this.start)
                this.start = kid.start;
            if (this.end < kid.end)
                this.end = kid.end;
        }
        return this.children.push(kid);
    }

    Node.indentLevel = 0;

    function tokenString(tt) {
        var t = definitions.tokens[tt];
        return /^\W/.test(t) ? definitions.opTypeNames[t] : t.toUpperCase();
    }

    Np.toString = function () {
        var a = [];
        for (var i in this) {
            if (this.hasOwnProperty(i) && i !== 'type' && i !== 'target')
                a.push({id: i, value: this[i]});
        }
        a.sort(function (a,b) { return (a.id < b.id) ? -1 : 1; });
        const INDENTATION = "    ";
        var n = ++Node.indentLevel;
        var s = "{\n" + INDENTATION.repeat(n) + "type: " + tokenString(this.type);
        for (i = 0; i < a.length; i++)
            s += ",\n" + INDENTATION.repeat(n) + a[i].id + ": " + a[i].value;
        n = --Node.indentLevel;
        s += "\n" + INDENTATION.repeat(n) + "}";
        return s;
    }

    Np.getSource = function () {
        return this.tokenizer.source.slice(this.start, this.end);
    };

    Np.synth = function(init) {
        var node = new SyntheticNode(this.tokenizer, init);
        node.filename = this.filename;
        node.lineno = this.lineno;
        node.start = this.start;
        node.end = this.end;
        return node;
    };

    /*
     * Helper init objects for common nodes.
     */

    const LOOP_INIT = { isLoop: true };

    function blockInit() {
        return { type: BLOCK, varDecls: [] };
    }

    function scriptInit() {
        return { type: SCRIPT,
                 funDecls: [],
                 varDecls: [],
                 modDefns: new Dict(),
                 modAssns: new Dict(),
                 modDecls: new Dict(),
                 modLoads: new Dict(),
                 impDecls: [],
                 expDecls: [],
                 exports: new Dict(),
                 hasEmptyReturn: false,
                 hasReturnWithValue: false,
                 hasYield: false };
    }

    definitions.defineGetter(Np, "filename",
                             function() {
                                 return this.tokenizer.filename;
                             });

    definitions.defineGetter(Np, "length",
                             function() {
                                 throw new Error("Node.prototype.length is gone; " +
                                                 "use n.children.length instead");
                             });

    definitions.defineProperty(String.prototype, "repeat",
                               function(n) {
                                   var s = "", t = this + s;
                                   while (--n >= 0)
                                       s += t;
                                   return s;
                               }, false, false, true);

    function MaybeLeftParen(t, x) {
        if (x.parenFreeMode)
            return t.match(LEFT_PAREN) ? LEFT_PAREN : END;
        return t.mustMatch(LEFT_PAREN).type;
    }

    function MaybeRightParen(t, p) {
        if (p === LEFT_PAREN)
            t.mustMatch(RIGHT_PAREN);
    }

    /*
     * Statements :: (tokenizer, compiler context, node) -> void
     *
     * Parses a sequence of Statements.
     */
    function Statements(t, x, n) {
        try {
            while (!t.done && t.peek(true) !== RIGHT_CURLY)
                n.push(Statement(t, x));
        } catch (e) {
            if (t.done)
                t.unexpectedEOF = true;
            throw e;
        }
    }

    function Block(t, x) {
        t.mustMatch(LEFT_CURLY);
        var n = new Node(t, blockInit());
        Statements(t, x.update({ parentBlock: n }).pushTarget(n), n);
        t.mustMatch(RIGHT_CURLY);
        return n;
    }

    const DECLARED_FORM = 0, EXPRESSED_FORM = 1, STATEMENT_FORM = 2;

    /*
     * Export :: (binding node, boolean) -> Export
     *
     * Static semantic representation of a module export.
     */
    function Export(node, isDefinition) {
        this.node = node;                 // the AST node declaring this individual export
        this.isDefinition = isDefinition; // is the node an 'export'-annotated definition?
        this.resolved = null;             // resolved pointer to the target of this export
    }

    /*
     * registerExport :: (Dict, EXPORT node) -> void
     */
    function registerExport(exports, decl) {
        function register(name, exp) {
            if (exports.has(name))
                throw new SyntaxError("multiple exports of " + name);
            exports.set(name, exp);
        }

        switch (decl.type) {
          case MODULE:
          case FUNCTION:
            register(decl.name, new Export(decl, true));
            break;

          case VAR:
            for (var i = 0; i < decl.children.length; i++)
                register(decl.children[i].name, new Export(decl.children[i], true));
            break;

          case LET:
          case CONST:
            throw new Error("NYI: " + definitions.tokens[decl.type]);

          case EXPORT:
            for (var i = 0; i < decl.pathList.length; i++) {
                var path = decl.pathList[i];
                switch (path.type) {
                  case OBJECT_INIT:
                    for (var j = 0; j < path.children.length; j++) {
                        // init :: IDENTIFIER | PROPERTY_INIT
                        var init = path.children[j];
                        if (init.type === IDENTIFIER)
                            register(init.value, new Export(init, false));
                        else
                            register(init.children[0].value, new Export(init.children[1], false));
                    }
                    break;

                  case DOT:
                    register(path.children[1].value, new Export(path, false));
                    break;

                  case IDENTIFIER:
                    register(path.value, new Export(path, false));
                    break;

                  default:
                    throw new Error("unexpected export path: " + definitions.tokens[path.type]);
                }
            }
            break;

          default:
            throw new Error("unexpected export decl: " + definitions.tokens[exp.type]);
        }
    }

    /*
     * Module :: (node) -> Module
     *
     * Static semantic representation of a module.
     */
    function Module(node) {
        var exports = node.body.exports;
        var modDefns = node.body.modDefns;

        var exportedModules = new Dict();

        exports.forEach(function(name, exp) {
            var node = exp.node;
            if (node.type === MODULE) {
                exportedModules.set(name, node);
            } else if (!exp.isDefinition && node.type === IDENTIFIER && modDefns.has(node.value)) {
                var mod = modDefns.get(node.value);
                exportedModules.set(name, mod);
            }
        });

        this.node = node;
        this.exports = exports;
        this.exportedModules = exportedModules;
    }

    /*
     * Statement :: (tokenizer, compiler context) -> node
     *
     * Parses a Statement.
     */
    function Statement(t, x) {
        var i, label, n, n2, p, c, ss, tt = t.get(true), tt2, x2, x3;

        var comments = t.blockComments;

        if (x.blackList[tt])
            throw t.newSyntaxError(definitions.tokens[tt] + " statements only allowed in Harmony");
        if (!x.allow(tt))
            throw t.newSyntaxError(definitions.tokens[tt] + " statement in illegal context");

        // Cases for statements ending in a right curly return early, avoiding the
        // common semicolon insertion magic after this switch.
        switch (tt) {
          case IMPORT:
            n = new Node(t);
            n.pathList = ImportPathList(t, x);
            x.parentScript.impDecls.push(n);
            break;

          case EXPORT:
            switch (t.peek()) {
              case MODULE:
              case FUNCTION:
              case LET:
              case VAR:
              case CONST:
                n = Statement(t, x);
                n.blockComments = comments;
                n.exported = true;
                x.parentScript.expDecls.push(n);
                registerExport(x.parentScript.exports, n);
                return n;

              default:
                n = new Node(t);
                n.pathList = ExportPathList(t, x);
                break;
            }
            x.parentScript.expDecls.push(n);
            registerExport(x.parentScript.exports, n);
            break;

          case MODULE:
            n = new Node(t);
            n.blockComments = comments;
            t.mustMatch(IDENTIFIER);
            label = t.token.value;

            if (t.match(LEFT_CURLY)) {
                n.name = label;
                n.body = Script(t, true, false);
                n.module = new Module(n);
                t.mustMatch(RIGHT_CURLY);
                x.parentScript.modDefns.set(n.name, n);
                return n;
            }

            t.unget();
            ModuleVariables(t, x, n);
            return n;

          case FUNCTION:
            // DECLARED_FORM extends funDecls of x, STATEMENT_FORM doesn't.
            return FunctionDefinition(t, x, true, x.topLevel ? DECLARED_FORM : STATEMENT_FORM, comments);

          case LEFT_CURLY:
            n = new Node(t, blockInit());
            Statements(t, x.update({ parentBlock: n }).pushTarget(n).nest(), n);
            t.mustMatch(RIGHT_CURLY);
            return n;

          case IF:
            n = new Node(t);
            n.condition = HeadExpression(t, x);
            x2 = x.pushTarget(n).nest();
            n.thenPart = Statement(t, x2);
            n.elsePart = t.match(ELSE, true) ? Statement(t, x2) : null;
            return n;

          case SWITCH:
            // This allows CASEs after a DEFAULT, which is in the standard.
            n = new Node(t, { cases: [], defaultIndex: -1 });
            n.discriminant = HeadExpression(t, x);
            x2 = x.pushTarget(n).nest();
            t.mustMatch(LEFT_CURLY);
            while ((tt = t.get()) !== RIGHT_CURLY) {
                switch (tt) {
                  case DEFAULT:
                    if (n.defaultIndex >= 0)
                        throw t.newSyntaxError("More than one switch default");
                    // FALL THROUGH
                  case CASE:
                    n2 = new Node(t);
                    if (tt === DEFAULT)
                        n.defaultIndex = n.cases.length;
                    else
                        n2.caseLabel = Expression(t, x2, COLON);
                    break;

                  default:
                    throw t.newSyntaxError("Invalid switch case");
                }
                t.mustMatch(COLON);
                n2.statements = new Node(t, blockInit());
                while ((tt=t.peek(true)) !== CASE && tt !== DEFAULT &&
                        tt !== RIGHT_CURLY)
                    n2.statements.push(Statement(t, x2));
                n.cases.push(n2);
            }
            return n;

          case FOR:
            n = new Node(t, LOOP_INIT);
            n.blockComments = comments;
            if (t.match(IDENTIFIER)) {
                if (t.token.value === "each")
                    n.isEach = true;
                else
                    t.unget();
            }
            if (!x.parenFreeMode)
                t.mustMatch(LEFT_PAREN);
            x2 = x.pushTarget(n).nest();
            x3 = x.update({ inForLoopInit: true });
            n2 = null;
            if ((tt = t.peek(true)) !== SEMICOLON) {
                if (tt === VAR || tt === CONST) {
                    t.get();
                    n2 = Variables(t, x3);
                } else if (tt === LET) {
                    t.get();
                    if (t.peek() === LEFT_PAREN) {
                        n2 = LetBlock(t, x3, false);
                    } else {
                        // Let in for head, we need to add an implicit block
                        // around the rest of the for.
                        x3.parentBlock = n;
                        n.varDecls = [];
                        n2 = Variables(t, x3);
                    }
                } else {
                    n2 = Expression(t, x3);
                }
            }
            if (n2 && t.match(IN)) {
                n.type = FOR_IN;
                n.object = Expression(t, x3);
                if (n2.type === VAR || n2.type === LET) {
                    c = n2.children;

                    // Destructuring turns one decl into multiples, so either
                    // there must be only one destructuring or only one
                    // decl.
                    if (c.length !== 1 && n2.destructurings.length !== 1) {
                        throw new SyntaxError("Invalid for..in left-hand side",
                                              t.filename, n2.lineno);
                    }
                    if (n2.destructurings.length > 0) {
                        n.iterator = n2.destructurings[0];
                    } else {
                        n.iterator = c[0];
                    }
                    n.varDecl = n2;
                } else {
                    if (n2.type === ARRAY_INIT || n2.type === OBJECT_INIT) {
                        n2.destructuredNames = checkDestructuring(t, x3, n2);
                    }
                    n.iterator = n2;
                }
            } else {
                x3.inForLoopInit = false;
                n.setup = n2;
                t.mustMatch(SEMICOLON);
                if (n.isEach)
                    throw t.newSyntaxError("Invalid for each..in loop");
                n.condition = (t.peek(true) === SEMICOLON)
                              ? null
                              : Expression(t, x3);
                t.mustMatch(SEMICOLON);
                tt2 = t.peek(true);
                n.update = (x.parenFreeMode
                            ? tt2 === LEFT_CURLY || definitions.isStatementStartCode[tt2]
                            : tt2 === RIGHT_PAREN)
                           ? null
                           : Expression(t, x3);
            }
            if (!x.parenFreeMode)
                t.mustMatch(RIGHT_PAREN);
            n.body = Statement(t, x2);
            return n;

          case WHILE:
            n = new Node(t, { isLoop: true });
            n.blockComments = comments;
            n.condition = HeadExpression(t, x);
            n.body = Statement(t, x.pushTarget(n).nest());
            return n;

          case DO:
            n = new Node(t, { isLoop: true });
            n.blockComments = comments;
            n.body = Statement(t, x.pushTarget(n).nest());
            t.mustMatch(WHILE);
            n.condition = HeadExpression(t, x);
            if (!x.ecmaStrictMode) {
                // <script language="JavaScript"> (without version hints) may need
                // automatic semicolon insertion without a newline after do-while.
                // See http://bugzilla.mozilla.org/show_bug.cgi?id=238945.
                t.match(SEMICOLON);
                return n;
            }
            break;

          case BREAK:
          case CONTINUE:
            n = new Node(t);
            n.blockComments = comments;

            // handle the |foo: break foo;| corner case
            x2 = x.pushTarget(n);

            if (t.peekOnSameLine() === IDENTIFIER) {
                t.get();
                n.label = t.token.value;
            }

            if (n.label) {
                n.target = x2.labeledTargets.find(function(target) {
                    return target.labels.has(n.label)
                });
            } else if (tt === CONTINUE) {
                n.target = x2.defaultLoopTarget;
            } else {
                n.target = x2.defaultTarget;
            }

            if (!n.target)
                throw t.newSyntaxError("Invalid " + ((tt === BREAK) ? "break" : "continue"));
            if (!n.target.isLoop && tt === CONTINUE)
                throw t.newSyntaxError("Invalid continue");

            break;

          case TRY:
            n = new Node(t, { catchClauses: [] });
            n.blockComments = comments;
            n.tryBlock = Block(t, x);
            while (t.match(CATCH)) {
                n2 = new Node(t);
                p = MaybeLeftParen(t, x);
                switch (t.get()) {
                  case LEFT_BRACKET:
                  case LEFT_CURLY:
                    // Destructured catch identifiers.
                    t.unget();
                    n2.varName = DestructuringExpression(t, x, true);
                    break;
                  case IDENTIFIER:
                    n2.varName = t.token.value;
                    break;
                  default:
                    throw t.newSyntaxError("missing identifier in catch");
                    break;
                }
                if (t.match(IF)) {
                    if (x.ecma3OnlyMode)
                        throw t.newSyntaxError("Illegal catch guard");
                    if (n.catchClauses.length && !n.catchClauses.top().guard)
                        throw t.newSyntaxError("Guarded catch after unguarded");
                    n2.guard = Expression(t, x);
                }
                MaybeRightParen(t, p);
                n2.block = Block(t, x);
                n.catchClauses.push(n2);
            }
            if (t.match(FINALLY))
                n.finallyBlock = Block(t, x);
            if (!n.catchClauses.length && !n.finallyBlock)
                throw t.newSyntaxError("Invalid try statement");
            return n;

          case CATCH:
          case FINALLY:
            throw t.newSyntaxError(definitions.tokens[tt] + " without preceding try");

          case THROW:
            n = new Node(t);
            n.exception = Expression(t, x);
            break;

          case RETURN:
            n = ReturnOrYield(t, x);
            break;

          case WITH:
            n = new Node(t);
            n.blockComments = comments;
            n.object = HeadExpression(t, x);
            n.body = Statement(t, x.pushTarget(n).nest());
            return n;

          case VAR:
          case CONST:
            n = Variables(t, x);
            break;

          case LET:
            if (t.peek() === LEFT_PAREN) {
                n = LetBlock(t, x, true);
                return n;
            }
            n = Variables(t, x);
            break;

          case DEBUGGER:
            n = new Node(t);
            break;

          case NEWLINE:
          case SEMICOLON:
            n = new Node(t, { type: SEMICOLON });
            n.blockComments = comments;
            n.expression = null;
            return n;

          default:
            if (tt === IDENTIFIER) {
                tt = t.peek();
                // Labeled statement.
                if (tt === COLON) {
                    label = t.token.value;
                    if (x.allLabels.has(label))
                        throw t.newSyntaxError("Duplicate label");
                    t.get();
                    n = new Node(t, { type: LABEL, label: label });
                    n.blockComments = comments;
                    n.statement = Statement(t, x.pushLabel(label).nest());
                    n.target = (n.statement.type === LABEL) ? n.statement.target : n.statement;
                    return n;
                }
            }

            // Expression statement.
            // We unget the current token to parse the expression as a whole.
            n = new Node(t, { type: SEMICOLON });
            t.unget();
            n.blockComments = comments;
            n.expression = Expression(t, x);
            n.end = n.expression.end;
            break;
        }

        n.blockComments = comments;
        MagicalSemicolon(t);
        return n;
    }

    /*
     * MagicalSemicolon :: (tokenizer) -> void
     */
    function MagicalSemicolon(t) {
        var tt;
        if (t.lineno === t.token.lineno) {
            tt = t.peekOnSameLine();
            if (tt !== END && tt !== NEWLINE && tt !== SEMICOLON && tt !== RIGHT_CURLY)
                throw t.newSyntaxError("missing ; before statement");
        }
        t.match(SEMICOLON);
    }

    /*
     * ReturnOrYield :: (tokenizer, compiler context) -> (RETURN | YIELD) node
     */
    function ReturnOrYield(t, x) {
        var n, b, tt = t.token.type, tt2;

        var parentScript = x.parentScript;

        if (tt === RETURN) {
            if (!x.inFunction)
                throw t.newSyntaxError("Return not in function");
        } else /* if (tt === YIELD) */ {
            if (!x.inFunction)
                throw t.newSyntaxError("Yield not in function");
            parentScript.hasYield = true;
        }
        n = new Node(t, { value: undefined });

        tt2 = (tt === RETURN) ? t.peekOnSameLine(true) : t.peek(true);
        if (tt2 !== END && tt2 !== NEWLINE &&
            tt2 !== SEMICOLON && tt2 !== RIGHT_CURLY
            && (tt !== YIELD ||
                (tt2 !== tt && tt2 !== RIGHT_BRACKET && tt2 !== RIGHT_PAREN &&
                 tt2 !== COLON && tt2 !== COMMA))) {
            if (tt === RETURN) {
                n.value = Expression(t, x);
                parentScript.hasReturnWithValue = true;
            } else {
                n.value = AssignExpression(t, x);
            }
        } else if (tt === RETURN) {
            parentScript.hasEmptyReturn = true;
        }

        return n;
    }

    /*
     * ModuleExpression :: (tokenizer, compiler context) -> (STRING | IDENTIFIER | DOT) node
     */
    function ModuleExpression(t, x) {
        return t.match(STRING) ? new Node(t) : QualifiedPath(t, x);
    }

    /*
     * ImportPathList :: (tokenizer, compiler context) -> Array[DOT node]
     */
    function ImportPathList(t, x) {
        var a = [];
        do {
            a.push(ImportPath(t, x));
        } while (t.match(COMMA));
        return a;
    }

    /*
     * ImportPath :: (tokenizer, compiler context) -> DOT node
     */
    function ImportPath(t, x) {
        var n = QualifiedPath(t, x);
        if (!t.match(DOT)) {
            if (n.type === IDENTIFIER)
                throw t.newSyntaxError("cannot import local variable");
            return n;
        }

        var n2 = new Node(t);
        n2.push(n);
        n2.push(ImportSpecifierSet(t, x));
        return n2;
    }

    /*
     * ExplicitSpecifierSet :: (tokenizer, compiler context, (tokenizer, compiler context) -> node)
     *                      -> OBJECT_INIT node
     */
    function ExplicitSpecifierSet(t, x, SpecifierRHS) {
        var n, n2, id, tt;

        n = new Node(t, { type: OBJECT_INIT });
        t.mustMatch(LEFT_CURLY);

        if (!t.match(RIGHT_CURLY)) {
            do {
                id = Identifier(t, x);
                if (t.match(COLON)) {
                    n2 = new Node(t, { type: PROPERTY_INIT });
                    n2.push(id);
                    n2.push(SpecifierRHS(t, x));
                    n.push(n2);
                } else {
                    n.push(id);
                }
            } while (!t.match(RIGHT_CURLY) && t.mustMatch(COMMA));
        }

        return n;
    }

    /*
     * ImportSpecifierSet :: (tokenizer, compiler context) -> (IDENTIFIER | OBJECT_INIT) node
     */
    function ImportSpecifierSet(t, x) {
        return t.match(MUL)
             ? new Node(t, { type: IDENTIFIER, name: "*" })
             : ExplicitSpecifierSet(t, x, Identifier);
    }

    /*
     * Identifier :: (tokenizer, compiler context) -> IDENTIFIER node
     */
    function Identifier(t, x) {
        t.mustMatch(IDENTIFIER);
        return new Node(t, { type: IDENTIFIER });
    }

    /*
     * IdentifierName :: (tokenizer) -> IDENTIFIER node
     */
    function IdentifierName(t) {
        t.mustMatch(IDENTIFIER, true);
        return new Node(t, { type: IDENTIFIER });
    }

    /*
     * QualifiedPath :: (tokenizer, compiler context) -> (IDENTIFIER | DOT) node
     */
    function QualifiedPath(t, x) {
        var n, n2;

        n = Identifier(t, x);

        while (t.match(DOT)) {
            if (t.peek() !== IDENTIFIER) {
                // Unget the '.' token, which isn't part of the QualifiedPath.
                t.unget();
                break;
            }
            n2 = new Node(t);
            n2.push(n);
            n2.push(Identifier(t, x));
            n = n2;
        }

        return n;
    }

    /*
     * ExportPath :: (tokenizer, compiler context) -> (IDENTIFIER | DOT | OBJECT_INIT) node
     */
    function ExportPath(t, x) {
        if (t.peek() === LEFT_CURLY)
            return ExplicitSpecifierSet(t, x, QualifiedPath);
        return QualifiedPath(t, x);
    }

    /*
     * ExportPathList :: (tokenizer, compiler context)
     *                -> Array[(IDENTIFIER | DOT | OBJECT_INIT) node]
     */
    function ExportPathList(t, x) {
        var a = [];
        do {
            a.push(ExportPath(t, x));
        } while (t.match(COMMA));
        return a;
    }

    /*
     * FunctionDefinition :: (tokenizer, compiler context, boolean,
     *                        DECLARED_FORM or EXPRESSED_FORM or STATEMENT_FORM,
     *                        [string] or null or undefined)
     *                    -> node
     */
    function FunctionDefinition(t, x, requireName, functionForm, comments) {
        var tt;
        var f = new Node(t, { params: [], paramComments: [] });
        if (typeof comment === "undefined")
            comment = null;
        f.blockComments = comments;
        if (f.type !== FUNCTION)
            f.type = (f.value === "get") ? GETTER : SETTER;
        if (t.match(MUL))
            f.isExplicitGenerator = true;
        if (t.match(IDENTIFIER, false, true))
            f.name = t.token.value;
        else if (requireName)
            throw t.newSyntaxError("missing function identifier");

        var inModule = x ? x.inModule : false;
        var x2 = new StaticContext(null, null, inModule, true);

        t.mustMatch(LEFT_PAREN);
        if (!t.match(RIGHT_PAREN)) {
            do {
                tt = t.get();
                f.paramComments.push(t.lastBlockComment());
                switch (tt) {
                  case LEFT_BRACKET:
                  case LEFT_CURLY:
                    // Destructured formal parameters.
                    t.unget();
                    f.params.push(DestructuringExpression(t, x2));
                    break;
                  case IDENTIFIER:
                    f.params.push(t.token.value);
                    break;
                  default:
                    throw t.newSyntaxError("missing formal parameter");
                    break;
                }
            } while (t.match(COMMA));
            t.mustMatch(RIGHT_PAREN);
        }

        // Do we have an expression closure or a normal body?
        tt = t.get(true);
        if (tt !== LEFT_CURLY)
            t.unget();

        if (tt !== LEFT_CURLY) {
            f.body = AssignExpression(t, x2);
        } else {
            f.body = Script(t, inModule, true);
        }

        if (tt === LEFT_CURLY)
            t.mustMatch(RIGHT_CURLY);

        f.end = t.token.end;
        f.functionForm = functionForm;
        if (functionForm === DECLARED_FORM)
            x.parentScript.funDecls.push(f);

        if (Narcissus.options.version === "harmony" && !f.isExplicitGenerator && f.body.hasYield)
            throw t.newSyntaxError("yield in non-generator function");

        if (f.isExplicitGenerator || f.body.hasYield)
            f.body = new Node(t, { type: GENERATOR, body: f.body });

        return f;
    }

    /*
     * ModuleVariables :: (tokenizer, compiler context, MODULE node) -> void
     *
     * Parses a comma-separated list of module declarations (and maybe
     * initializations).
     */
    function ModuleVariables(t, x, n) {
        var n1, n2;
        do {
            n1 = Identifier(t, x);
            if (t.match(ASSIGN)) {
                n2 = ModuleExpression(t, x);
                n1.initializer = n2;
                if (n2.type === STRING)
                    x.parentScript.modLoads.set(n1.value, n2.value);
                else
                    x.parentScript.modAssns.set(n1.value, n1);
            }
            n.push(n1);
        } while (t.match(COMMA));
    }

    /*
     * Variables :: (tokenizer, compiler context) -> node
     *
     * Parses a comma-separated list of var declarations (and maybe
     * initializations).
     */
    function Variables(t, x, letBlock) {
        var n, n2, ss, i, s, tt;

        tt = t.token.type;
        switch (tt) {
          case VAR:
          case CONST:
            s = x.parentScript;
            break;
          case LET:
            s = x.parentBlock;
            break;
          case LEFT_PAREN:
            tt = LET;
            s = letBlock;
            break;
        }

        n = new Node(t, { type: tt, destructurings: [] });

        do {
            tt = t.get();
            if (tt === LEFT_BRACKET || tt === LEFT_CURLY) {
                // Need to unget to parse the full destructured expression.
                t.unget();

                var dexp = DestructuringExpression(t, x, true);

                n2 = new Node(t, { type: IDENTIFIER,
                                   name: dexp,
                                   readOnly: n.type === CONST });
                n.push(n2);
                pushDestructuringVarDecls(n2.name.destructuredNames, s);
                n.destructurings.push({ exp: dexp, decl: n2 });

                if (x.inForLoopInit && t.peek() === IN) {
                    continue;
                }

                t.mustMatch(ASSIGN);
                if (t.token.assignOp)
                    throw t.newSyntaxError("Invalid variable initialization");

                n2.blockComment = t.lastBlockComment();
                n2.initializer = AssignExpression(t, x);

                continue;
            }

            if (tt !== IDENTIFIER)
                throw t.newSyntaxError("missing variable name");

            n2 = new Node(t, { type: IDENTIFIER,
                               name: t.token.value,
                               readOnly: n.type === CONST });
            n.push(n2);
            s.varDecls.push(n2);

            if (t.match(ASSIGN)) {
                var comment = t.lastBlockComment();
                if (t.token.assignOp)
                    throw t.newSyntaxError("Invalid variable initialization");

                n2.initializer = AssignExpression(t, x);
            } else {
                var comment = t.lastBlockComment();
            }
            n2.blockComment = comment;
        } while (t.match(COMMA));

        return n;
    }

    /*
     * LetBlock :: (tokenizer, compiler context, boolean) -> node
     *
     * Does not handle let inside of for loop init.
     */
    function LetBlock(t, x, isStatement) {
        var n, n2;

        // t.token.type must be LET
        n = new Node(t, { type: LET_BLOCK, varDecls: [] });
        t.mustMatch(LEFT_PAREN);
        n.variables = Variables(t, x, n);
        t.mustMatch(RIGHT_PAREN);

        if (isStatement && t.peek() !== LEFT_CURLY) {
            /*
             * If this is really an expression in let statement guise, then we
             * need to wrap the LET_BLOCK node in a SEMICOLON node so that we pop
             * the return value of the expression.
             */
            n2 = new Node(t, { type: SEMICOLON,
                               expression: n });
            isStatement = false;
        }

        if (isStatement)
            n.block = Block(t, x);
        else
            n.expression = AssignExpression(t, x);

        return n;
    }

    function checkDestructuring(t, x, n, simpleNamesOnly) {
        if (n.type === ARRAY_COMP)
            throw t.newSyntaxError("Invalid array comprehension left-hand side");
        if (n.type !== ARRAY_INIT && n.type !== OBJECT_INIT)
            return;

        var lhss = {};
        var nn, n2, idx, sub, cc, c = n.children;
        for (var i = 0, j = c.length; i < j; i++) {
            if (!(nn = c[i]))
                continue;
            if (nn.type === PROPERTY_INIT) {
                cc = nn.children;
                sub = cc[1];
                idx = cc[0].value;
            } else if (n.type === OBJECT_INIT) {
                // Do we have destructuring shorthand {foo, bar}?
                sub = nn;
                idx = nn.value;
            } else {
                sub = nn;
                idx = i;
            }

            if (sub.type === ARRAY_INIT || sub.type === OBJECT_INIT) {
                lhss[idx] = checkDestructuring(t, x, sub, simpleNamesOnly);
            } else {
                if (simpleNamesOnly && sub.type !== IDENTIFIER) {
                    // In declarations, lhs must be simple names
                    throw t.newSyntaxError("missing name in pattern");
                }

                lhss[idx] = sub;
            }
        }

        return lhss;
    }

    function DestructuringExpression(t, x, simpleNamesOnly) {
        var n = PrimaryExpression(t, x);
        // Keep the list of lefthand sides for varDecls
        n.destructuredNames = checkDestructuring(t, x, n, simpleNamesOnly);
        return n;
    }

    function GeneratorExpression(t, x, e) {
        return new Node(t, { type: GENERATOR,
                             expression: e,
                             tail: ComprehensionTail(t, x) });
    }

    function ComprehensionTail(t, x) {
        var body, n, n2, n3, p;

        // t.token.type must be FOR
        body = new Node(t, { type: COMP_TAIL });

        do {
            // Comprehension tails are always for..in loops.
            n = new Node(t, { type: FOR_IN, isLoop: true });
            if (t.match(IDENTIFIER)) {
                // But sometimes they're for each..in.
                if (t.token.value === "each")
                    n.isEach = true;
                else
                    t.unget();
            }
            p = MaybeLeftParen(t, x);
            switch(t.get()) {
              case LEFT_BRACKET:
              case LEFT_CURLY:
                t.unget();
                // Destructured left side of for in comprehension tails.
                n.iterator = DestructuringExpression(t, x);
                break;

              case IDENTIFIER:
                n.iterator = n3 = new Node(t, { type: IDENTIFIER });
                n3.name = n3.value;
                n.varDecl = n2 = new Node(t, { type: VAR });
                n2.push(n3);
                x.parentScript.varDecls.push(n3);
                // Don't add to varDecls since the semantics of comprehensions is
                // such that the variables are in their own function when
                // desugared.
                break;

              default:
                throw t.newSyntaxError("missing identifier");
            }
            t.mustMatch(IN);
            n.object = Expression(t, x);
            MaybeRightParen(t, p);
            body.push(n);
        } while (t.match(FOR));

        // Optional guard.
        if (t.match(IF))
            body.guard = HeadExpression(t, x);

        return body;
    }

    function HeadExpression(t, x) {
        var p = MaybeLeftParen(t, x);
        var n = ParenExpression(t, x);
        MaybeRightParen(t, p);
        if (p === END && !n.parenthesized) {
            var tt = t.peek();
            if (tt !== LEFT_CURLY && !definitions.isStatementStartCode[tt])
                throw t.newSyntaxError("Unparenthesized head followed by unbraced body");
        }
        return n;
    }

    function ParenExpression(t, x) {
        // Always accept the 'in' operator in a parenthesized expression,
        // where it's unambiguous, even if we might be parsing the init of a
        // for statement.
        var n = Expression(t, x.update({ inForLoopInit: x.inForLoopInit &&
                                                        (t.token.type === LEFT_PAREN) }));

        if (t.match(FOR)) {
            if (n.type === YIELD && !n.parenthesized)
                throw t.newSyntaxError("Yield expression must be parenthesized");
            if (n.type === COMMA && !n.parenthesized)
                throw t.newSyntaxError("Generator expression must be parenthesized");
            n = GeneratorExpression(t, x, n);
        }

        return n;
    }

    /*
     * Expression :: (tokenizer, compiler context) -> node
     *
     * Top-down expression parser matched against SpiderMonkey.
     */
    function Expression(t, x) {
        var n, n2;

        n = AssignExpression(t, x);
        if (t.match(COMMA)) {
            n2 = new Node(t, { type: COMMA });
            n2.push(n);
            n = n2;
            do {
                n2 = n.children[n.children.length-1];
                if (n2.type === YIELD && !n2.parenthesized)
                    throw t.newSyntaxError("Yield expression must be parenthesized");
                n.push(AssignExpression(t, x));
            } while (t.match(COMMA));
        }

        return n;
    }

    function AssignExpression(t, x) {
        var n, lhs;

        // Have to treat yield like an operand because it could be the leftmost
        // operand of the expression.
        if (t.match(YIELD, true))
            return ReturnOrYield(t, x);

        n = new Node(t, { type: ASSIGN });
        lhs = ConditionalExpression(t, x);

        if (!t.match(ASSIGN)) {
            return lhs;
        }

        n.blockComment = t.lastBlockComment();

        switch (lhs.type) {
          case OBJECT_INIT:
          case ARRAY_INIT:
            lhs.destructuredNames = checkDestructuring(t, x, lhs);
            // FALL THROUGH
          case IDENTIFIER: case DOT: case INDEX: case CALL:
            break;
          default:
            throw t.newSyntaxError("Bad left-hand side of assignment");
            break;
        }

        n.assignOp = lhs.assignOp = t.token.assignOp;
        n.push(lhs);
        n.push(AssignExpression(t, x));

        return n;
    }

    function ConditionalExpression(t, x) {
        var n, n2;

        n = OrExpression(t, x);
        if (t.match(HOOK)) {
            n2 = n;
            n = new Node(t, { type: HOOK });
            n.push(n2);
            /*
             * Always accept the 'in' operator in the middle clause of a ternary,
             * where it's unambiguous, even if we might be parsing the init of a
             * for statement.
             */
            n.push(AssignExpression(t, x.update({ inForLoopInit: false })));
            if (!t.match(COLON))
                throw t.newSyntaxError("missing : after ?");
            n.push(AssignExpression(t, x));
        }

        return n;
    }

    function OrExpression(t, x) {
        var n, n2;

        n = AndExpression(t, x);
        while (t.match(OR)) {
            n2 = new Node(t);
            n2.push(n);
            n2.push(AndExpression(t, x));
            n = n2;
        }

        return n;
    }

    function AndExpression(t, x) {
        var n, n2;

        n = BitwiseOrExpression(t, x);
        while (t.match(AND)) {
            n2 = new Node(t);
            n2.push(n);
            n2.push(BitwiseOrExpression(t, x));
            n = n2;
        }

        return n;
    }

    function BitwiseOrExpression(t, x) {
        var n, n2;

        n = BitwiseXorExpression(t, x);
        while (t.match(BITWISE_OR)) {
            n2 = new Node(t);
            n2.push(n);
            n2.push(BitwiseXorExpression(t, x));
            n = n2;
        }

        return n;
    }

    function BitwiseXorExpression(t, x) {
        var n, n2;

        n = BitwiseAndExpression(t, x);
        while (t.match(BITWISE_XOR)) {
            n2 = new Node(t);
            n2.push(n);
            n2.push(BitwiseAndExpression(t, x));
            n = n2;
        }

        return n;
    }

    function BitwiseAndExpression(t, x) {
        var n, n2;

        n = EqualityExpression(t, x);
        while (t.match(BITWISE_AND)) {
            n2 = new Node(t);
            n2.push(n);
            n2.push(EqualityExpression(t, x));
            n = n2;
        }

        return n;
    }

    function EqualityExpression(t, x) {
        var n, n2;

        n = RelationalExpression(t, x);
        while (t.match(EQ) || t.match(NE) ||
               t.match(STRICT_EQ) || t.match(STRICT_NE)) {
            n2 = new Node(t);
            n2.push(n);
            n2.push(RelationalExpression(t, x));
            n = n2;
        }

        return n;
    }

    function RelationalExpression(t, x) {
        var n, n2;

        /*
         * Uses of the in operator in shiftExprs are always unambiguous,
         * so unset the flag that prohibits recognizing it.
         */
        var x2 = x.update({ inForLoopInit: false });
        n = ShiftExpression(t, x2);
        while ((t.match(LT) || t.match(LE) || t.match(GE) || t.match(GT) ||
               (!x.inForLoopInit && t.match(IN)) ||
               t.match(INSTANCEOF))) {
            n2 = new Node(t);
            n2.push(n);
            n2.push(ShiftExpression(t, x2));
            n = n2;
        }

        return n;
    }

    function ShiftExpression(t, x) {
        var n, n2;

        n = AddExpression(t, x);
        while (t.match(LSH) || t.match(RSH) || t.match(URSH)) {
            n2 = new Node(t);
            n2.push(n);
            n2.push(AddExpression(t, x));
            n = n2;
        }

        return n;
    }

    function AddExpression(t, x) {
        var n, n2;

        n = MultiplyExpression(t, x);
        while (t.match(PLUS) || t.match(MINUS)) {
            n2 = new Node(t);
            n2.push(n);
            n2.push(MultiplyExpression(t, x));
            n = n2;
        }

        return n;
    }

    function MultiplyExpression(t, x) {
        var n, n2;

        n = UnaryExpression(t, x);
        while (t.match(MUL) || t.match(DIV) || t.match(MOD)) {
            n2 = new Node(t);
            n2.push(n);
            n2.push(UnaryExpression(t, x));
            n = n2;
        }

        return n;
    }

    function UnaryExpression(t, x) {
        var n, n2, tt;

        switch (tt = t.get(true)) {
          case DELETE: case VOID: case TYPEOF:
          case NOT: case BITWISE_NOT: case PLUS: case MINUS:
            if (tt === PLUS)
                n = new Node(t, { type: UNARY_PLUS });
            else if (tt === MINUS)
                n = new Node(t, { type: UNARY_MINUS });
            else
                n = new Node(t);
            n.push(UnaryExpression(t, x));
            break;

          case INCREMENT:
          case DECREMENT:
            // Prefix increment/decrement.
            n = new Node(t);
            n.push(MemberExpression(t, x, true));
            break;

          default:
            t.unget();
            n = MemberExpression(t, x, true);

            // Don't look across a newline boundary for a postfix {in,de}crement.
            if (t.tokens[(t.tokenIndex + t.lookahead - 1) & 3].lineno ===
                t.lineno) {
                if (t.match(INCREMENT) || t.match(DECREMENT)) {
                    n2 = new Node(t, { postfix: true });
                    n2.push(n);
                    n = n2;
                }
            }
            break;
        }

        return n;
    }

    function MemberExpression(t, x, allowCallSyntax) {
        var n, n2, name, tt;

        if (t.match(NEW)) {
            n = new Node(t);
            n.push(MemberExpression(t, x, false));
            if (t.match(LEFT_PAREN)) {
                n.type = NEW_WITH_ARGS;
                n.push(ArgumentList(t, x));
            }
        } else {
            n = PrimaryExpression(t, x);
        }

        while ((tt = t.get()) !== END) {
            switch (tt) {
              case DOT:
                n2 = new Node(t);
                n2.push(n);
                n2.push(IdentifierName(t));
                break;

              case LEFT_BRACKET:
                n2 = new Node(t, { type: INDEX });
                n2.push(n);
                n2.push(Expression(t, x));
                t.mustMatch(RIGHT_BRACKET);
                break;

              case LEFT_PAREN:
                if (allowCallSyntax) {
                    n2 = new Node(t, { type: CALL });
                    n2.push(n);
                    n2.push(ArgumentList(t, x));
                    break;
                }

                // FALL THROUGH
              default:
                t.unget();
                return n;
            }

            n = n2;
        }

        return n;
    }

    function ArgumentList(t, x) {
        var n, n2;

        n = new Node(t, { type: LIST });
        if (t.match(RIGHT_PAREN, true))
            return n;
        do {
            n2 = AssignExpression(t, x);
            if (n2.type === YIELD && !n2.parenthesized && t.peek() === COMMA)
                throw t.newSyntaxError("Yield expression must be parenthesized");
            if (t.match(FOR)) {
                n2 = GeneratorExpression(t, x, n2);
                if (n.children.length > 1 || t.peek(true) === COMMA)
                    throw t.newSyntaxError("Generator expression must be parenthesized");
            }
            n.push(n2);
        } while (t.match(COMMA));
        t.mustMatch(RIGHT_PAREN);

        return n;
    }

    function PrimaryExpression(t, x) {
        var n, n2, tt = t.get(true);

        switch (tt) {
          case FUNCTION:
            n = FunctionDefinition(t, x, false, EXPRESSED_FORM);
            break;

          case LEFT_BRACKET:
            n = new Node(t, { type: ARRAY_INIT });
            while ((tt = t.peek(true)) !== RIGHT_BRACKET) {
                if (tt === COMMA) {
                    t.get();
                    n.push(null);
                    continue;
                }
                n.push(AssignExpression(t, x));
                if (tt !== COMMA && !t.match(COMMA))
                    break;
            }

            // If we matched exactly one element and got a FOR, we have an
            // array comprehension.
            if (n.children.length === 1 && t.match(FOR)) {
                n2 = new Node(t, { type: ARRAY_COMP,
                                   expression: n.children[0],
                                   tail: ComprehensionTail(t, x) });
                n = n2;
            }
            t.mustMatch(RIGHT_BRACKET);
            break;

          case LEFT_CURLY:
            var id, fd;
            n = new Node(t, { type: OBJECT_INIT });

          object_init:
            if (!t.match(RIGHT_CURLY)) {
                do {
                    tt = t.get();
                    if ((t.token.value === "get" || t.token.value === "set") &&
                        t.peek() === IDENTIFIER) {
                        if (x.ecma3OnlyMode)
                            throw t.newSyntaxError("Illegal property accessor");
                        n.push(FunctionDefinition(t, x, true, EXPRESSED_FORM));
                    } else {
                        var comments = t.blockComments;
                        switch (tt) {
                          case IDENTIFIER: case NUMBER: case STRING:
                            id = new Node(t, { type: IDENTIFIER });
                            break;
                          case RIGHT_CURLY:
                            if (x.ecma3OnlyMode)
                                throw t.newSyntaxError("Illegal trailing ,");
                            break object_init;
                          default:
                            if (t.token.value in definitions.keywords) {
                                id = new Node(t, { type: IDENTIFIER });
                                break;
                            }
                            throw t.newSyntaxError("Invalid property name");
                        }
                        if (t.match(COLON)) {
                            n2 = new Node(t, { type: PROPERTY_INIT });
                            n2.push(id);
                            n2.push(AssignExpression(t, x));
                            n2.blockComments = comments;
                            n.push(n2);
                        } else {
                            // Support, e.g., |var {x, y} = o| as destructuring shorthand
                            // for |var {x: x, y: y} = o|, per proposed JS2/ES4 for JS1.8.
                            if (t.peek() !== COMMA && t.peek() !== RIGHT_CURLY)
                                throw t.newSyntaxError("missing : after property");
                            n.push(id);
                        }
                    }
                } while (t.match(COMMA));
                t.mustMatch(RIGHT_CURLY);
            }
            break;

          case LEFT_PAREN:
            n = ParenExpression(t, x);
            t.mustMatch(RIGHT_PAREN);
            n.parenthesized = true;
            break;

          case LET:
            n = LetBlock(t, x, false);
            break;

          case NULL: case THIS: case TRUE: case FALSE:
          case IDENTIFIER: case NUMBER: case STRING: case REGEXP:
            n = new Node(t);
            break;

          default:
            throw t.newSyntaxError("missing operand; found " + definitions.tokens[tt]);
            break;
        }

        return n;
    }

    /*
     * parse :: (source, filename, line number) -> node
     */
    function parse(s, f, l) {
        var t = new lexer.Tokenizer(s, f, l);
        var n = Script(t, false, false);
        if (!t.done)
            throw t.newSyntaxError("Syntax error");

        return n;
    }

    /*
     * parseStdin :: (source, {line number}, string, (string) -> boolean) -> program node
     */
    function parseStdin(s, ln, prefix, isCommand) {
        // the special .begin command is only recognized at the beginning
        if (s.match(/^[\s]*\.begin[\s]*$/)) {
            ++ln.value;
            return parseMultiline(ln, prefix);
        }

        // commands at the beginning are treated as the entire input
        if (isCommand(s.trim()))
            s = "";

        for (;;) {
            try {
                var t = new lexer.Tokenizer(s, "stdin", ln.value);
                var n = Script(t, false, false);
                ln.value = t.lineno;
                return n;
            } catch (e) {
                if (!t.unexpectedEOF)
                    throw e;

                // commands in the middle are not treated as part of the input
                var more;
                do {
                    if (prefix)
                        putstr(prefix);
                    more = readline();
                    if (!more)
                        throw e;
                } while (isCommand(more.trim()));

                s += "\n" + more;
            }
        }
    }

    /*
     * parseMultiline :: ({line number}, string | null) -> program node
     */
    function parseMultiline(ln, prefix) {
        var s = "";
        for (;;) {
            if (prefix)
                putstr(prefix);
            var more = readline();
            if (more === null)
                return null;
            // the only command recognized in multiline mode is .end
            if (more.match(/^[\s]*\.end[\s]*$/))
                break;
            s += "\n" + more;
        }
        var t = new lexer.Tokenizer(s, "stdin", ln.value);
        var n = Script(t, false, false);
        ln.value = t.lineno;
        return n;
    }

    return {
        parse: parse,
        parseStdin: parseStdin,
        Node: Node,
        DECLARED_FORM: DECLARED_FORM,
        EXPRESSED_FORM: EXPRESSED_FORM,
        STATEMENT_FORM: STATEMENT_FORM,
        Tokenizer: lexer.Tokenizer,
        FunctionDefinition: FunctionDefinition,
        Module: Module,
        Export: Export
    };

}());

/* File jit/narcissus/jsdecomp.js*/
/* vim: set sw=4 ts=4 et tw=78: */
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Narcissus JavaScript engine.
 *
 * The Initial Developer of the Original Code is
 * Brendan Eich <brendan@mozilla.org>.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Shu-Yu Guo <shu@rfrn.org>
 *   Bruno Jouhier
 *   Gregor Richards
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/*
 * Narcissus - JS implemented in JS.
 *
 * Decompiler and pretty-printer.
 */

Narcissus.decompiler = (function() {

    const lexer = Narcissus.lexer;
    const parser = Narcissus.parser;
    const definitions = Narcissus.definitions;
    const tokens = definitions.tokens;

    // Set constants in the local scope.
    eval(definitions.consts);

    function indent(n, s) {
        var ss = "", d = true;

        for (var i = 0, j = s.length; i < j; i++) {
            if (d)
                for (var k = 0; k < n; k++)
                    ss += " ";
            ss += s[i];
            d = s[i] === '\n';
        }

        return ss;
    }

    function isBlock(n) {
        return n && (n.type === BLOCK);
    }

    function isNonEmptyBlock(n) {
        return isBlock(n) && n.children.length > 0;
    }

    function nodeStrEscape(str) {
        return str.replace(/\\/g, "\\\\")
                  .replace(/"/g, "\\\"")
                  .replace(/\n/g, "\\n")
                  .replace(/\r/g, "\\r")
                  .replace(/</g, "\\u003C")
                  .replace(/>/g, "\\u003E");
    }

    function nodeStr(n) {
        if (/[\u0000-\u001F\u0080-\uFFFF]/.test(n.value)) {
            // use the convoluted algorithm to avoid broken low/high characters
            var str = "";
            for (var i = 0; i < n.value.length; i++) {
                var c = n.value[i];
                if (c <= "\x1F" || c >= "\x80") {
                    var cc = c.charCodeAt(0).toString(16);
                    while (cc.length < 4) cc = "0" + cc;
                    str += "\\u" + cc;
                } else {
                    str += nodeStrEscape(c);
                }
            }
            return '"' + str + '"';
        }

        return '"' + nodeStrEscape(n.value) + '"';
    }

    function pp(n, d, inLetHead) {
        var topScript = false;

        if (!n)
            return "";
        if (!(n instanceof Object))
            return n;
        if (!d) {
            topScript = true;
            d = 1;
        }

        var p = "";

        if (n.parenthesized)
            p += "(";

        switch (n.type) {
          case FUNCTION:
          case GETTER:
          case SETTER:
            if (n.type === FUNCTION)
                p += "function";
            else if (n.type === GETTER)
                p += "get";
            else
                p += "set";

            p += (n.name ? " " + n.name : "") + "(";
            for (var i = 0, j = n.params.length; i < j; i++)
                p += (i > 0 ? ", " : "") + pp(n.params[i], d);
            p += ") " + pp(n.body, d);
            break;

          case SCRIPT:
          case BLOCK:
            var nc = n.children;
            if (topScript) {
                // No indentation.
                for (var i = 0, j = nc.length; i < j; i++) {
                    if (i > 0)
                        p += "\n";
                    p += pp(nc[i], d);
                    var eoc = p[p.length - 1];
                    if (eoc != ";")
                        p += ";";
                }

                break;
            }

            p += "{";
            if (n.id !== undefined)
                p += " /* " + n.id + " */";
            p += "\n";
            for (var i = 0, j = nc.length; i < j; i++) {
                if (i > 0)
                    p += "\n";
                p += indent(4, pp(nc[i], d));
                var eoc = p[p.length - 1];
                if (eoc != ";")
                    p += ";";
            }
            p += "\n}";
            break;

          case LET_BLOCK:
            p += "let (" + pp(n.variables, d, true) + ") ";
            if (n.expression)
                p += pp(n.expression, d);
            else
                p += pp(n.block, d);
            break;

          case IF:
            p += "if (" + pp(n.condition, d) + ") ";

            var tp = n.thenPart, ep = n.elsePart;
            var b = isBlock(tp) || isBlock(ep);
            if (!b)
                p += "{\n";
            p += (b ? pp(tp, d) : indent(4, pp(tp, d))) + "\n";

            if (ep) {
                if (!b)
                    p += "} else {\n";
                else
                    p += " else ";

                p += (b ? pp(ep, d) : indent(4, pp(ep, d))) + "\n";
            }
            if (!b)
                p += "}";
            break;

          case SWITCH:
            p += "switch (" + pp(n.discriminant, d) + ") {\n";
            for (var i = 0, j = n.cases.length; i < j; i++) {
                var ca = n.cases[i];
                if (ca.type === CASE)
                    p += "  case " + pp(ca.caseLabel, d) + ":\n";
                else
                    p += "  default:\n";
                ps = pp(ca.statements, d);
                p += ps.slice(2, ps.length - 2) + "\n";
            }
            p += "}";
            break;

          case FOR:
            p += "for (" + pp(n.setup, d) + "; "
                         + pp(n.condition, d) + "; "
                         + pp(n.update, d) + ") ";

            var pb = pp(n.body, d);
            if (!isBlock(n.body))
                p += "{\n" + indent(4, pb) + ";\n}";
            else if (n.body)
                p += pb;
            break;

          case WHILE:
            p += "while (" + pp(n.condition, d) + ") ";

            var pb = pp(n.body, d);
            if (!isBlock(n.body))
                p += "{\n" + indent(4, pb) + ";\n}";
            else
                p += pb;
            break;

          case FOR_IN:
            var u = n.varDecl;
            p += n.isEach ? "for each (" : "for (";
            p += (u ? pp(u, d) : pp(n.iterator, d)) + " in " +
                 pp(n.object, d) + ") ";

            var pb = pp(n.body, d);
            if (!isBlock(n.body))
                p += "{\n" + indent(4, pb) + ";\n}";
            else if (n.body)
                p += pb;
            break;

          case DO:
            p += "do " + pp(n.body, d);
            p += " while (" + pp(n.condition, d) + ");";
            break;

          case BREAK:
            p += "break" + (n.label ? " " + n.label : "") + ";";
            break;

          case CONTINUE:
            p += "continue" + (n.label ? " " + n.label : "") + ";";
            break;

          case TRY:
            p += "try ";
            p += pp(n.tryBlock, d);
            for (var i = 0, j = n.catchClauses.length; i < j; i++) {
                var t = n.catchClauses[i];
                p += " catch (" + pp(t.varName, d) +
                                (t.guard ? " if " + pp(t.guard, d) : "") +
                                ") ";
                p += pp(t.block, d);
            }
            if (n.finallyBlock) {
                p += " finally ";
                p += pp(n.finallyBlock, d);
            }
            break;

          case THROW:
            p += "throw " + pp(n.exception, d);
            break;

          case RETURN:
            p += "return";
            if (n.value)
              p += " " + pp(n.value, d);
            break;

          case YIELD:
            p += "yield";
            if (n.value)
              p += " " + pp(n.value, d);
            break;

          case GENERATOR:
            p += pp(n.expression, d) + " " + pp(n.tail, d);
            break;

          case WITH:
            p += "with (" + pp(n.object, d) + ") ";
            p += pp(n.body, d);
            break;

          case LET:
          case VAR:
          case CONST:
            var nc = n.children;
            if (!inLetHead) {
                p += tokens[n.type] + " ";
            }
            for (var i = 0, j = nc.length; i < j; i++) {
                if (i > 0)
                    p += ", ";
                var u = nc[i];
                p += pp(u.name, d);
                if (u.initializer)
                    p += " = " + pp(u.initializer, d);
            }
            break;

          case DEBUGGER:
            p += "debugger NYI\n";
            break;

          case SEMICOLON:
            if (n.expression) {
                p += pp(n.expression, d) + ";";
            }
            break;

          case LABEL:
            p += n.label + ":\n" + pp(n.statement, d);
            break;

          case COMMA:
          case LIST:
            var nc = n.children;
            for (var i = 0, j = nc.length; i < j; i++) {
                if (i > 0)
                    p += ", ";
                p += pp(nc[i], d);
            }
            break;

          case ASSIGN:
            var nc = n.children;
            var t = n.assignOp;
            p += pp(nc[0], d) + " " + (t ? tokens[t] : "") + "="
                              + " " + pp(nc[1], d);
            break;

          case HOOK:
            var nc = n.children;
            p += "(" + pp(nc[0], d) + " ? "
                     + pp(nc[1], d) + " : "
                     + pp(nc[2], d);
            p += ")";
            break;

          case OR:
          case AND:
            var nc = n.children;
            p += "(" + pp(nc[0], d) + " " + tokens[n.type] + " "
                     + pp(nc[1], d);
            p += ")";
            break;

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
          case IN:
          case INSTANCEOF:
          case LSH:
          case RSH:
          case URSH:
          case PLUS:
          case MINUS:
          case MUL:
          case DIV:
          case MOD:
            var nc = n.children;
            p += "(" + pp(nc[0], d) + " " + tokens[n.type] + " "
                     + pp(nc[1], d) + ")";
            break;

          case DELETE:
          case VOID:
          case TYPEOF:
            p += tokens[n.type] + " "  + pp(n.children[0], d);
            break;

          case NOT:
          case BITWISE_NOT:
            p += tokens[n.type] + pp(n.children[0], d);
            break;

          case UNARY_PLUS:
            p += "+" + pp(n.children[0], d);
            break;

          case UNARY_MINUS:
            p += "-" + pp(n.children[0], d);
            break;

          case INCREMENT:
          case DECREMENT:
            if (n.postfix) {
                p += pp(n.children[0], d) + tokens[n.type];
            } else {
                p += tokens[n.type] + pp(n.children[0], d);
            }
            break;

          case DOT:
            var nc = n.children;
            p += pp(nc[0], d) + "." + pp(nc[1], d);
            break;

          case INDEX:
            var nc = n.children;
            p += pp(nc[0], d) + "[" + pp(nc[1], d) + "]";
            break;

          case CALL:
            var nc = n.children;
            p += pp(nc[0], d) + "(" + pp(nc[1], d) + ")";
            break;

          case NEW:
          case NEW_WITH_ARGS:
            var nc = n.children;
            p += "new " + pp(nc[0], d);
            if (nc[1])
                p += "(" + pp(nc[1], d) + ")";
            break;

          case ARRAY_INIT:
            p += "[";
            var nc = n.children;
            for (var i = 0, j = nc.length; i < j; i++) {
                if(nc[i])
                    p += pp(nc[i], d);
                p += ","
            }
            p += "]";
            break;

          case ARRAY_COMP:
            p += "[" + pp (n.expression, d) + " ";
            p += pp(n.tail, d);
            p += "]";
            break;

          case COMP_TAIL:
            var nc = n.children;
            for (var i = 0, j = nc.length; i < j; i++) {
                if (i > 0)
                    p += " ";
                p += pp(nc[i], d);
            }
            if (n.guard)
                p += " if (" + pp(n.guard, d) + ")";
            break;

          case OBJECT_INIT:
            var nc = n.children;
            if (nc[0] && nc[0].type === PROPERTY_INIT)
                p += "{\n";
            else
                p += "{";
            for (var i = 0, j = nc.length; i < j; i++) {
                if (i > 0) {
                    p += ",\n";
                }

                var t = nc[i];
                if (t.type === PROPERTY_INIT) {
                    var tc = t.children;
                    var l;
                    /*
                      * See if the left needs to be quoted.
                      *
                      * N.B. If negative numeral prop names ever get converted
                      * internally to numbers by the parser, we need to quote
                      * those also.
                      */
                    var propName = tc[0].value;
                    if (typeof propName === "string" && !lexer.isIdentifier(propName)) {
                        l = nodeStr(tc[0]);
                    } else {
                        l = pp(tc[0], d);
                    }
                    p += indent(4, l) + ": " +
                         indent(4, pp(tc[1], d)).substring(4);
                } else {
                    p += indent(4, pp(t, d));
                }
            }
            p += "\n}";
            break;

          case NULL:
            p += "null";
            break;

          case THIS:
            p += "this";
            break;

          case TRUE:
            p += "true";
            break;

          case FALSE:
            p += "false";
            break;

          case IDENTIFIER:
          case NUMBER:
          case REGEXP:
            p += n.value;
            break;

          case STRING:
            p += nodeStr(n);
            break;

          case GROUP:
            p += "(" + pp(n.children[0], d) + ")";
            break;

          default:
            throw "PANIC: unknown operation " + tokens[n.type] + " " + n.toSource();
        }

        if (n.parenthesized)
            p += ")";

        return p;
    }

    return {
        pp: pp
    };

}());

/* File jit/compiler/definitions.js*/
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

RiverTrail.definitions = function () {
    var tokens= [ "CAST", "TOINT32", "FLATTEN" ];
    const offset = Narcissus.definitions.tokens.length;

    var consts = "const ";
    for (var idx = 0; idx < tokens.length; idx++) {
        consts += tokens[idx] + "=" + (offset + idx);
        if (idx < tokens.length - 1) {
            consts += ",";
        }
    }
    consts += ";";

    // add all tokens into a single array
    tokens = Narcissus.definitions.tokens.concat(tokens);

    return {"consts" : consts, "tokens" : tokens};
}();



/* File jit/compiler/helper.js*/
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
    function isCData(dataInstance) {
        return dataInstance !== undefined && dataInstance.name === "CData";
    };
    function isWebCLBufferObject(dataInstance) {
        return dataInstance !== undefined && dataInstance._name === "WebCLBuffer";
    };


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
        [Uint16Array, "unsigned short"],
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
            // The ParallelArray may not have been materialized yet
            if(pa.data !== undefined && (!isWebCLBufferObject(pa.data))) {
                pa.elementalType = inferTypedArrayType(pa.data);
            }
            else if(isTypedArray(pa.hostAllocatedObject)) {
                pa.elementalType = inferTypedArrayType(pa.hostAllocatedObject);
            }
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
             "isCData" : isCData,
             "isWebCLBufferObject" : isWebCLBufferObject,
             "inferTypedArrayType" : inferTypedArrayType,
             "cloneFunction" : cloneFunction,
             "nameGen" : nameGen,
             "parseFunction" : parseFunction,
             "reportError" : reportError,
             "reportBug" : reportBug,
             "findSelectionRoot" : findSelectionRoot,
             "isArrayLiteral" : isArrayLiteral,
             "compareObjectFields" : compareObjectFields,
             "allocateAlignedTA" : allocateAlignedTA,
    };

}();

/* File jit/compiler/runtimes.js*/
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

/*
 * JS: Interface and definitions of adapters to a platform OpenCL runtime
*/


"use strict";

if(RiverTrail === undefined) {
    var RiverTrail = {};
}
RiverTrail.SupportedInterfaces = {};

RiverTrail.SupportedInterfaces.RiverTrailAdapter = function() {
    var _setArgument = function(k, i, a) {
        return setArgument(k.id, i, a.id);
    };
    var _setScalarArgument = function(k, i, a, isInteger, is64bit) {
        return setScalarArgument(k.id, i, a, isInteger, is64bit);
    };
    var _run = function(k, r, i) {
        return run(k.id, r, i);
    };
    var _getValue = function(b, v, f) {
        return getValue(b.id, v, f);
    };
    return {
        name: "RiverTrailExtension",
        initContext: window.initContext,
        is64BitFloatingPointEnabled: window.is64BitFloatingPointEnabled,
        compileKernel: window.compileKernel,
        mapData: window.mapData,
        getBuildLog: window.getBuildLog,
        setArgument: _setArgument,
        setScalarArgument: _setScalarArgument,
        run: _run,
        getValue: _getValue
    };
}

RiverTrail.SupportedInterfaces.WebCLAdapter = function() {
    var context;
    var device;
    var commandQueue;
    var failureMem;
    var failureMemCLBuffer;
    var _initContext = function() {
            
        var availablePlatforms = webcl.getPlatforms ();
        var supportedPlatform = null;
        for (var i in availablePlatforms) {
            if(availablePlatforms[i]
                    .getInfo(WebCL.PLATFORM_NAME)
                    .indexOf("Intel(R)") === 0)
                supportedPlatform = availablePlatforms[i];
        }
        if(supportedPlatform === null)
            throw "[WebCL Runtime] : No supported OpenCL platforms found!";

        context = webcl.createContext(supportedPlatform);
        device = context.getInfo(WebCL.CONTEXT_DEVICES)[0];
        commandQueue = context.createCommandQueue(device);
        failureMem = new Int32Array(1);
        failureMem[0] = 0;
        failureMemCLBuffer = null;
    };
    var _is64BitFloatingPointEnabled = function() {
        // TODO: clGetPlatformInfo should tell us this.
        return false;
    };
    var _compileKernel =
        function(kernelSource, kernelName) {
            var program = context.createProgram(kernelSource);
            try {
                program.build ([device], "");
            } catch(e) {
                alert ("Failed to build WebCL program. Error "
                 + program.getBuildInfo (device, 
                   WebCL.PROGRAM_BUILD_STATUS)
                 + ":  " + program.getBuildInfo (device, 
                   WebCL.PROGRAM_BUILD_LOG));
                throw e;
            }
            var kernel;
            try {
                kernel = program.createKernel(kernelName);
            } catch(e) {
                alert("Failed to create kernel: " + e.message);
                throw e;
            }
            try {
                failureMemCLBuffer = _mapData(failureMem, true);
                commandQueue.enqueueWriteBuffer(failureMemCLBuffer, false, 0, 4, failureMem);
            } catch (e) {
                alert("Failed to create buffer for failureMem: " + e.message);
                throw e;
            }
            return kernel;
    };
    var _mapData = function(a, isWriteOnly) {
        var clbuffer;
        var bufferFlags = (isWriteOnly !== undefined) ? WebCL.MEM_WRITE_ONLY :
            WebCL.MEM_READ_WRITE;
        try {
            clbuffer = context.createBuffer(bufferFlags, a.byteLength, a);
        } catch(e) {
            alert("Could not create buffer: " + e.message);
            throw e;
        }
        return clbuffer;
    };
    var RIVERTRAIL_NUM_ARTIFICAL_ARGS = 1;
    var _setArgument = function(k, i, a) {
        var ret;
        try {
            ret = k.setArg(i+RIVERTRAIL_NUM_ARTIFICAL_ARGS, a);
        } catch (e) {
            alert("SetArgument failed: " + e.message + " at index " + (i+RIVERTRAIL_NUM_ARTIFICAL_ARGS).toString());
            throw e;
        }
        return ret;
    };
    var _setScalarArgument = function(k, i, a, isInteger, is64Bit) {
        var template;
        if(isInteger)
            template = Uint32Array;
        else if(!is64Bit)
            template = Float32Array;
        else
            template = Float64Array;
        var ret;
        try {
            ret = k.setArg(i+RIVERTRAIL_NUM_ARTIFICAL_ARGS, new template([a]));
        } catch (e) {
            alert("SetScalarArgument failed: " + e.message + " at index " + (i+RIVERTRAIL_NUM_ARTIFICAL_ARGS).toString());
            throw e;
        }
        return ret;
    };
    var _run = function(k, r, i) {
        try {
            k.setArg(0, failureMemCLBuffer);
        } catch(e) {
            alert("SetArgument for failureMem failed: " + e.message);
            throw e;
        }
        try {
            commandQueue.enqueueNDRangeKernel(k, r, null, i, null);
        } catch (e) {
            alert("kernel run failed: " + e.message);
            throw e;
        }
        // TODO: Read failureMem
    };
    var _getValue = function(b, ta) {
        commandQueue.enqueueReadBuffer(b, false, 0, ta.byteLength, ta);
        commandQueue.finish();
    };
    var _getBuildLog = function () {
        return "BuildLog (WebCL adapter) not implemented yet";
    }
    return {
        name: "WebCL",
        initContext: _initContext,
        is64BitFloatingPointEnabled: _is64BitFloatingPointEnabled,
        compileKernel: _compileKernel,
        mapData: _mapData,
        setArgument: _setArgument,
        setScalarArgument: _setScalarArgument,
        run: _run,
        getValue: _getValue,
        getBuildLog: _getBuildLog
    };
}

RiverTrail.runtime = (function() {
    if(window.riverTrailExtensionIsInstalled !== undefined) {
        return RiverTrail.SupportedInterfaces.RiverTrailAdapter();
    }
    else if(window.webcl !== undefined) {
        return RiverTrail.SupportedInterfaces.WebCLAdapter();
    }
    else {
        throw "No OpenCL adapters found";
        return undefined;
    }
})();




/* File ParallelArray.js*/
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

// See documentation for the `ParallelArray` constructor at:
// https://github.com/IntelLabs/RiverTrail/wiki/ParallelArray
var ParallelArray = function () {

    // N.B.: A ParallelArray's `flat` attribute should be `true` if it
    // is either a JS array of numbers or a TypedArray.  If it is a
    // nested JS array, `flat` should be set to `false`.
    
    // use Proxies to emulate square bracket index selection on ParallelArray objects
    var enableProxies = false;

    // Check whether the new extension is installed.
    var extensionIsInstalled = false;
    try {
        if (RiverTrail.runtime !== undefined) {
            extensionIsInstalled = true;
        }
    } catch (ignore) {
        console.log("It looks like the extension isn't installed.")
    }

    // check whether the OpenCL implementation supports double
    var enable64BitFloatingPoint = false;
    try {
        if (RiverTrail.runtime.is64BitFloatingPointEnabled !== undefined) {
            enable64BitFloatingPoint = RiverTrail.runtime.is64BitFloatingPointEnabled();
        }
    } catch (ignore) {
        console.log("It looks like 64-bit floating point isn't supported.")
    }
    console.log("enable64BitFloatingPoint: " + enable64BitFloatingPoint);

    // this is the storage that is used by default when converting arrays 
    // to typed arrays.
    var defaultTypedArrayConstructor 
    = extensionIsInstalled ? (enable64BitFloatingPoint ? Float64Array : Float32Array)
                    : Array;
    // the default type assigned to JavaScript numbers
    var defaultNumberType = enable64BitFloatingPoint ? "double" : "float";

    // whether to use kernel caching or not
    var useKernelCaching = true;
    // whether to use lazy communication of openCL values
    var useLazyCommunication = false;
    // whether to cache OpenCL buffers is now a property configured in driver.js!
    // -- var useBufferCaching = false;
    // whether to do update in place in scan
    var useUpdateInPlaceScan = false;

    // sanity checking
    if (useUpdateInPlaceScan && !useLazyCommunication) {
        console.log("RiverTrail: useUpdateInPlaceScan requires useLazyCommuniation. Disabling...");
        useUpdateInPlaceScan = false;
    }

    // For debugging purposed each parallel array I create has a fingerprint.
    var fingerprint = 0;
    var fingerprintTracker = [];

    var Constants = {
        // Some constants, when constants are added to JS adjust accordingly 
        "zeroStrideConstant"    : [ ],
        "oneStrideConstant"     : [1],
        "emptyRawArrayConstant" : new defaultTypedArrayConstructor(),
        "zeroArrayShapeConstant": [0]
    };

    // I create three names for Error here so that we can, should we ever wish
    // distinguish both or have our own implementation for exceptions
    var CompilerError = Error;   // compilation failed due to wrong program or missing support
    var CompilerBug = Error;     // something went wrong although it should not
    var CompilerAbort = Error;   // exception thrown to influence control flow, e.g., misspeculation
    
    // helper function that throws an exception and logs it if verboseDebug is on
    var debugThrow = function (e) {
        if (RiverTrail.compiler.verboseDebug) {
            console.log("Exception: ", JSON.stringify(e));
        }
        throw e;
    };

    // This method wraps the method given by property into a loader for the
    // actual values of the ParallelArray. On first invocation of the given
    // method, the function materialize is called before the underlying
    // method from the prototype/object is executed.
    var requiresData = function requiresData(pa, property) {
        pa[property] = function () {
            pa.materialize();
            if (!delete pa[property]) throw new CompilerBug("Deletion of overloaded " + property + " failed");
            return pa[property].apply(pa, arguments);
        };
    };

    // If this.data is a OpenCL memory object, grab the values and store the OpenCL memory 
    // object in the cache for later use.
    var materialize = function materialize() {
        /*
        if (RiverTrail.Helper.isWebCLBufferObject(this.data) && RiverTrail.runtime.name === "WebCL") {
            // we have to first materialise the values on the JavaScript side
            RiverTrail.runtime.getValue(this.data, this.hostAllocatedObject);
            this.data = this.hostAllocatedObject;
        }
        */
    };

    // Returns true if the values for x an y are withing fuzz.
    // The purpose is to make sure that if a 64 bit floats is 
    // to a 32 bit float and back that they are recognized as 
    // fuzzyEqual.
    // This is clearly wrong but need to check with TS to figure out hte
    // right way to do this.
    var defaultFuzz = .0000002; // 32 bit IEEE654 has 1 bit of sign, 8 bits of exponent, and 23 bits of mantissa
                                // .0000002 is between 1/(2**22) and 1/(2*23) 
    var fuzzyEqual = function fuzzyEqual (x, y, fuzz) {
        var diff = x - y; // do the diff now to avoid losing percision from doing abs.
        if (diff < 0) {
            diff = -diff;
        }
        var absX = (x>0)?x:-x;
        var absY = (y>0)?y:-y;
        var normalizedFuzz = ((absX > absY) ? absY : absX) * fuzz; // Avoids 0 if both aren't 0
        if (diff <= normalizedFuzz) { // <= so that 0, 0 works since fuzz will go to 0.
             return true;
        } 
        return false;
    };

    // Converts the given Array (first argument) into a typed array using the constructor
    // given as second argument. Validity of conversion is ensured by comparing the result
    // element-wise using === with the source. If no constructor is provided, the default
    // is used.
    var convertToTypedArray = function convertToTypedArray(src, arrayConstructor) {
        var constructor 
            = arrayConstructor ? arrayConstructor : defaultTypedArrayConstructor;
        if (src.constructor === constructor) {
            // transforming the array into an array of the same kind
            // makes little sense. Besides, if the constructor is the
            // Array constructor, applying it twice will yield a 
            // doubly nested array!
            // this.elementalType = constructorToElementalType(constructor);
            return src;
        } else {
            var newTA = new constructor(src);
            if (arrayConstructor === undefined) {
                if (src.every(function (val, idx) { return fuzzyEqual(val, newTA[idx], defaultFuzz); })) {
                    return newTA;
                } else {
                    return undefined;
                }
            } else {
                // we force a typed array due to semantics, so we do not care
                // whether the resulting values match
                return newTA;
            }
        }
    };

    // late binding of isTypedArray in local namespace
    var isTypedArray = function lazyLoad(arg) {
        isTypedArray = RiverTrail.Helper.isTypedArray;
        return isTypedArray(arg);
    }

    var equalsShape = function equalsShape (shapeA, shapeB) {
        return ((shapeA.length == shapeB.length) &&
                Array.prototype.every.call(shapeA, function (a,idx) { return a == shapeB[idx];}));
    };

    var shapeToStrides = function shapeToStrides(shape) {
        var strides;
        var i;
        if (shape.length == 1) {
            // Optimize for common case.
            return Constants.oneStrideConstant;
        }
        if (shape.length == 0) {
            return Constants.zeroStrideConstant;
        }
        strides = new Array(shape.length);
        strides[strides.length-1] = 1;
        for (i = strides.length-2; i >= 0; i--) {
            // Calculate from right to left with rightmost being 1.
            strides[i] = shape[i+1]*strides[i+1];
        }
        // console.log("shapeToStrides: ", strides);
        return strides;
    };

    // Given the shape of an array return the number of elements.
    var shapeToLength = function shapeToLength (shape) {
        var i;
        var result;
        if (shape.length == 0) {
            return 0;
        }
        result = shape[0];
        for (i=1; i<shape.length;i++) {
            result = result * shape[i];
        }
        return result;
    };

    // Flatten a multidimensional array to a single dimension.
    var createFlatArray = function createFlatArray (arr) {
        // we build localShape and localRank as we go
        var localShape = [];
        var localRank = undefined;
        var flatArray = new Array();
        var flatIndex = 0;

        var flattenFlatParallelArray = function flattenFlatParallelArray (level, pa) {
            // We know we have a parallel array, we know it is flat.
            // Flat arrays are flat all the way down.
            // update/check localShape and localRank
            pa.shape.forEach( function (v, idx) { 
                    if (localShape[level+idx] === undefined) {
                        localShape[level+idx] = v;
                    } else if (localShape[level+idx] !== v) {
                        //throw "wrong shape of nested PA at " + idx + " local " + v + "/global " + localShape[level+idx];
                        throw "shape mismatch: level " + (level+idx) + " expected " + localShape[level+idx] + " found " + v;
                    }
                });
            if (localRank === undefined) {
                localRank = level + pa.shape.length;
            } else if (localRank !== level + pa.shape.length) {
                throw "dimensionality mismatch; expected " + localRank + " found " + (level + pa.shape.length);
            }
            var i;       
            var size = shapeToLength(pa.shape);
            pa.materialize(); // we have to materialize the array first!
            for (i=pa.offset;i<pa.offset+size;i++) {
                flatArray[flatIndex] = pa.data[i];    
                flatIndex++;
            }
        };
        var flattenInner = function flattenInner (level, arr) {
            var i = 0;
            var thisLevelIndex = 0;
            if (arr instanceof ParallelArray) {
                if (arr.flat) {
                    flattenFlatParallelArray(level, arr);
                    return;
                }
            }
            if (localShape[level] === undefined) {
                localShape[level] = arr.length;
            } else if (localShape[level] !== arr.length) {
                // We do not have a regular array.
                throw "shape mismatch: level " + (level) + " expected " + localShape[level] + " found " + arr.length;
            }
            for (thisLevelIndex=0;thisLevelIndex<arr.length;thisLevelIndex++) {
                if (arr[thisLevelIndex] instanceof Array) { // need to add regular array check...
                    flattenInner(level+1, arr[thisLevelIndex]);
                } else if (arr[thisLevelIndex] instanceof ParallelArray) {
                    if (arr[thisLevelIndex].flat) {
                        // Flat arrays are flat all the way down.
                        flattenFlatParallelArray(level+1, arr[thisLevelIndex]);
                    } else {
                        flattenInner(level+1, arr[thisLevelIndex].get(i));
                    }
                } else {
                    // it's not an array or ParallelArray so it is just an element.
                    flatArray[flatIndex] = arr[thisLevelIndex];
                    flatIndex++;
                    // check for rank uniformity
                    if (localRank === undefined) {
                        localRank = level;
                    } else if (localRank !== level) {
                        throw "dimensionality mismatch; expected " + localRank + " found " + level;
                    }
                }
            }
        };  // flattenInner
        try {
            flattenInner(0, arr);
        } catch (err) {
            console.log("flattenArray:", err);
            return null;
        };
        return flatArray;
    };

    // Given a nested regular array return its shape.
    var arrShape = function arrShape (arr) {
        var result = [];
        while ((arr instanceof Array) || (arr instanceof ParallelArray)) {
            if (arr instanceof Array) {
                result.push(arr.length);
                arr = arr[0];
            } else {
                // It is a ParallelArray
                result.push(arr.shape[0]);
                arr = arr.get(0);
            }
        }
        return result;
    };

    // Proxy handler for mapping [<number>] and [<Array>] to call of |get|.
    // The forwarding part of this proxy is taken from
    // https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Proxy
    // which in turn was copied from the ECMAScript wiki at
    // http://wiki.ecmascript.org/doku.php?id=harmony:proxies&s=proxy
    var makeIndexOpHandler = function makeIndexOpProxy (obj) {
        return {  
            // Fundamental traps  
            getOwnPropertyDescriptor: function(name) {  
                var desc = Object.getOwnPropertyDescriptor(obj, name);  
                // a trapping proxy's properties must always be configurable  
                if (desc !== undefined) { desc.configurable = true; }  
                return desc;  
            },  
            getPropertyDescriptor:  function(name) {  
                var desc = Object.getPropertyDescriptor(obj, name); // not in ES5  
                // a trapping proxy's properties must always be configurable  
                if (desc !== undefined) { desc.configurable = true; }  
                return desc;  
            },  
            getOwnPropertyNames: function() {  
                return Object.getOwnPropertyNames(obj);  
            },  
            getPropertyNames: function() {  
                return Object.getPropertyNames(obj);                // not in ES5  
            },  
            defineProperty: function(name, desc) {  
                Object.defineProperty(obj, name, desc);  
            },  
            delete: function(name) { return delete obj[name]; },     
            fix: function() {  
                if (Object.isFrozen(obj)) {  
                    return Object.getOwnPropertyNames(obj).map(function(name) {  
                               return Object.getOwnPropertyDescriptor(obj, name);  
                           });  
                }  
                // As long as obj is not frozen, the proxy won't allow itself to be fixed  
                return undefined; // will cause a TypeError to be thrown  
            },  

            // derived traps  
            has:          function(name) { return name in obj; },  
            hasOwn:       function(name) { return Object.prototype.hasOwnProperty.call(obj, name); },  
            get:          function(receiver, name) { 
                var idx = parseInt(name);
                if (idx == name) {
                    return obj.get(idx);
                } else {
                    return obj[name];
                } 
            },  
            set:          function(receiver, name, val) { obj[name] = val; return true; }, // bad behavior when set fails in non-strict mode  
            enumerate:    function() {  
                var result = [];  
                for (name in obj) { result.push(name); };  
                return result;  
            },  
            keys: function() { return Object.keys(obj) }  
        };  
    }  
        

    // Helper for constructor that generates an empty array.
    var createEmptyParallelArray = function createEmptyParallelArray () {
        this.data     = Constants.emptyRawArrayConstant;
        this.shape    = Constants.zeroArrayShapeConstant;
        this.strides  = Constants.oneStrideConstant;
        this.flat     = true;
        this.offset   = 0;
        return this;
    };

    var createHostAllocatedParallelArray = function (cdata, values, shape) {
        if(!isTypedArray(values))
            throw "Cannot Create ParallelArray: Invalid Typed Array Object";
        // Get the contents of the underlying OpenCL buffer (cdata.id)
        // and write them into the `values` TypedArray.  Return the
        // results wrapped in a TypedArrayWrapper object.
        // This should run right after `getValue` does its work.
        var callback = function(typedArray) {
            this.data = typedArray;
        }
        var boundCallback = callback.bind(this);

        if(RiverTrail.Helper.isCData(cdata)) {
            RiverTrail.runtime.getValue(cdata, values, boundCallback);
        } else if(RiverTrail.Helper.isWebCLBufferObject(cdata)) {
            RiverTrail.runtime.getValue(cdata, values);
            this.data = values;
        } else 
            throw "Error creating new ParallelArray: Invalid CData object";

        // TypedArrays are always considered "flat".
        this.flat = true;
        this.shape = shape;
        this.strides = shapeToStrides(shape);
        this.offset = 0;
        this.isKnownRegular = true;

        return this;
    };
    // Helper for constructor that takes a single element, an array, a typed array, a 
    // ParallelArray, or an image of values. The optional second argument unfluences which
    // kind of typed array is tried. 
    var createSimpleParallelArray = function createSimpleParallelArray(values, targetType) {
        if (values instanceof Array) {
            var flatArray = createFlatArray(values);
            if (flatArray == null) { // We couldn't flatten the array, it is irregular
                this.data = new Array(values.length);
                this.flat = false;
                for (i=0;i<values.length;i++){
                    if (values[i] instanceof Array) {
                        this.data[i] = new ParallelArray(values[i]);
                    } else {
                        this.data[i] = values[i];
                    }
                }
            } else { // we have a flat array.
                this.shape = arrShape(values); 
                this.strides = shapeToStrides(this.shape); 
                this.flat = true;
                this.offset = 0;
                this.data = convertToTypedArray(flatArray, targetType); 
                if (this.data === undefined) this.data = flatArray;
            }
        } else if (values instanceof ParallelArray) {
            // Parallel Arrays can share data since they are immutable.
            this.flat = values.flat;
            if (this.flat) {            
                this.shape = values.shape;
                this.strides = values.strides;
                this.offset = values.offset;
            }
            if (targetType === undefined) {
                this.data = values.data; // ParallelArrays are read only so reuse data
                this.elementalType = values.elementalType;
            } else {
                values.materialize();
                this.data = new targetType(values.data);
            }
        } else if (isTypedArray(values)) {
            this.flat = true;
            this.strides = Constants.oneStrideConstant;
            this.offset = 0;
            this.shape = [values.length];
            // We create a new typed array and copy the source elements over.
            // Just calling the constructor with the source array would not
            // suffice as typed arrays share the underlying buffer...
            this.data = new values.constructor(values.length); 
            for (var i = 0; i < values.length; i++) {
                this.data[i] = values[i];
            }
            this.isKnownRegular = true;
        } else if (values.getContext !== undefined) { // proxy for checking if it's a canvas
            var context = values.getContext("2d");
            var imageData = context.getImageData(0, 0, values.width, values.height);
            this.data = imageData.data;
            this.shape = [values.height,values.width,4];
            this.strides = [4*values.width,4,1];
            this.flat = true;
            this.offset = 0;
            this.isKnownRegular = true;
        } else {
            this.data = new defaultTypedArrayConstructor(1); 
            this.data[0] = values;
            if (this.data[0] !== values) {
                this.data = new Array(1);
                this.data[0] = values;
            }
            this.shape = Constants.oneStrideConstant;
            this.strides = Constants.oneStrideConstant;
            this.flat = true;
            this.offset = 0;
        }

        return this;
    };

    // Helper for constructor that builds an ParallelArray comprehension.
    var createComprehensionParallelArray = function createComprehensionParallelArray(sizeVector, theFunction, extraArgs) {
        var results;
        var tempVector;
        var scalarIndex = false;
        if (!(sizeVector instanceof Array)) {
            // Handles just passing the size of a 1 d array in as a number.
            tempVector = new Array(1);
            tempVector[0] = sizeVector;
            sizeVector = tempVector;
            scalarIndex = true;
        }
        // try to execute the comprehension in OpenCL
        try {
            return RiverTrail.compiler.compileAndGo(null, theFunction, scalarIndex ? "comprehensionScalar" : "comprehension", sizeVector, extraArgs, enable64BitFloatingPoint);
        } catch (e) {
            console.log("comprehension failed: " + e);
        }
        var left = new Array(0);
        results = buildRaw(this, left, sizeVector, arguments[1], extraArgs, scalarIndex);
        // SAH: once we have computed the values, we can fall back to the simple case.
        createSimpleParallelArray.call(this, results);
        return this;
    };
    
    var createOpenCLMemParallelArray = function( mobj, shape, type, offset) {
        this.data = mobj;
        this.shape = shape;
        this.elementalType = type;
        this.strides = shapeToStrides( shape);
        this.flat = true;
        this.offset = offset | 0;

        return this;
    };
    
    // Occasionally we want to surpress the actual execution of the OpenCL and just look at the verboseDebug
    // information. This reduces browser crashes and makes debugging easier. 
    // Normally this is false.
    var suppressOpenCL = false;
    //var suppressOpenCL = true;

    // kernelCompiler is the OCL parser and code generator. It is generated and placed here the first 
    // the the ParallelArray constructor is called.
    var kernelCompiler = false;

    // Used by the constructor to build a ParallelArray with given a size vector and a function.
    // Used by combine to build the new ParallelArray. 

    /***
        buildRaw
        
        Synopsis: 
            Used by the constructor to build a ParallelArray with given a size vector and a function.
            Used by combine to build the new ParallelArray.
        function buildRaw(theThisArray, left, right, fTemp, extraArgs);
        Arguments
            theThisArray: the array you are populating.
            fTemp: A function
            left: the indices when concatanated to right form the indices passed to fTemp or to a recursive call to buildRaw
            right: the indices when concatinated to left form the indices passed to fTemp
                    if right has only one index then the actual calls to fTemp are done for all indices from 0 to right[0]
            fTemp: The first arg is an array holding the indices of where the resulting element belongs along with any extraArg
            extraArgs: Args that are passed on to fTemp unchanged.
            scalarindex: If true, the index passed to the elemental function will be a scalar value
        Returns
            A freshly minted JS Array whose elements are the results of applying f to 
            the original ParallelArray (this) along with the indices holding where the resulting
            element is placed in the result. The indices are the concatination of the 
            arguments left and right. Any extraArgs are also passed to f.
            The expected use case for combine is for fTemp to reference this at the appropriate indices to
            build the new element.
            The expected use case for the constructors is to construct the element using the indices and the 
            extra args.
    ***/
    var buildRaw = function buildRaw(theThisArray, left, right, fTemp, extraArgs, scalarIndex) {
        var i;
        var elementalResult;
        var result;
        if (right.length == 1) {
            // Here is where you call the fTemp with the indices.
            var indices = new Array(left.length+1); // This ends up being the indices passed to the elemental function
            var applyArgs = new Array(extraArgs.length+1); // indices + extra args.
            for (i=0;i<extraArgs.length;i++) { // these are the args passed to the elemental functionleave the first arg open for indices.
                applyArgs[i+1] = extraArgs[i];
            }
            var result = new Array(right[0]); // The number of result to expect
            for (i=0;i<left.length; i++) {
                indices[i] = left[i]; // Transfer the non-changing indices.
            }
            for (i=0; i<right[0]; i++) {
                if (scalarIndex) {
                    applyArgs[0] = i;
                } else {
                    indices[left.length] = i; // This is the index that changes.
                    applyArgs[0] = indices;
                }
                
                elementalResult = fTemp.apply(theThisArray, applyArgs);
                if (elementalResult instanceof Array) {
                    result[i] = new ParallelArray(elementalResult);
                } else if (elementalResult instanceof ParallelArray) {
                    result[i] = elementalResult;
                } else {
                    result[i] = elementalResult;
                }
            }
            return result;
        }
        if (scalarIndex) {
            throw new CompilerBug("buildRaw called with scalarIndex === true but higher rank interation space");
        }
        // Build the new index vectors for the recursive call by moving an index from the right to the left.
        var newLeft = new Array(left.length+1);
        var newRight = right.slice(1); // Move the first right to the left.
        for (i=0;i<left.length;i++) {
            newLeft[i] = left[i];
        }
        newLeft[newLeft.length-1] = right[0];
        var range = newLeft[newLeft.length-1];
        result = new Array(range);
        for (i=0; i<range; i++) {
            newLeft[newLeft.length-1] = i;
            result[i] = buildRaw(theThisArray, newLeft, newRight, fTemp, extraArgs, scalarIndex);
        }
        return result;
    };

    // See documentation for the `partition` operation at:
    // https://github.com/IntelLabs/RiverTrail/wiki/partition
    var partition = function partition(partitionSize) {
        if (this.flat) {
            return partitionFlat(this, partitionSize);
        }
        var aSlice;
        var i;
        var partitionCount = this.length / partitionSize;
        var newArray = new Array(partitionCount);
        if (partitionCount*partitionSize != this.length) {
            throw new RangeError("ParallelArray.partition length not evenly divisible by partitionSize.");
        }
        for (i=0; i<partitionCount; i++) {
            aSlice = this.data.slice(i*partitionSize, (i+1)*partitionSize);
            newArray[i] = new ParallelArray(aSlice);
        }
        return new ParallelArray(newArray);
    };

    var partitionFlat = function partitionFlat(pa, partitionSize) {
        var newShape = new Array(pa.shape.length+1);
        var i;
        
        for (i=1;i<newShape.length;i++) {
            newShape[i]=pa.shape[i-1];
        }
        // At this point newShape[0] and newShape[1] need to be adjusted to partitionCount and partitionSize

        newShape[0] = newShape[1] / partitionSize;
        newShape[1] = partitionSize;
        
        if (shapeToLength(newShape) != shapeToLength(pa.shape)) {
            throw new RangeError("Attempt to partition ParallelArray unevenly.");
        }
        var newPA = new ParallelArray("reshape", pa, newShape);
        return newPA;
    };
    // Does this parallelArray have the following dimension?
    var isRegularIndexed = function isRegularIndexed(indices) {
        if (this.length != indices[0]) {
            return false;
        }
        if (indices.length == 1) {
            return true;
        }
        var i;
        //var result = true;
        // SH: the below call to slice should do the same
        // var tempIndices = new Array(indices.length-1);
        // for (i=0;i<indices.length-1;i++) {
        //     tempIndices[i] = indices[i+1];
        // }
        var tempIndices = indices.slice(1);
        // the below could be replaced by this but that would break encapsulation
        //return this.data.every( function checkElement(x) { return x.isRegularIndexed(tempIndices)} );
        for (i=0;i<this.length;i++) {
            if ((this.get(i).isRegularIndexed(tempIndices)) == false) {
                return false;
            }
        }
        return true;       
    };
    // Is this a regular array? 
    // At this point this does not check for type....
    var isRegular = function isRegular() {
        if (this.isKnownRegular === undefined) {
            if (this.flat) {
                this.isKnownRegular = true; // this probable should be changed to something isKnownRegular.
            } else {
                // Construct the indices for the first element
                var thisLevel = new Array(0);
                var indices = new Array(0);
                var level = this;
                while (level instanceof ParallelArray) {
                        indices.push(level.length);
                            level = level.get(0);
                    }
                // indices holds the length of the indices with the biggest at the start.
                if (this.isRegularIndexed(indices)) {
                    this.shape = indices;
                    this.isKnownRegular = true;
                } else {
                    this.isKnownRegular = false;
                }
            }
        } 
        
        return this.isKnownRegular;
    };
    // Get the shape of a regular array down to the depth requested.
    // Input depth maximum number of indices to invstigate.
    // If not provided then depth is infinite.
    var getShape = function getShape(depth) {
        if (!this.isRegular()) {
            throw new TypeError("this is not a regular ParallelArray.");
        }
        return (depth === undefined) ? this.shape.slice(0) : this.shape.slice(0, depth);
    };
   
    // When in the elemental function f "this" is the same as "this" in combine.
    var combineSeq = function combineSeq(depth, f) { // optional arguments follow
        var i;
        var result;
        var extraArgs; 
        var extraArgOffset = 2;
        if ((typeof(depth) === 'function') || (depth instanceof low_precision.wrapper)) {
            f = depth;
            depth = 1;
            extraArgOffset = 1;
        }
        if (f instanceof low_precision.wrapper) {
            f = f.unwrap();
        }
        if (!this.isRegular()) {
            throw new TypeError("ParallelArray.combineSeq this is not a regular ParallelArray.");
        }
        if (arguments.length == extraArgOffset) {
            extraArgs = new Array();
        } else {
            extraArgs = new Array(arguments.length-extraArgOffset);
            for (i=0;i<extraArgs.length;i++) {
               extraArgs[i] = arguments[i+extraArgOffset];
            }
        }
        result = buildRaw(this, (new Array(0)), this.getShape(depth), f, extraArgs, false);
        // SAH temporarily until cast is implemented
        return new ParallelArray(result);
        return new ParallelArray(this.data.constructor, result);
    };

    // See documentation for the `combine` operation at:
    // https://github.com/IntelLabs/RiverTrail/wiki/combine
    var combine = function combine() { // optional arguments follow
        var i;
        var paResult;
        var extraArgs; 
        var extraArgOffset = 2;
        var depth;
        var f;
        var usage = "ParallelArray.combine(<optional depth>, function object, <optional extra arguments)";
        if(arguments.length < 1)
            throw "Not enough arguments to combine. Usage: " + usage;
        // The case where depth is not specified
        if(typeof(arguments[0]) === 'function'
                || (arguments[0] instanceof low_precision.wrapper)) {
            depth = 1;
            f = arguments[0];
            extraArgOffset = 1;
        }
        // The case where depth is specified
        else if((typeof(arguments[1]) === 'function' 
                    || (arguments[1] instanceof low_precision.wrapper))
                && typeof(arguments[0]) === 'number') {
            depth = arguments[0];
            f = arguments[1];
        }
        else {
            throw "Invalid arguments to combine. Usage: " + usage;
        }
        if (!this.isRegular()) {
            throw new TypeError("ParallelArray.combine: This is not a regular ParallelArray.");
        }
        if (arguments.length == extraArgOffset) {
            extraArgs = new Array(0);
        } else {
            // depth is _not_ part of the arguments passed to the elemental function
            extraArgs = new Array(arguments.length-extraArgOffset);
            // depth and function account for the 2
            for (i=0;i<extraArgs.length;i++) {
               extraArgs[i] = arguments[i+extraArgOffset];
            }
        }
        paResult = RiverTrail.compiler.compileAndGo(this, f, "combine", depth, extraArgs, enable64BitFloatingPoint);
        return paResult;
    };

    // Sequential version of `map` that doesn't compile to OpenCL.
    var mapSeq = function mapSeq (f) { // extra args passed unchanged and unindexed.
        var len = this.shape[0];
        var i, j;
        var fTemp = f;
        var args = new Array(arguments.length-1);
        var result = new Array(len);
        
        // SAH: for now we have to manually unwrap. Proxies might be a solution but they 
        //      are too underspecified as of yet
        if (f instanceof low_precision.wrapper) {
            f = f.unwrap();
        }

        if (arguments.length == 1) { // Just a 1 arg function.
            for (i=0;i<len;i++) {
                result[i] = f.apply(this, [this.get(i)]);
            }
        } else {
            for (i=0;i<len;i++) {
                for (j=1;j<arguments.length;j++) {
                    args[j] = arguments[j];
                }              
                args[0] = this.get(i);
                result[i] = f.apply(this, args);
            }
        }
        // SAH: temporary fix until we use cast
        if (this.data.constructor === Float32Array) {
            // Not sure what to do here we have a Float32Array and we are using
            // these typed arrays to hold our data. Maintaining Float32Array will
            // potentially only loose precision, this is less of a problem than
            // converting floats to say 8 bit clamped ints. 
            return new ParallelArray(this.data.constructor, result);
        }
        return new ParallelArray(result);
        return new ParallelArray(this.data.constructor, result);
    };

    // See documentation for the `map` operation at:
    // https://github.com/IntelLabs/RiverTrail/wiki/map
    var map = function map (f) { // extra args passed unchanged and unindexed.
        var len = this.shape[0];
        var args = new Array(arguments.length-1);
        var paResult;
        if (arguments.length === 1) { // no extra arguments present
            paResult = RiverTrail.compiler.compileAndGo(this, f, "map", 1, args, enable64BitFloatingPoint);
        } else {            
            for (var j=1;j<arguments.length;j++) {
                args[j-1] = arguments[j];                    
            }
            paResult = RiverTrail.compiler.compileAndGo(this, f, "map", 1, args, enable64BitFloatingPoint); 
        }
        return paResult;
    };

    // See documentation for the `reduce` operation at:
    // https://github.com/IntelLabs/RiverTrail/wiki/reduce
    var reduce = function reduce(f) {
        // SAH: for now we have to manually unwrap. Proxies might be a solution but they 
        //      are too underspecified as of yet
        if (f instanceof low_precision.wrapper) {
            f = f.unwrap();
        }

        var callArguments = Array.prototype.slice.call(arguments, 0); // array copy
        callArguments.unshift(0);

        var len = this.shape[0];
        var result;
        var i;

        callArguments[0] = this.get(0);
        for (i=1;i<len;i++) {
            callArguments[1] = this.get(i);
            callArguments[0] = f.apply(this, callArguments);
        }

        return callArguments[0];
    };

    // See documentation for the `scan` operation at:
    // https://github.com/IntelLabs/RiverTrail/wiki/scan
    var scan = function scan(f) {    
        // SAH: for now we have to manually unwrap. Proxies might be a solution but they 
        //      are too underspecified as of yet
        if (f instanceof low_precision.wrapper) {
            f = f.unwrap();
        }

        if (this.getShape()[0] < 2) {
            // 
            // handle case where we only have one row => the result is the first element
            //
            return this;
        }
        var i;

        var len = this.length;
        var rawResult = new Array(len);
        var movingArg;
        var callArguments = Array.prototype.slice.call(arguments, 0); // array copy
        var ignoreLength = callArguments.unshift(0); // callArguments now has 2 free location for a and b.
        if (this.getShape().length < 2) {
            // 
            // Special case where selection yields a scalar element. Offloading the inner
            // kernel to OpenCL is most likely not beneficial and we cannot use the offset
            // based selection as get does not yield a Parallel Array. Using a naive for
            // loop instead.
            //
            rawResult[0] = this.get(0);
            for (i=1;i<len;i++) {
                callArguments[0] = rawResult[i-1];
                callArguments[1] = this.get(i);;
                rawResult[i] = f.apply(this, callArguments);
            }
            return (new ParallelArray(rawResult));
        }
        // 
        // We have a n-dimensional parallel array, so we try to use offset based selection
        // and speculative OpenCL exectution
        //
        var scanCount = 0;
        var copySize;
        // Mutable and knows about the internal offset structure.
        // The offset now points to the second element this.data[1].
        // since the first one is the first one in the result.
        // Pick up the stride from this to use to step through the array
        var localStride = this.strides[0];

        if (useUpdateInPlaceScan) {
            // SAH: I speculate that the scan operation is shape uniform. If it is not, 
            //      performance goes down the drain anyways so a few extra executions won't 
            //      matter.
            try {
                rawResult[0] = this.get(0);
                movingArg = this.get(1);
                callArguments[0] = rawResult[0];
                callArguments[1] = movingArg;
                rawResult[1] = f.apply(this, callArguments);
                var last = rawResult[1];

                if ((last.data instanceof Object) &&
                    equalsShape(rawResult[0].getShape(), last.getShape())) {
                    // this was computed by openCL and the function is shape preserving.
                    // Try to preallocate and compute the result in place!
                    // We need the real data here, so materialize it
                    last.materialize();
                    this.materialize();
                    // create a new typed array for the result and store it in updateinplace
                    var updateInPlace = RiverTrail.Helper.allocateAlignedTA(last.data.constructor, this.data.length);
                    // copy the first line into the result
                    for (i=0; i<localStride; i++) {
                        updateInPlace[i] = this.data[i];
                    }
                    // copy the second line into the result
                    var result = undefined;
                    for (i=0; i <localStride; i++) {
                        updateInPlace[i+localStride] = last.data[i];
                    }
                    // create a new parallel array to pass as prev
                    var updateInPlacePA = this.get(0);
                    // swap the data store of the updateInPlacePA
                    updateInPlacePA.data = updateInPlace;
                    // add a self reference in case combine is called on this argument
                    updateInPlacePA.updateInPlacePA = updateInPlacePA;
                    updateInPlacePA.updateInPlaceOffset = localStride;
                    updateInPlacePA.updateInPlaceShape = last.shape;
                    // set up the arguments
                    callArguments[0] = updateInPlacePA;
                    callArguments[1] = movingArg;
                    // set the write offset and updateInPlace info
                    movingArg.updateInPlacePA = updateInPlacePA;
                    movingArg.updateInPlaceOffset = localStride;
                    movingArg.updateInPlaceShape = last.shape;
                    for (i=2;i<len;i++) {
                        // Effectivey change movingArg to refer to the next element in this.
                        movingArg.offset += localStride;
                        updateInPlacePA.offset += localStride;
                        movingArg.updateInPlaceOffset += localStride;
                        updateInPlacePA.updateInPlaceOffset += localStride;
                        updateInPlacePA.updateInPlaceUses = 0;
                        // i is the index in the result.
                        result = f.apply(this, callArguments);
                        if (result.data !== movingArg.updateInPlacePA.data) {
                            // we failed to update in place
                            throw new CompilerAbort("speculation failed: result buffer was not used");
                        }
                    }
                    return new ParallelArray( updateInPlacePA.data, this.shape, this.inferredType);
                } 
            }
            catch (e) {
                // clean up to continute below
                console.log("scan: speculation failed, reverting to normal mode");
                movingArg = this.get(1);
                rawResult[0] = this.get(0);
                callArguments[0] = rawResult[0];
            }
        } else {
            // speculation is disabled, so set up the stage
            movingArg = this.get(1);
            rawResult[0] = this.get(0);
            callArguments[0] = rawResult[0];
            callArguments[1] = movingArg;
            rawResult[1] = f.apply(this, callArguments);
        }
        
        for (i=2;i<len;i++) {
            // Effectivey change movingArg to refer to the next element in this.
            movingArg.offset += localStride;
            callArguments[0] = rawResult[i-1];
            // i is the index in the result.
            rawResult[i] = f.apply(this, callArguments);
        }
        return (new ParallelArray(rawResult));
    };

    // See documentation for the `filter` operation at:
    // https://github.com/IntelLabs/RiverTrail/wiki/filter
    var filter = function filter(f) {
        var len = this.length;
        // Generate a ParallelArray where t means the corresponding value is in the resulting array.
        var boolResults = combineSeq.apply(this, arguments);
        var rawResult;
        var i, j;
        var resultSize = 0;
        for (i=0;i<this.length;i++) {
            if (boolResults.get(i) != 0) {
                resultSize++;
            }
        }
        rawResult = new Array(resultSize);
        j = 0;
        for (i=0;i<len;i++) {
            if (boolResults.get(i) == 1) {
                rawResult[j] = this.get(i);
                j++;
            }
        }
        return (new ParallelArray(rawResult));
    };
    
    // See documentation for the `scatter` operation at:
    // https://github.com/IntelLabs/RiverTrail/wiki/scatter
    var scatter = function scatter(indices, defaultValue, conflictFunction, length) {
        var result;
        var len = this.shape[0];
        var hasDefault = (arguments.length >= 2);
        var hasConflictFunction = (arguments.length >=3 && arguments[2] != null);
        var newLen = (arguments.length >= 4 ? length : len);
                
        var rawResult = new Array(newLen);
        var conflictResult = new Array(newLen);
        var i;
                
        if (hasDefault) {
            for (i = 0; i < newLen; i++) {
                rawResult[i] = defaultValue;
            }
        } 
    
        for (i = 0; i < indices.length; i++) {
            var ind = (indices instanceof ParallelArray) ? indices.get(i) : indices[i];
            if (ind >= newLen) throw new RangeError("Scatter index out of bounds");
            if (conflictResult[ind]) { // we have already placed a value at this location
                if (hasConflictFunction) {
                    rawResult[ind] = 
                        conflictFunction.call(undefined, this.get(i), rawResult[ind]); 
                } else {
                    throw new RangeError("Duplicate indices in scatter");
                }
            } else {
                rawResult[ind] = this.get(i);
                conflictResult[ind] = true;
            }
        }
        result = new ParallelArray(rawResult);
        return result;
    };    
    
    /***
      getArray
      Synopsis:
      
      getArray();
      Arguments: none
          
      Returns
      Returns a JS array holding a copy of the elements from the ParallelArray.
      If the element is a ParallelArray then it's elemets are also copied in to a JS Array.
     ***/
    var getArray = function getArray () {
        var i, result;
        if ((this.flat) && (this.shape.length === 1)) {
            result = Array.prototype.slice.call(this.data, this.offset, this.offset + this.length);
        } else {
            result = new Array(this.length);
            for (i=0; i<this.length; i++) {
                var elem = this.get(i);
                if (elem instanceof ParallelArray) {
                    result[i] = elem.getArray();
                } else {
                    result[i] = elem;
                }
            }
        }
        return result;
    };
    
    // This takes a ParallelArray and creates a similar JavaScript array.
    // By similar the array returned will be of a canonical type. In
    // particular it will be whatever type the data in the ParallelArray
    // is held in. A Float32Array would be returned if the original ParallelArray
    // held the actual data in a Float32Array.
    var getData = function getData() {
        var result = new this.data.constructor(this.data);
        return result;
    };

    // See documentation for the `get` operation at:
    // https://github.com/IntelLabs/RiverTrail/wiki/get
    var get = function get (index) {
        var i;
        var result;
        var offset;
        var argsAsArray; // For converting from arguements into a real array.
        if (this.flat) {
            if (index instanceof Array) {
                offset = this.offset;
                var len = index.length;
                for (i=0;i<len;i++) {
                    // if we go out of bounds, we return undefined
                    if (index[i] < 0 || index[i] >= this.shape[i]) return undefined;
                    offset = offset + index[i]*this.strides[i];
                }
                if (this.shape.length < index.length) {
                    // The length of an array of indices must not exceed the
                    // dimension of the ParallelArray being indexed.
                    //
                    // Fixes: https://github.com/IntelLabs/RiverTrail/issues/54
                    throw "too many indices in get call";
                }
                if (this.shape.length === index.length) {
                    return this.data[offset];
                } else {
                    // build a ParallelArray.
                    result = new ParallelArray(this);
                    result.offset = offset;
                    result.elementalType = this.elementalType;
                    /* need to fix up shape somehow. */
                    result.shape = this.shape.slice(index.length);
                    result.strides = this.strides.slice(index.length); 
                    /* changing the shape might invalidate the _fastClasses specialisation, 
                     * so better ensure things are still fine
                     */
                    if (result.__proto__ !== ParallelArray.prototype) {
                        result.__proto__ = _fastClasses[result.shape.length].prototype;
                    }
                    return result;
               }
            } 
            //  else it is flat but not (index instanceof Array) 
            if (arguments.length == 1) { 
                // One argument that is a scalar index.
                if ((index < 0) || (index >= this.shape[0])) return undefined;
                if (this.shape.length == 1) {
                    // a 1D array
                    return this.data[this.offset + index];
                } else {
                    // we have a nD array and we want the first dimension so create the new array
                    offset = this.offset+this.strides[0]*index;
                    // build a ParallelArray.
                    result = new ParallelArray(this);
                    result.offset = offset;
                    result.elementalType = this.elementalType;
                    /* need to fix up shape somehow. */
                    result.shape = this.shape.slice(1);
                    result.strides = this.strides.slice(1); 
                    return result;
                }
            }
            // Still a flat array but more than on argument, turn into an array and recurse.
            argsAsArray = Array.prototype.slice.call(arguments);
            return this.get(argsAsArray);
        } // end flat array path.
        
        if (arguments.length == 1) {
            if (!(arguments[0] instanceof Array)) {
                return this.data[index];
            } else {
                // not flat, index is an array of indices.
                result = this;
                for (i=0;i<arguments[0].length;i++) {
                    result = result.data[arguments[0][i]];
                    // out of bounds => abort further selections
                    if (result === undefined) return result;
                }
                return result;
            }
        }
        // not flat, more than one argument.
        
        result = this;
        for (i=0;i<arguments.length;i++) {
            result = result.data[arguments[i]];
            // out of bounds => abort further selections
            if (result === undefined) return result;
        }
        return result;
    };
        
    
    // Write content of parallel array into a canvas
    // XXX: Assumes that image is going to fill the whole canvas
    var writeToCanvas = function writeToCanvas(canvas) {
        var i;
        var context = canvas.getContext("2d");
            var currImage = context.getImageData(0, 0, canvas.width, canvas.height);
            var imageData = context.createImageData(currImage.width, currImage.height);
            var data = imageData.data;

            if (extensionIsInstalled && (this.data instanceof Object)) {
                this.data.writeTo(data);
            } else {
                for (var i = 0; i < this.data.length; i++) {
                    data[i] = this.data[i];
                }
            }
        context.putImageData(imageData, 0, 0);
    };

    //      Some functions that mimic the JavaScript Array functionality ***

    //      The array object has the following prototype methods that are also implemented
    //      for ParallelArray.
    //          
    //      concat() 
    //      join()  
    //      slice()
    //      toString() 

    //      See 

    //      https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array

    //      for a description.
    //          
    //     
        
    // concat() Joins two or more arrays, and returns a copy of the joined arrays
    var concat = function concat () {
        var len = arguments.length;
        var result; 
        var applyArgs;
        var allTypedArrays = isTypedArray(this.data);
        var allArrays = (this.data instanceof Array);
        var resultLength = this.length;
        var offset = 0;
        var i, j;
        applyArgs = new Array(arguments.length);
        for (var i=0; i<len; i++) {
            applyArgs[i] = arguments[i];
            resultLength += arguments[i].length;
            if (allTypedArrays) {
                // if this and previous are true check if this arg uses typed arrays.
                allTypedArrays = isTypedArray(arguments[i].data);
                allArrays = false;
            }
            if (allArrays) {
                // this and all previous are Arrays.
                allArrays = (arguments[i].data instanceof Array);
            }
        }
        
        if (allTypedArrays) {
            return concatTypedArrayData.apply(this, applyArgs);
        }
        if (allArrays) {
            return concatArrayData.apply(this, applyArgs);
        }
        // Nothing simple just do it like the old fashion way, one element at a time. 
        result = new Array(resultLength);
        // Do this
        for (i=0;i<this.length;i++) {
            result[offset] = this.get(i);
            offset++;
        }
        // Do the arguments
        for (i=0;i<arguments.length; i++) {
            for (j=0; j<arguments[i].length;j++) {
                result[offset] = arguments[i].get(j);
                offset++;
            }
        }
        return new ParallelArray(result);
    };
                
    // concatTypedArrayData() Joins two or more arrays using typed arrays, and 
    // returns a copy of the joined arrays
    var concatTypedArrayData = function concatTypedArrayData () {
        var len = arguments.length;
        var result; 
        var applyArgs;
        var i;
        var resultLength = this.length;
        var offset;
            
        for (i=0;i<arguments.length;i++) {
            resultLength += arguments[i].length;
        }
        result = this.data.constructor(resultLength);
        result.set(this.data);
        offset = this.length;
        for (i=0; i<len; i++) {
            result.set(arguments[i].data, offset);
            offset = offset + arguments[i].length;
        }
        return new ParallelArray (result);
    };
    // concatTypedArrayData() Joins two or more arrays using typed arrays, and 
    // returns a copy of the joined arrays
    var concatArrayData = function concatArrayData () {
        var i;
        var result = new Array();
        result = result.concat(this.data);
        for (i=0;i<arguments.length;i++) {
            result = result.concat(arguments.data);
        }
        return new ParallelArray (result);
    };

    // join()       Joins all elements of an array into a string
    var join = function join (arg1) {
        var result;
        if (!arg1) {
            result = this.data.join();
        } else {
            if (arg1 instanceof ParallelArray) {
                result = this.data.join(arg1.data);
            } else {
                result = this.data.join(arg1);
            }
        }
        return result;
    };
    
    // pop()        Removes the last element of an array, and returns that element
    var pop = function pop (f) {
        throw new TypeError("ParallelArray has no method 'pop' - it is a read only construct.");
    };
    // push()       Adds new elements to the end of an array, and returns the new length
    var push = function push (f) {
        throw new TypeError("ParallelArray has no method 'push' - it is a read only construct.");
    };
    // reverse()    Reverses the order of the elements in an array
    var reverse = function reverse (f) {
            throw new TypeError("ParallelArray has no method 'reverse' - it is a read only construct.");
    };
    // shift()      Removes the first element of an array, and returns that element
    var shift =  function shift (f) {
        throw new TypeError("ParallelArray has no method 'shift' - it is a read only construct.");
    };
    // slice()      Selects a part of an array, and returns the new array
    var slice = function slice (startArg, endArg) {
        var result;
        if (isTypedArray(this.data)) {
            // typed arrays use subset instead of slice.
            return new ParallelArray(this.data.subarray(startArg, endArg));
        }
        return new ParallelArray(this.data.slice(startArg, endArg));
    };
    
    // sort()       Sorts the elements of an array
    var sort = function sort (f) {
        throw new TypeError("ParallelArray has no method 'sort' - it is a read only construct.");
    };
    // splice() Adds/Removes elements from an array
    var splice = function splice (f) {
        throw new TypeError("ParallelArray has no method 'splice' - it is a read only construct.");
    };
    
    // toString()   Converts an array to a string, and returns the result
    var toString = function toString (arg1) {
        if (this.flat) {
            var max = this.shape.reduce(function (v, p) { return v*p; }) + this.offset;
            var res = "[";
            for (var pos = this.offset; pos < max; pos++) {
                res += ((pos === this.offset) ? "" : ", ") + this.data[pos];
            }
            res += "]";
            return res;
        } else {
            return "[" + this.data.join(", ") + "]";
        }
    };
    
    // unshift()    Adds new elements to the beginning of an array, and returns the new length
    var unshift = function unshift (f) {
        throw new TypeError("ParallelArray has no method 'unshift' - it is a read only construct.");
    };
    
    // See documentation for the `flatten` operation at:
    // https://github.com/IntelLabs/RiverTrail/wiki/flatten
    var flatten = function flatten () {
        var len = this.length;
        var newLength = 0;
        var shape;
        var i;
        if (this.flat) {
            shape = this.getShape();
            if (shape.length == 1) {
                throw new TypeError("ParallelArray.flatten array is flat");
            }
            var newShape = shape.slice(1);
            newShape[0] = newShape[0] * shape[0];
            return new ParallelArray("reshape", this, newShape);
        }
        for (i=0;i<len;i++) {
            if (this.get(i) instanceof ParallelArray) {
                newLength = newLength+this.get(i).length;
            } else {
                throw new TypeError("ParallelArray.flatten not a ParallelArray of ParallelArrays.");
            }
        }
        var resultArray = new Array(newLength);
        var next = 0;
        for (i=0;i<len;i++) {
            var pa = this.get(i);
                for (j=0; j<pa.length; j++) {
                    resultArray[next] = pa.get(j);
                        next++;
                }
        }
        
        return new ParallelArray(resultArray);
    };
    var flattenRegular = function flattenRegular () {
        var result;
        if (this.flat) {
            result = new ParallelArray(this);
            result.strides = [1];
            result.shape = [shapeToLength(this.shape)];
            result.offset = 0;
            return result;
        }
         var fillArray = function fillArray ( src, offset, dest) {
            if (src.length !== 0) {
                if (src.get(0) instanceof ParallelArray) {
                    for (var pos = 0; pos < src.length; pos++) {
                        offset = fillArray( src.get(pos), offset, dest);
                    }
                } else {
                    for (var pos = 0; pos < src.length; pos++) {
                        dest[offset] = src.get(pos);
                        offset++;
                    }
                }
            }
            return offset;
        }
        if (!this.isRegular()) {
            throw new TypeError("ParallelArray.flatten called on non-regular array");
        }
        var newLength = this.shape.reduce(function (a,b) { return a * b;}, 1);
        var resultArray = new Array( newLength);
        fillArray( this, 0, resultArray);
         return new ParallelArray( resultArray);
    };

    var _fastClasses = function () {

        var Fast0DPA = function (pa) { 
            // shallow copy of object w/o attributes inherited from prototype
            //
            // SAH: The following generic code would be nice to use, but it prevents
            //      some optimisation in Spidermonkey (layout analysis?) and this
            //      has a huge runtime cost...
            //
            // var keys = Object.keys(pa);
            // for (idx in keys) {
            //     this[keys[idx]] = pa[keys[idx]];
            // }
            this.shape = pa.shape;
            this.strides = pa.strides;
            this.offset = pa.offset;
            this.elementalType = pa.elementalType;
            this.data = pa.data;
            this.flat = pa.flat;
            return this;
        }
        Fast0DPA.prototype = {
            "get" : function fastGet0D () {
                if (arguments.length === 0) {
                    return this;
                } else {
                    throw "too many indices in get call";
                }
            }
        };

        var Fast1DPA = function (pa) { 
            // shallow copy of object w/o attributes inherited from prototype
            //
            // SAH: The following generic code would be nice to use, but it prevents
            //      some optimisation in Spidermonkey (layout analysis?) and this
            //      has a huge runtime cost...
            //
            // var keys = Object.keys(pa);
            // for (idx in keys) {
            //     this[keys[idx]] = pa[keys[idx]];
            // }
            this.shape = pa.shape;
            this.strides = pa.strides;
            this.offset = pa.offset;
            this.elementalType = pa.elementalType;
            this.data = pa.data;
            this.flat = pa.flat;
            return this;
        }
        Fast1DPA.prototype = {
            "get" : function fastGet1D (index) {
                var aLen = arguments.length;
                if (aLen === 1) {
                    if (typeof(index) === "number") {
                        if ((index < 0) || (index >= this.shape[0])) return undefined;
                        return this.data[this.offset + index];
                    } else {
                        /* fall back to slow mode */
                        return this.__proto__.__proto__.get.call(this, index);
                    }
                } else if (aLen === 0) {
                    return this;
                } else {
                    throw "too many indices in get call";
                }
            }
        };

        var Fast2DPA = function (pa) { 
            // shallow copy of object w/o attributes inherited from prototype
            //
            // SAH: The following generic code would be nice to use, but it prevents
            //      some optimisation in Spidermonkey (layout analysis?) and this
            //      has a huge runtime cost...
            //
            // var keys = Object.keys(pa);
            // for (idx in keys) {
            //     this[keys[idx]] = pa[keys[idx]];
            // }
            this.shape = pa.shape;
            this.strides = pa.strides;
            this.offset = pa.offset;
            this.elementalType = pa.elementalType;
            this.data = pa.data;
            this.flat = pa.flat;
            return this;
        }
        Fast2DPA.prototype = {
            "get" : function fastGet2D (index, index2) {
                var result;
                var aLen = arguments.length;
                if (aLen === 2) {
                    if ((index < 0) || (index >= this.shape[0]) || (index2 < 0) || (index2 >= this.shape[1])) return undefined;
                    return this.data[this.offset + index * this.strides[0] + index2];
                } else if (aLen === 1) {
                    if (typeof index === "number") {
                        if ((index < 0) || (index >= this.shape[0])) return undefined;
                        result = new Fast1DPA(this);
                        result.offset = this.offset + index * this.strides[0];
                        result.elementalType = this.elementalType;
                        /* need to fix up shape somehow. */
                        result.shape = this.shape.slice(1);
                        result.strides = this.strides.slice(1); 
                        return result;
                    } else {
                        /* fall back to slow mode */
                        return this.__proto__.__proto__.get.call(this, index);
                    }
                } else if (aLen === 0) {
                    return this;
                } else {
                    throw "too many indices in get call";
                }
            }
        };
        var Fast3DPA = function (pa) { 
            // shallow copy of object w/o attributes inherited from prototype
            //
            // SAH: The following generic code would be nice to use, but it prevents
            //      some optimisation in Spidermonkey (layout analysis?) and this
            //      has a huge runtime cost...
            //
            // var keys = Object.keys(pa);
            // for (idx in keys) {
            //     this[keys[idx]] = pa[keys[idx]];
            // }
            this.shape = pa.shape;
            this.strides = pa.strides;
            this.offset = pa.offset;
            this.elementalType = pa.elementalType;
            this.data = pa.data;
            this.flat = pa.flat;
            return this;
        }
        Fast3DPA.prototype = {
            "get" : function fastGet3D (index, index2, index3) {
                var result;
                var aLen = arguments.length;
                if (aLen === 3) {
                    if ((index < 0) || (index >= this.shape[0]) || (index2 < 0) || (index2 >= this.shape[1]) || (index3 < 0) || (index3 >= this.shape[2])) return undefined;
                    return this.data[this.offset + index * this.strides[0] + index2 * this.strides[1] + index3];
                } else if (aLen === 2) {
                    if ((index < 0) || (index >= this.shape[0]) || (index2 < 0) || (index2 >= this.shape[1])) return undefined;
                    result = new Fast1DPA(this);
                    result.offset = this.offset + index * this.strides[0] + index2 * this.strides[1];
                    result.elementalType = this.elementalType;
                    /* need to fix up shape somehow. */
                    result.shape = this.shape.slice(2);
                    result.strides = this.strides.slice(2); 
                    return result;
                } else if (aLen === 1) {
                    if (typeof index === "number") {
                        if ((index < 0) || (index >= this.shape[0])) return undefined;
                        result = new Fast2DPA(this);
                        result.offset = this.offset + index * this.strides[0];
                        result.elementalType = this.elementalType;
                        /* need to fix up shape somehow. */
                        result.shape = this.shape.slice(1);
                        result.strides = this.strides.slice(1); 
                        return result;
                    } else {
                        /* fall back to slow mode */
                        return this.__proto__.__proto__.get.call(this, index);
                    }
                } else {
                    throw "too many indices in get call";
                }
            }
        };

        return [Fast0DPA,Fast1DPA,Fast2DPA,Fast3DPA];
    }();

    function ParallelArray () {
        var i, j;
        var args;
        var result = this;

        for (i=0;i<fingerprintTracker.length;i++) {
            if (fingerprint === fingerprintTracker[i]) {
                console.log ("(fingerprint === fingerprintTracker)");
            }
        }

        if (arguments.length == 0) {
            result = createEmptyParallelArray.call(this);
        } else if (arguments.length == 1) {     
            result = createSimpleParallelArray.call(this, arguments[0]);
        } else if ((arguments.length == 2) && (typeof(arguments[0]) == 'function')) {
            // Special case where we force the type of the result. Should only be used internally
            result = createSimpleParallelArray.call(this, arguments[1], arguments[0]);
        } else if ((arguments.length == 3) && (arguments[0] == 'reshape')) {
            // special constructor used internally to create a clone with different shape
            result = this;
            result.shape = arguments[2];
            result.strides = shapeToStrides(arguments[2]);
            result.offset = arguments[1].offset;
            result.elementalType = arguments[1].elementalType;
            result.data = arguments[1].data;
            result.flat = arguments[1].flat;

            // We get [CData, TypedArray, Shape].
        } else if ((RiverTrail.Helper.isCData(arguments[0]) || 
                    RiverTrail.Helper.isWebCLBufferObject(arguments[0])) && isTypedArray(arguments[1])) {
            //result = createOpenCLMemParallelArray.apply(this, arguments);
            result = createHostAllocatedParallelArray.call(this, arguments[0], arguments[1], arguments[2]);
        } else if (typeof(arguments[1]) === 'function' || arguments[1] instanceof low_precision.wrapper) {
            var extraArgs;
            if (arguments.length > 2) {
                extraArgs = new Array(arguments.length -2); // skip the size vector and the function
                for (i=2;i<arguments.length; i++) {
                    extraArgs[i-2] = arguments[i];
                }
            } else {
                // No extra args.
                extraArgs = new Array(0);
            }
            result = createComprehensionParallelArray.call(this, arguments[0], arguments[1], extraArgs);
        } else {
            // arguments.slice doesn't work since arguments is not really an array so use this approach. 
            var argsAsArray = Array.prototype.slice.call(arguments);
            result = createSimpleParallelArray.call(this, argsAsArray);
        }
    
        for (i=0;i<fingerprintTracker.length;i++) {
            if (fingerprint === fingerprintTracker[i]) {
                console.log ("(fingerprint === fingerprintTracker)");
            }
        }
        result.uniqueFingerprint = fingerprint++;
        
        // use fast code for get if possible
        if (result.flat && result.shape && result.shape.length < 4) {
            result = new _fastClasses[result.shape.length](result);
        }
    
        if (enableProxies) {
            try { // for Chrome/Safari compatability
                result = Proxy.create(makeIndexOpHandler(result), ParallelArray.prototype);
            } catch (ignore) {}
        }

        if (extensionIsInstalled && RiverTrail.Helper.isCData(result.data)) {
            if (useLazyCommunication) {
                // wrap all functions that need access to the data
                requiresData(result, "get");
                //requiresData(result, "partition");
                requiresData(result, "concat");
                requiresData(result, "join");
                requiresData(result, "slice");
                requiresData(result, "toString");
                requiresData(result, "getArray");
            } else {
                result.materialize();
            }  
        }
        return result;
    };

    ParallelArray.prototype = {
        /***
        length
        ***/
        // The getter for ParallelArray, there is actually no setter.
        // NOTE: if this array is non-flat, the length is the length of the data
        //       store. Otherwise it is the first element of the shape. One could
        //       use getShape in both cases, but that will trigger a long computation
        //       for non-flat arrays, which in turn relies on length :-D
        //
        get length () {
            return (this.flat ? this.getShape()[0] : this.data.length);
        },
        set verboseDebug (val) {
            RiverTrail.compiler.verboseDebug = val;
        },
        set suppressOpenCL (val) {
            suppressOpenCL = val;
        },
        "materialize" : materialize,
        "partition" : partition,
        "isRegularIndexed" : isRegularIndexed,
        "isRegular" : isRegular,
        "getShape" : getShape,
        "map" : map,
        "mapSeq" : mapSeq,
        "combine" : combine,
        "combineSeq" : combineSeq,
        "reduce" : reduce,
        "scan" : scan,
        "filter" : filter,
        "scatter" : scatter,
        "getArray" : getArray,
        "getData" : getData,
        "get" : get,
        "writeToCanvas" : writeToCanvas,
        "concat" : concat,
        "join" : join,
        "pop" : pop,
        "push" : push,
        "reverse" : reverse,
        "shift" : shift,
        "slice" : slice,
        "sort" : sort,
        "splice" : splice,
        "toString" : toString,
        "unshift" : unshift,
        "flatten" : flatten,
        "flattenRegular" : flattenRegular,
        get maxPrecision () { return enable64BitFloatingPoint ? 64 : 32; }
    };
    
    // SAH: Tie up fast classes with the PA prototype. 

    // TODO(LK): Firefox raises the "mutating the [[Prototype]] of an
    // object will cause your code to run very slowly; instead create
    // the object with the correct initial [[Prototype]] value using
    // Object.create" warning for the next line.  Cause for concern?
    _fastClasses.forEach( function (fc) {fc.prototype.__proto__ = ParallelArray.prototype});

    return ParallelArray;
}(); // end ParallelArray.prototype

var low_precision = function (f) {
    if (typeof(f) !== "function") {
        throw new TypeError("low_precision can only be applied to functions");
    }
    return new low_precision.wrapper(f);
}

low_precision.wrapper = function (f) {
    this.wrappedFun = f;
    return this;
}

low_precision.wrapper.prototype = {
    "unwrap" : function () { return this.wrappedFun; }
};

/* File jit/compiler/driver.js*/
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
//
// Create top level compiler object
//

// This pattern is used when we want to hide internal detail and have only one such variable.
// It basically hides everything in the local scope of the function, executes the function and
// returns only the external needed outside of the function.

if (RiverTrail === undefined) {
    var RiverTrail = {};
}


RiverTrail.compiler = (function () {
    // This is the compiler driver proper. 
    
    // The ast is opaque at this point so the Narcissus constants aren't needed.
    var inferPAType = RiverTrail.Helper.inferPAType;
    
    // whether to use kernel caching or not
    var useKernelCaching = true;
    // whether to specialize kernels up to values for frequent arguments
    var useValueSpec = true;
    // how many different values to track for specialisation before falling back to megamorphic
    var polymorphLimit = 2;
    // how recently active does this spec need to be
    var specDepth = 1;
    // how long to watch for values before starting to specialize
    var specWarmUp = 2;
    // max size of value to specialize for
    var maxValSpecLen = 16;
    // whether to cache OpenCL buffers
    var useBufferCaching = true;

    var suppressOpenCL = false;

    var reportVectorized = false;

    // Create an OpenCL context on the extension side.
    RiverTrail.runtime.initContext();

    var isTypedArray = RiverTrail.Helper.isTypedArray;

    var equalsSpecValue = function equalsSpecValue(a,b) {
        var l,r;
        // both might be null
        if (a === b) 
            return true;
        // or just one is null
        if ((a === null) || (b === null))
            return false;
        // this should always be true, as both have the same type (in the type inference sense)
        if (a.type !== b.type)
            return false;
        switch (a.type) {
            case 'number':
                return a.val === b.val;
            case 'array':
                l = a.val; r = b.val;
                for (var cnt = 0; cnt < r.length; cnt++) {
                    if (l[cnt] !== r[cnt])
                        return false;
                }
                return true;
            case 'flatarray':
            case 'parallelarray':
                l = a.val.data; r = b.val.data;
                // make sure that both hold data
                if ((l.length === undefined) || (r.length === undefined))
                    return false;
                for (var cnt = 0; cnt < r.length; cnt++) {
                    if (l[cnt] !== r[cnt])
                        return false;
                }
                return true;
            default:
                return false;
        }
    };

    // main hook to start the compilation/execution process for running a construct using OpenCL
    // paSource -> 'this' inside kernel
    // f -> function to run
    // construct -> [combine|map|comprehension|comprehensionScalar]
    // rankOrShape -> either rank of iterationspace or in case of comprehension and comprehensionScalar the shape of the iterationspace
    // args -> additional arguments to the kernel
    var compileAndGo = function compileAndGo (paSource, f, construct, rankOrShape, args, enable64BitFloatingPoint) {
        "use strict";
        var paResult = null;
        var kernelString;
        var lowPrecision;
        var ast;
        var i;
        // If f is a low_precision wrapped function, unwrap it first
        if (f instanceof low_precision.wrapper) {
            lowPrecision = true;
            f = f.unwrap();
        } else {
            lowPrecision = !enable64BitFloatingPoint;
        }
        var defaultNumberType = lowPrecision ? "float": "double";

        // First convert all array arguments into suitable flat representations that can be passed to
        // the OpenCL side

        args = Array.prototype.map.call(args, 
                                     function (object) {
                                         if (object instanceof Array) {
                                             if ((typeof(canBeMapped) === 'function') && (canBeMapped(object))) {
                                                 // we have found a JavaScript array that can be directly mapped, so we keep it
                                                 return object;
                                             } else {
                                                 return new RiverTrail.Helper.FlatArray( lowPrecision ? Float32Array : Float64Array, object);
                                             }
                                         } else {
                                             return object;
                                         }});

        var argumentTypes = constructArgTypes(construct, args, rankOrShape, defaultNumberType);

        // this stores information on the value we see
        var specVector = null;
        if (useValueSpec) {
            specVector = args.map(function (v) { 
                    if (typeof(v) === 'number') {
                        return {val: v, type: 'number', seen: 1};
                    } else if (isTypedArray(v) && (v.length < maxValSpecLen)) {
                        // we can only get flat arrays here, so no need to check what the actual values are
                        return {val: v, type: 'array', seen: 1};
                    } else if ((v instanceof RiverTrail.Helper.FlatArray) && (v.shape.length <= 2) && (v.shape[0] * (v.shape[1] | 1) < maxValSpecLen)) {
                        return {val: v, type: 'flatarray', seen: 1};
                    } else if ((v instanceof ParallelArray) && (v.shape.length <= 2) && (v.shape[0] * (v.shape[1] | 1) < maxValSpecLen)) {
                        return {val: v, type: 'parallelarray', seen: 1};
                    } else {
                        return null;
                    }
                });
        } 
        // spec stores what we actually want to specialize for
        var spec = null;
        var cacheEntry = null;

        if (f.openCLCache !== undefined) {
            if (useKernelCaching) {
                cacheEntry = getCacheEntry(f, construct, paSource, argumentTypes, lowPrecision, rankOrShape);
                // try and find a matching kernel from previous runs
                if (cacheEntry != null) {
                    cacheEntry.uses++;
                    if (useValueSpec) {
                        // record value frequencies
                        cacheEntry.vals = cacheEntry.vals.map(function (v,i) {
                            "use strict";
                            if (v === null) {
                                return v; // megamorphic
                            } else {
                                var elem = specVector[i];
                                if (v[0] === elem) {
                                    // both null, nothing to be done
                                    return v;
                                } else if ((v[0] !== null) &&
                                           (elem !== null) &&
                                           equalsSpecValue(elem,v[0])) {
                                    // it is the first element
                                    v[0].seen++;
                                    return v;
                                } else {
                                    // search through all other elements
                                    if (elem === null) {
                                        for (var pos = 1; pos < v.length; pos++) {
                                            if (v[pos] === null) {
                                                v[pos] = v[pos-1];
                                                v[pos-1] = null;
                                                return v;
                                            }
                                        }
                                        v.push(null);
                                    } else {
                                        // search for a value
                                        for (var pos = 1; pos <v.length; pos++) {
                                            if ((v[pos] !== null) && equalsSpecValue(v[pos], elem)) {
                                                var swap = v[pos];
                                                v[pos] = v[pos-1];
                                                v[pos-1] = swap;
                                                swap.seen++;
                                                return v;
                                            }
                                        }
                                        v.push(elem);
                                    }
                                    if (v.length > polymorphLimit) {
                                        return null;
                                    } else {
                                        return v;
                                    }
                                }
                            }
                        });
                    }
                                
                    // there is always at least a match
                    var kSpec = findBestMatch(cacheEntry, specVector);
                    spec = doWeNeedBetter(cacheEntry, kSpec, specVector);

                    if (!spec) {
                        // execute what we have
                        paResult = RiverTrail.compiler.runOCL(paSource, kSpec.kernel, cacheEntry.ast, 
                                       construct, rankOrShape, args, argumentTypes, lowPrecision, 
                                       useBufferCaching);
                        return paResult;
                    }
                    // fall through with our spec vector to recompilation below
                }
            } else {
                // remove cache 
                f.openCLCache = undefined;
            }
        } 
        //
        // NOTE: we only get here if caching has failed!
        //       this means we have seen new types OR a have to do a better specialization!
        //
        if (useKernelCaching && (f.openCLCache === undefined)) {
            // create empty cache
            f.openCLCache = [];
        }
                        
        try {
            ast = parse(paSource, construct, rankOrShape, f.toString(), args, lowPrecision, spec); // parse, no code gen
            kernelString = RiverTrail.compiler.codeGen.compile(ast, paSource, rankOrShape, construct); // Creates an OpenCL kernel function
        } catch (e) {
            RiverTrail.Helper.debugThrow(e);
        }
        
        if (RiverTrail.compiler.verboseDebug) {    
            console.log("::parseGenRunOCL:kernelString: ", kernelString);
            console.log("::parseGenRunOCL:args: ", JSON.stringify(args));
        }

        if (suppressOpenCL) {
            console.log("Not executing OpenCL returning 'this' parseGenRunOCL:surpressOpenCL: ", suppressOpenCL);
            return this;
        } 

        var kernelName = ast.name;
        var kernel;
        if (!kernelName) {
            throw new Error("Invalid ast: Function expected at top level");
        }

        try {
            if (enable64BitFloatingPoint) {
                // enable 64 bit extensions
                kernelString = "#pragma OPENCL EXTENSION cl_khr_fp64 : enable\n" + kernelString;
            }
            kernel = RiverTrail.runtime.compileKernel(kernelString, "RT_" + kernelName);
        } catch (e) {
            try {
                var log = getBuildLog();
                console.log(log);
            } catch (e2) {
                var log = "<not available>";
            }
            RiverTrail.Helper.debugThrow("The OpenCL compiler failed. Log was `" + log + "'.");
        }
        if (reportVectorized) {
            try {
                var log = RiverTrail.runtime.getBuildLog();
                if (log.indexOf("was successfully vectorized") !== -1) {
                    console.log(kernelName + "was successfully vectorized");
                }
            } catch (e) {
                // ignore
            }
        }
        if (useKernelCaching) {
            // save ast information required for future use
            // if we came here due to specialisation, we have a cacheEntry already!
            if (!cacheEntry) {
                var cacheEntry = { "ast": ast,
                    "name": ast.name,
                    "source": f,
                    "paType": paSource ? RiverTrail.Helper.inferPAType(paSource) : undefined,
                    "kernel": [{"kernel": kernel, "spec": spec}],
                    "construct": construct,
                    "lowPrecision": lowPrecision,
                    "argumentTypes": argumentTypes,
                    "iterSpace": rankOrShape,
                    "uses": 1,
                    "vals" : useValueSpec ? specVector.map(function (v) { return [v]; }) : null
                };
                f.openCLCache.push(cacheEntry);
            } else {
                // update existing entry
                cacheEntry.kernel.push({"kernel": kernel, "spec": spec});
            }
        }
        
        try {
            paResult = RiverTrail.compiler.runOCL(paSource, kernel, ast, construct, rankOrShape, args, 
                                            argumentTypes, lowPrecision, useBufferCaching);
        } catch (e) {
            try {
                RiverTrail.Helper.debugThrow(e + getBuildLog());
            } catch (e2) {
                RiverTrail.Helper.debugThrow(e); // ignore e2. If buildlog throws, there simply is none.
            }
        }
        // NOTE: Do not add general code here. This is not the only exit from this function!
        return paResult;
    };

    //
    // Driver method to steer compilation process
    //
    function parse(paSource, construct, rankOrShape, kernel, args, lowPrecision, spec) {
        var ast = RiverTrail.Helper.parseFunction(kernel);
        var rank = rankOrShape.length || rankOrShape;
        try {
            RiverTrail.Typeinference.analyze(ast, paSource, construct, rank, args, lowPrecision);
            RiverTrail.RangeAnalysis.analyze(ast, paSource, construct, rankOrShape, args, spec);
            RiverTrail.RangeAnalysis.propagate(ast, construct);
            RiverTrail.InferBlockFlow.infer(ast);
            RiverTrail.InferMem.infer(ast);
        } catch (e) {
            RiverTrail.Helper.debugThrow(e);
        }
        return ast;
    }
    var fillInTypeAndShapeIfMissing = function(a) {
        if(a.inferredType !== undefined && a.dimSize !== undefined)
            return;
        var tiA = RiverTrail.Helper.inferPAType(a);
        a.inferredType = tiA.inferredType;
        a.dimSize = tiA.dimSize;
    }
    var getCacheEntry = function (f, construct, paType, argumentTypes, lowPrecision, rankOrShape) {
        var argumentMatches = function (argTypeA, argTypeB) {
            fillInTypeAndShapeIfMissing(argTypeA);
            fillInTypeAndShapeIfMissing(argTypeB);
            return ((argTypeA.inferredType === argTypeB.inferredType) &&
                    equalsShape(argTypeA.dimSize, argTypeB.dimSize));
        };
        var argumentsMatch = function (argTypesA, argTypesB) {
            if (argTypesA.length !== argTypesB.length) return false;
            return argTypesA.every(function (eA, idx) { return argumentMatches(eA, argTypesB[idx]); });
        };
        var i;
        var entry;
        // try and find a matching kernel from previous runs
        for (i = 0; i < f.openCLCache.length; i++) {
            entry = f.openCLCache[i];
            if ((construct === entry.construct) &&
                (lowPrecision === entry.lowPrecision) &&
                (entry.source === f) &&
                argumentsMatch(argumentTypes, entry.argumentTypes) &&
                (((construct !== "comprehension") && (construct !== "comprehensionScalar")
                  && argumentMatches(paType, entry.paType) && equalsShape(paType.shape, entry.paType.dimSize)) || 
                 ((construct == "comprehension" || construct == "comprehensionScalar") && equalsShape(rankOrShape, entry.iterSpace)))
               ) {
                return f.openCLCache[i];
            }
        }
        return null;
    };

    var findBestMatch = function findBestMatch(entry, vals) {
        "use strict";
        var fits = 0;
        // the first entry is always the generic one
        var match = entry.kernel[0];
        for (var i = 1; i < entry.kernel.length; i++) {
            var matches = true;
            var lFits = 0;
            var lSpec = entry.kernel[i].spec;
            if (lSpec === null) { // this should not happen
                matches = false;
                break;
            }
            for (var j = 0; j < vals.length; j++) {
                if (lSpec[j] !== null) {
                    if (equalsSpecValue(lSpec[j], vals[j])) {
                        lFits++;
                    } else {
                        matches = false;
                        break;
                    }
                }
            }
            if (matches && (lFits > fits)) {
                match = entry.kernel[i];
            }
        }
        return match;
    };

    var doWeNeedBetter = function doWeNeedBetter(cache, current, vals) {
        "use strict";
        // we wait to see some values before we decide
        if (cache.uses < specWarmUp) return null;
        // no more than 5 specs per function
        if (cache.kernel.length > 5) return null;
        
        var result;
        var changed = false;
        if (current.spec === null) {
            result = vals.map(function (v) { return null;});
        } else {
            result = current.spec.map(function (v) { return v;});
        }

        for (var i = 0; i < result.length; i++) {
            if (result[i] === null) {
                // we could go further here
                var seen = cache.vals[i];
                if (seen !== null) {
                    for (var j = 0; j < specDepth; j++) {
                        if (equalsSpecValue(seen[j], vals[i])) {
                            // this is a frequent value
                            result[i] = vals[i];
                            changed = true;
                            break;
                        }
                    }
                }
            }
        }

        RiverTrail.compiler.debug && console.log("new spec: " + specToString(result));

        return (changed ? result : null);
    };

    var specToString = function specToString(spec) {
        "use strict";
        if (!spec) 
            return "null";

        var s = "";
        for (var i = 0; i < spec.length; i++) {
            s = s + "["+i+", " + (spec[i] ? spec[i].val.toString() + ", " + spec[i].type : "null") + "]";
        }
        return s;
    };

    var constructArgTypes = function (construct, args, rankOrShape, defaultNumberType) {
        var argumentTypes = [];
        var i;
        if (construct == "combine") {
            // the kernel is called with an index as first argument, which has type int [rankOrShape]
            // and an extra isIndex attribute to differentiate it from the rest
            argumentTypes.push({ inferredType: "int", dimSize: [rankOrShape], attributes: { isIndex: true} });
        } else if (construct == "comprehension") {
            // the kernel is called with an index as first argument, which has type int[rankOrShape.length]
            // and an extra isIndex attribute to differentiate it from the rest
            argumentTypes.push({ inferredType: "int", dimSize: [rankOrShape.length], attributes: { isIndex: true} });
        } else if (construct == "comprehensionScalar") {
            // the kernel is called with an index as first argument, which has type int
            // and an extra isIndex attribute to differentiate it from the rest
            argumentTypes.push({ inferredType: "int", dimSize: [], attributes: { isIndex: true} });
        }

        //
        // Push the types for all other arguments
        // This simple iterates through the array in order, pushing the types.
        //

        for (i = 0; i < args.length; i++) {
            var argument = args[i];
            if (argument instanceof ParallelArray) {
                argumentTypes.push(inferPAType(argument));
            } else if (argument instanceof RiverTrail.Helper.FlatArray) {
                argumentTypes.push({ inferredType: defaultNumberType, dimSize: argument.shape});
            } else if (argument instanceof Array) {
                // SAH: if an array makes it here without being transformed into a flat array, it
                //      must be a dense, homogeneous JavaScript array. Those are always double arrays
                //      and we assume the shape can be derived by looking at the first element in
                //      each dimension.
                // NOTE: I use /* jsval */ double as type to make sure these are not confused with 
                //       ordinary arrays when checking for matching signatures.
                argumentTypes.push({ inferredType: "/* jsval */ double", dimSize: function makeShape(a, r) { if (a instanceof Array) { r.push(a.length); makeShape(a[0], r); } return r;}(argument, []) });
            } else if (RiverTrail.Helper.isTypedArray(argument)) {
                argumentTypes.push({ inferredType: RiverTrail.Helper.inferTypedArrayType(argument), dimSize: [argument.length] });
            } else if (argument instanceof RiverTrail.Helper.Integer) {
                // These are special integer values used for offsets and the like. 
                argumentTypes.push({ inferredType: "int", dimSize: [] });
            } else if (typeof (argument) === "number") {
                // scalar values are treated as floats
                argumentTypes.push({ inferredType: defaultNumberType, dimSize: [] });
            } else if (argument instanceof Number) {
                // numbers are floats
                argumentTypes.push({ inferredType: defaultNumberType, dimSize: [] });
            } else {
                throw new Error("Type derivation for argument not implemented yet");
            }
        }
        return argumentTypes;
    };
    function astTypeConverter (key, value) {
        if (key === 'type' && (typeof value === 'number') ) { 
            if (opTypeNames[tokens[value]]) {
                return opTypeNames[tokens[value]];
            }
            // only do numbers since JSON recurses on returned value.
            return tokens[value];
        }
        if (key === 'tokenizer'  ) {
            return '-- hidden --';
        }
        if (key === 'flowTo') {
            return '-- cyclic --';
        }
        return value;
    }   

    //
    // Method to dump the current ast
    //
    function dumpAst(ast) {
        if (RiverTrail.compiler.verboseDebug) {
            console.log(JSON.stringify(ast, astTypeConverter));
        }
        if (RiverTrail.compiler.debug) {
            console.log(RiverTrail.Helper.wrappedPP(ast));
        }
    }
    
    var equalsShape = function equalsShape (shapeA, shapeB) {
        return ((shapeA.length == shapeB.length) &&
                Array.prototype.every.call(shapeA, function (a,idx) { return a == shapeB[idx];}));
    };
    
// end code from parallel array
    return {
        verboseDebug: false,
        debug: false,
        compileAndGo: compileAndGo,
    };
}());


/* File jit/compiler/dotviz.js*/
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
// Graphviz dot visualizer for Narzissus tree
//

RiverTrail.dotviz = function () {
    var dotCnt = 0;

    var tokens = RiverTrail.definitions.tokens;

    // list of fields to consider as sons of a node
    var sons = { "children": null,
                 "value": null,
                 "name": null,
                 "body": null,
                 "params": null,
                 "condition": null, 
                 "thenPart": null,
                 "elsePart": null,
                 "setup": null,
                 "update": null,
                 "iterator": null,
                 "discriminant": null,
                 "cases": null,
                 "statements": null,
                 "caseLabel": null,
                 "expression": null,
                 "initializer": null,
                 "varDecls ": null,
                 "funDecls ": null,
                 "typeInfo ": null,
                 "rangeInfo ": null };

    // regular expression to identify characters that need escaping
    var sanitizeRegExp = /[\{\}<>\"\']/g;

    function nodeName(node) {
        return "n" + dotCnt++;
    }

    function followField(field) {
        return ((field !== undefined) &&
                (field !== null) &&
                (typeof(field) === "object") &&
                ((field instanceof Narcissus.parser.Node) ||
                 (field instanceof Array)));
    }

    function sanitize(s) {
        return s.replace(sanitizeRegExp, 
                         function (x) { return "\\" + x; });
    }

    function walkTree(node, parent) {
        var s = "";

        if (node == undefined) {
            s = s + nodeName(node) + "[label=\"(undefined)\"]\n";
        }
        else if (node instanceof Array) {
            // array nodes are simply iterated but do not show
            // up in the graph themselves
            for (var cnt = 0; cnt < node.length; cnt++) {
                s = s + walkTree(node[cnt], parent);
            }
        } else {
            // generate graph node for this ast node
            var myDotName = nodeName(node);
            s = s + myDotName + "[label=\"";
            if (node instanceof Narcissus.parser.Node) {
                s = s + sanitize(tokens[node.type] || "undefined");
                for (var field in sons) {
                    if ((node[field] != undefined) &&
                        ((!(node[field] instanceof Array)) ||
                         (node[field].length > 0))) {
                        s = s + "| <" + field + "> " + field;
                        if (node[field] instanceof Array) {
                            s = s + " : Array";
                        } else if (typeof node[field] == 'function') {
                            s = s + " : function";
                        } else if (typeof node[field] == 'string') {
                            s = s + " = '" + sanitize(node[field]) + "'";
                        } else if (typeof node[field] == 'number') {
                            s = s + " = " + node[field];
                        } else if (node[field] instanceof Narcissus.parser.Node) {
                            s = s + " : Node";
                        } else if (typeof (node[field].toString) == 'function') {
                            s = s + " = " + sanitize(node[field].toString());
                        }
                    }
                }
            } else {
                s = s + sanitize(node.toString());
            }
            s = s + "\",shape=\"record\"]\n";

            // generate link to parent
            if (parent != undefined) {
                s = s + parent + " -> " + myDotName +"\n";
            }

            for (var field in sons) {
                if (followField(node[field])) {
                    s = s + walkTree( node[field], myDotName + ":" + field);
                }
            }
        }

        return s;
    }
        
    function walkType (type) {
        var s = "";

        if (!type.dotname) {
            type.dotname = nodeName(type);
            s = s + type.dotname + "[label=\"" + sanitize(type.toString()) + "\"]\n";
            if (type.flowTo) {
                s = type.flowTo.reduce( function (p,c) { 
                                                       p = p + walkType(c); 
                                                       p = p + type.dotname + " -> " + c.dotname + "\n"; 
                                                       return p; }, 
                                                   s);
            }
        }

        return s;
    }

    function plot(graph, fname) {
        if (!fname) {
            fname = "tmp_graph.png";
        }
        if (window.dot_interface) {
            window.dot_interface.generatePng(graph, fname);
            var url = window.dot_interface.TargetUrl + fname;
            var statusArea = document.getElementById("status");
            if (statusArea) {
                var image = document.createElement("img");
                image.setAttribute("src", url);
                statusArea.appendChild( image);
            }
        }
    }

    function addStatus(ast, fname) {
        dotCnt = 0;
        var graph = "digraph {\n";
        graph += "graph [ rankdir = \"LR\" ];\n";
        graph += walkTree(ast, undefined);
        graph += "}\n";

        if (!fname) {
            fname = "tmp_graph.png";
        }
        plot(graph, fname);

        return graph;
    }

    function plotTypes(types, fname) {
        if (!types instanceof Array) {
            types = [types];
        }

        dotCnt = 0;
        var graph = "digraph {\n";
        graph += "graph [ rankdir = \"LR\" ];\n";
        graph = types.reduce( function (p,c) { return p + walkType(c)}, graph);
        graph += "}\n";

        if (!fname) {
            fname = "tmp_types.png";
        }
        plot(graph, fname);

        return graph;
    }

    return {
        "addStatus": addStatus,
        "plotTypes": plotTypes
    };
}();

/* File jit/compiler/typeinference.js*/
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
                throw "unhandled node type in analysis: " + ast.type + "�is " + RiverTrail.Helper.wrappedPP(ast);
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

        //�propagate address space qualifiers
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

/* File jit/compiler/rangeanalysis.js*/
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
                    type = LT;
                    break;
                case EQ:
                case STRICT_EQ:
                    // these are handled explicitly, as there is no NEQ
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
                if (accu.inverse) {
                    // we do not know anything but we have to record this nonetheless to make
                    // sure that the inverse and normal constraints cover the same indentifiers!
                    constraint = new Constraint(undefined, undefined);
                } else {
                    constraint = new Constraint(accu.range.lb, accu.range.ub);
                }
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
    Rp.cross = function (other, fn, isInt) {
        debug && (isInt === undefined) && reportBug("Rp.cross called without isInt argument");
        return new Range(((this.lb === undefined) || (other.ub === undefined)) ? undefined : fn(this.lb, other.ub),
                         ((this.ub === undefined) || (other.lb === undefined)) ? undefined : fn(this.ub, other.lb),
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
            if (!((current instanceof RangeArray) || (current instanceof Array))) {
                current = constraint.map(function () { return current; });
            }
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
        var s = "";
        for (var name in this.bindings) {
            s = s + ((s === "") ? "" : ", ") + name + " => " + this.bindings[name].toString();
        }
        return "<<" + s + ">>";
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
                    ast.rangeInfo.isInt = (range instanceof RangeArray) ? range.isInt() : range.isInt;
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


    function computeBinaryRange(op, leftAst, rightAst, varEnv, doAnnotate, constraints, constraintAccu, inverse) {
        var result;

        switch (op) {
            case INCREMENT:
            case PLUS: 
                var left = drive(leftAst, varEnv, doAnnotate);
                if (rightAst) {
                    var right = drive(rightAst, varEnv, doAnnotate);
                } else {
                    var right = new Range(1,1, true);
                }
                result = left.map( right, function (a,b) { return a+b; }, left.isInt && right.isInt); 
                if (!rightAst) { // INCREMENT
                    varEnv.update(leftAst.value, result);
                }
                break;
            case DECREMENT:
            case MINUS:
                var left = drive(leftAst, varEnv, doAnnotate);
                if (rightAst) {
                    var right = drive(rightAst, varEnv, doAnnotate);
                } else {
                    var right = new Range(1,1, true);
                }
                result = left.cross( right, function (a,b) { return a-b; }, left.isInt && right.isInt); 
                if (!rightAst) { // DECREMENT
                    varEnv.update(leftAst.value, result);
                }
                break;
            case MUL:
                var left = drive(leftAst, varEnv, doAnnotate);
                var right = drive(rightAst, varEnv, doAnnotate);
                var newLb = Math.min(left.lb * right.lb, left.ub * right.lb, left.lb * right.ub, left.ub * right.ub);
                var newUb = Math.max(left.lb * right.lb, left.ub * right.lb, left.lb * right.ub, left.ub * right.ub);

                result = new Range( isNaN(newLb) ? undefined : newLb,
                                    isNaN(newUb) ? undefined : newUb,
                                    left.isInt && right.isInt);
                break;

            case DIV:
                var left = drive(leftAst, varEnv, doAnnotate);
                var right = drive(rightAst, varEnv, doAnnotate);
                if ((left.lb !== undefined) && (left.ub !== undefined) && (Math.abs(right.lb) >= 1) && (Math.abs(right.ub) >= 1)) {
                    var newLb = Math.min(left.lb / right.lb, left.ub / right.lb, left.lb / right.ub, left.ub / right.ub);
                    var newUb = Math.max(left.lb / right.lb, left.ub / right.lb, left.lb / right.ub, left.ub / right.ub);
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
                var right = drive(rightAst, varEnv, doAnnotate, constraints, undefined, inverse); // grab rhs range
                var left = drive(leftAst, varEnv, doAnnotate, constraints, {"type" : op, "range" : right, "inverse" : inverse}, inverse); // apply constraint to lhs
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
                var left = drive(leftAst, varEnv, doAnnotate);
                var right = drive(rightAst, varEnv, doAnnotate);
                result = new Range(undefined, undefined, false);
                break;

            // binary operators on bool
            case AND: 
            case OR:
                if (((op === AND) && !inverse) ||
                    ((op === OR ) && inverse)) { // merge both branches
                    drive(leftAst, varEnv, doAnnotate, constraints, undefined, inverse);
                    drive(rightAst, varEnv, doAnnotate, constraints, undefined, inverse);
                } else { // intersect branches
                    var leftC = new Constraints();
                    drive(leftAst, varEnv, doAnnotate, leftC, undefined, inverse);
                    var rightC = new Constraints();
                    drive(rightAst, varEnv, doAnnotate, rightC, undefined, inverse);
                    leftC.intersect(rightC);
                    constraints.merge(leftC);
                }
                result = new Range(0, 1, true); // the result is a boolean :)
                break;
            // unary functions on all literals
            case NOT:
                drive(leftAst, varEnv, doAnnotate, constraints, undefined, !inverse); 
                result = new Range(0, 1, true); // the result is a boolean :)
                break;
            case UNARY_PLUS:
                result = drive(leftAst, varEnv, doAnnotate);
                break;
            case UNARY_MINUS:
                var left = drive(leftAst, varEnv, doAnnotate);
                result = new Range((left.ub === undefined) ? undefined : -left.ub,
                                   (left.lb === undefined) ? undefined : -left.lb,
                                   left.isInt);
                break;
            case BITWISE_NOT:
                drive(leftAst, varEnv, doAnnotate);
                result = new Range(undefined, undefined, false);
                break;
            default:
                result = new Range(undefined, undefined, false);
                break;
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
                // if we have an operation, like +=, we have to compute the new range of the LHS.
                if (ast.assignOp) {
                    right = computeBinaryRange(ast.assignOp, ast.children[0], ast.children[1], varEnv, doAnnotate, constraints, constraintAccu, inverse);
                }
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
            case DECREMENT:
            case MINUS:
            case MUL:
            case DIV:
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
            case MOD:    
            case AND: 
            case OR:
            case NOT:
            case UNARY_PLUS:
            case UNARY_MINUS:
            case BITWISE_NOT:
                result = computeBinaryRange(ast.type, ast.children[0], ast.children[1], varEnv, doAnnotate, constraints, constraintAccu, inverse);
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
            console.log("overall type map for SCRIPT node: " + ast.symbols.toString());
        }
        return result;
    }

    function specToRange(spec) {
        switch (spec.type) {
            case 'number':
                return new Range(spec.val, spec.val, (spec.val | 0) === spec.val);
            case 'array':
                return new RangeArray(spec.val, function (v) { return new Range(v, v, (v | 0) === v); });
            case 'flatarray':
                // only support 1d arrays for now
                if (spec.val.shape.length === 1) {
                    return new RangeArray(spec.val.data, function (v) { return new Range(v, v, (v | 0) === v); });
                }
            default:
                return new Range(undefined, undefined, false);
        }
    };

        function analyze(ast, array, construct, rankOrShape, args, spec) {
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
            // if we have some spec information, we can use that instead
            ast.params.forEach(function (v, idx) { 
                    if (idx >= argoffset) {
                        if (spec && spec[idx-argoffset]) {
                            env.update(v, specToRange(spec[idx-argoffset]));

                        } else {
                            env.update(v, new Range(undefined, undefined, false));
                        }
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
            ast.rangeSymbols = env;
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

        function updateToNew(type, target, name) {
            debug && console.log("updating " + (name ? name + "::" : "") + type.toString() + " to " + target);
            if (type.isNumberType()) {
                type.OpenCLType = target;
            } else if (type.isArrayishType()) {
                updateToNew(type.properties.elements, target, name);
                type.updateOpenCLType();
            } else if (type.isBoolType()) {
                //�do nothing. bool and int work nicely together.
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
                                updateToNew(typeInfo, "int", decl.value);
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
                                         var type = tEnv.lookup(ast.value).type;
                                         if (type) {
                                            ast.typeInfo = type.clone();
                                         }
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
                            ast.children[0].typeInfo = tEnv.lookup(ast.children[0].value).type.clone();
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
                    ast.typeInfo = tEnv.lookup(ast.value).type.clone();
                    // if the variable is a float but this expression is known to be 
                    // an int, we have to put a cast here
                    if (isIntValue(ast) && (!validIntRepresentation(ast.typeInfo.OpenCLType))) {
                        ast = makeCast(ast, "int");
                        ast.rangeInfo = ast.children[0].rangeInfo; // inherit range info
                    }
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
                        ast.typeInfo && updateToNew(ast.typeInfo, "int", ast.value);
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
                            if (ast.rangeInfo) {
                                newAst.rangeInfo = ast.rangeInfo.clone(); // if we have valid range info, TOINT32 will preserve it
                            }
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

            if (debug && (ast.type === SCRIPT)) {
                console.log("overall range map for SCRIPT node after push: " + ast.rangeSymbols.toString());
                console.log("overall type map for SCRIPT node after push: " + ast.symbols.toString());
            }

            return ast;
        }

        function propagate(ast, construct) {
            // if we found that the iv is used as an int only, we update its type.
            if ((construct === "combine") || (construct === "comprehension") || (construct === "comprehensionScalar")) {
                var tEnv = ast.symbols;
                var rEnv = ast.rangeSymbols;
                var rangeInfo = ast.rangeSymbols.lookup(ast.params[0]);
                if (((rangeInfo instanceof RangeArray) ? rangeInfo.isInt() : rangeInfo.isInt)) {
                    updateToNew(tEnv.lookup(ast.params[0]).type, "int");
                    updateToNew(ast.typeInfo.parameters[(construct === "combine") ? 1 : 0], "int");
                }
            }

            return push(ast.body, null, undefined);
        }

        return {
            "analyze" : analyze,
            "propagate" : propagate
        };
}();

/* File jit/compiler/inferblockflow.js*/
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

/* File jit/compiler/infermem.js*/
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
                this._store[mem].union(other._store[mem]);
            } else {
                this.add(mem);
            }
        }
    };
    MSP.overlay = function overlap (other) {
        var keys = Object.keys(this._store);
        var keyPos = 0;
        for (var mem in other._store) {
            var ms;
            if (keyPos < keys.length) {
                if (this._store[keys[keyPos]] === null) {
                    this._store[keys[keyPos]] = new MemSet();
                }
                ms = this._store[keys[keyPos]];
                ms.add(mem);
            } else {
                this.add(mem);
                ms = this._store[mem] = new MemSet();
            }
            if (other._store[mem] !== null) {
                for (var alias in other._store[mem]._store) {
                    ms.add(alias);
                }
            }
            keyPos++;
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
            result += "char *" + name + " = " + alias + ";";
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

    var isArrayLiteral = RiverTrail.Helper.isArrayLiteral;

    // The code below creates a single buffer for each
    // dimension of the nested array. These buffers are
    // attached to the AST node and the backend emits code
    // for initializing the pointers in each of these
    // buffers.
    function allocateArrayMem(ast, memVars) {
        var shape = ast.typeInfo.getOpenCLShape();
        var shape_len = shape.length;
        if(shape_len === 1) {
            ast.allocatedMem = memVars.allocate(ast.typeInfo.getOpenCLSize(), "CALL");
        }
        else {
            ast.memBuffers = {size:0, list:[]};
            var redu = 1;
            for(var i = 0; i < shape_len; i++) {
                //var type_size = getTypeSize(i, shape, ast.typeInfo.OpenCLType);
                var type_size = RiverTrail.Helper.getOpenCLSize(ast.typeInfo.OpenCLType);
                var allocation_size = type_size*shape[i]*redu;
                //debug && console.log("Allocating " + allocation_size + " bytes in " +  "CALL_"
                //        + i + "  for i = " + i);
                var memBufferName = memVars.allocate(allocation_size, "CALL_" + i);
                ast.memBuffers.size +=1;
                ast.memBuffers.list.push(memBufferName);

                redu = redu*shape[i];
            }
            // Set the primary memory buffer for this node to be the
            // top-level buffer
            ast.allocatedMem = ast.memBuffers.list[0];
            //debug && console.log("Total AST allocations: ", ast.memBuffers.size, ast.memBuffers.list.length);
        }
    }


    // We allocate memory for the fields of the object
    // and for the object itself (pointer to the fields)
    function allocateObjMem(ast, memVars) {
        var fields = ast.typeInfo.properties.fields;
        var objSize = 0;
        ast.memBuffers = {__size:0, __root:null};
        for(var idx in fields) {
            ast.memBuffers[idx] = [];
            if(fields[idx].isScalarType()) {
                var allocation_size = RiverTrail.Helper.getOpenCLSize(fields[idx].OpenCLType);
                objSize += allocation_size;
            }
            else if (fields[idx].name === "InlineObject") {
                reportError("InlineObject type properties not implemented yet");
            }
            else if(fields[idx].name === "Array") {
                var shape = fields[idx].getOpenCLShape();
                var shape_len = shape.length;

                objSize += RiverTrail.Helper.getOpenCLSize(fields[idx].OpenCLType);
                var redu = 1;
                for(var i = 0; i < shape_len; i++) {
                    //var type_size = getTypeSize(i, shape, ast.typeInfo.OpenCLType);
                    var type_size = RiverTrail.Helper.getOpenCLSize(fields[idx].OpenCLType);
                    var allocation_size = type_size*shape[i]*redu;
                    debug && console.log("Allocating " + allocation_size + " bytes in " +  "FLD_" + i + "  for i = " + i);
                    var memBufferName = memVars.allocate(allocation_size, "FLD_" + i);
                    ast.memBuffers.__size +=1;
                    ast.memBuffers[idx].push(memBufferName);
                    redu = redu*shape[i];
                }
            }
            else {
                reportError("Unknown field type");
            }
        }
        // Allocate space for the fields of the object
        var obj_memBufferName = memVars.allocate(objSize, "OBJ");
        ast.memBuffers.size += 1;
        ast.memBuffers.__root = obj_memBufferName;
        ast.allocatedMem = obj_memBufferName;
    }

    function infer(ast, memVars, ins, outs) {
        "use strict";

        switch (ast.type) {
            case SCRIPT:
                ast.funDecls.forEach(function (f) {infer(f.body);});
                ast.memVars = new MemList();
                ast.children.forEach(function (child) { infer(child, ast.memVars, null, null); });
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
                // special case: if the value is an ARRAY_INIT that only contains allocation free
                // expressions, we do not allocate space for the frame as it is directly written
                // however, we might have to allocate memory for the expression itself.
                if (!isArrayLiteral(ast.value)) {
                    infer(ast.value, memVars, ins, outs);
                } else {
                    ast.value.children.forEach(function (v) { infer(v, memVars, ins, outs); });
                }
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
                if (ast.expression) {
                    infer(ast.expression, memVars, ins, outs);
                }
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
                var aVar = ast.children[0];
                var rhs = ast.children[1];
                var allocationHelper = function (name) {
                    "use strict";
                    if(!ast.typeInfo.isScalarType()) {
                        var shape = rhs.typeInfo.getOpenCLShape();
                        var shape_len = shape.length;
                        debug && console.log("Creating memory for " + name + " with shape: ", shape);
                        ast.memBuffers = {size:0, list:[]};
                        var redu = 1;
                        for(var i = 0; i < shape_len; i++) {
                            //var type_size = getTypeSize(i, shape, ast.typeInfo.OpenCLType);
                            var type_size = RiverTrail.Helper.getOpenCLSize(ast.typeInfo.OpenCLType);
                            var allocation_size = type_size*shape[i]*redu;
                            debug && console.log("Allocating " + allocation_size + " bytes in " +  name
                                    + "_" + i + "  for i = " + i);
                            var memBufferName = memVars.allocate(allocation_size, name + "_" + i);
                            ast.memBuffers.size +=1;
                            ast.memBuffers.list.push(memBufferName);

                            redu = redu*shape[i];
                        }
                        // Set the primary memory buffer for this node to be the
                        // top-level buffer
                        ast.allocatedMem = ast.memBuffers.list[0];
                        debug && console.log("Total AST allocations: ", ast.memBuffers.size, ast.memBuffers.list.length); 
                    }
                };
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
                        //
                        // case 3:
                        // if the lhs and rhs use different floating point representations, we have to copy, too.
                        if (((ast.children[1].typeInfo.getOpenCLAddressSpace() === "__private") && // case 1
                            (ins && ins.contains(aVar.value) && outs && outs.contains(aVar.value))) ||
                            (aVar.typeInfo.getOpenCLAddressSpace() != ast.children[1].typeInfo.getOpenCLAddressSpace()) || // case 2
                            (!aVar.typeInfo.equals(rhs.typeInfo, true))) { // case 3
                            allocationHelper(ast.children[0].value);
                        }
                        break;
                    case INDEX:
                        // case of a[iv] = expr. 
                        if ((aVar.typeInfo.getOpenCLAddressSpace() != ast.children[1].typeInfo.getOpenCLAddressSpace()) || 
                            (!aVar.typeInfo.equals(rhs.typeInfo, true))) { 
                            allocationHelper("INDEX");
                        }
                        break;
                    case DOT:
                        // Support for updates on object properties.
                        if (!aVar.typeInfo.equals(rhs.typeInfo, true)) { 
                            allocationHelper("DOT");
                        }
                        break;
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
                // These require allocation
                if((ast.typeInfo.properties.shape.length === 1) && ast.typeInfo.properties.elements.isScalarType()) {
                    ast.allocatedMem = memVars.allocate(ast.typeInfo.getOpenCLSize(), "ARRAY_INIT");
                }
                else {
                    // If this is a nested array, we only need to allocate
                    // memory for the current outermost array expression.
                    ast.allocatedMem = memVars.allocate(RiverTrail.Helper.getOpenCLSize(ast.typeInfo.OpenCLType) * ast.typeInfo.properties.shape[0], "ARRAY_INIT");
                }
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
            case LIST:      
            case CAST:
            case FLATTEN:
            case TOINT32:
                if (ast.children) {
                    ast.children.forEach( function (child) { infer(child, memVars, ins, outs); });
                }
                break;
            case CALL: 
                if (ast.children) {
                    if(ast.children[0].type === DOT && ast.children[0].children[0].value === "RiverTrailUtils") {
                        switch (ast.children[0].children[1].value) {
                            case "createArray":
                                allocateArrayMem(ast, memVars);
                                break;
                            default:
                                reportError("Invalid method " + ast.children[0].children[1].value + " on RiverTrailUtils", ast);
                        }
                    }
                    else {
                        ast.children.forEach( function (child) { infer(child, memVars, ins, outs); });
                    }
                }
                if(ast.typeInfo.name === "InlineObject") {
                    allocateObjMem(ast, memVars);
                }
                // If I am returning an Array space needs to be allocated for it in the caller and 
                // the name of the space should be left in the CALL nodes allocatedMem field so that when
                // I generate the call it is available. However, if this method does return a pointer
                // to some existing data, like |get| on ParallelArray, the type inference will have
                // left an isShared annotation and no memory needs to be allocated.
                else if (!ast.typeInfo.isScalarType() && !ast.typeInfo.properties.isShared) { 
                    // This call returns a nested array. The caller needs to allocate enough
                    // memory for this array and initialize the pointers in
                    // the allocated buffer to create a structure that the
                    // callee can simply fill the leaves of.
                    //
                    allocateArrayMem(ast, memVars);
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
                for(var idx = 0; idx < ast.children.length; idx++) {
                    infer(ast.children[idx].children[1], memVars, ins, outs);
                }
                break;
            case NEW_WITH_ARGS:
            case OBJECT_INIT:
                for(var idx = 0; idx < ast.children.length; idx++) {
                    infer(ast.children[idx].children[1], memVars, ins, outs);
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

/* File jit/compiler/genOCL.js*/
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
var doIterationSpaceFlattening = false;

RiverTrail.compiler.codeGen = (function() {
    const verboseDebug = false;
    const checkBounds = true;
    const checkall = false;
    const disableVectorization = false;
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

    // helper to manage temporary variables
    var tempVars = [];
    tempVars.declare = function () {
        var s = this.join(";") + ";";
        this.splice(0, this.length);
        return s;
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
                var idxTypeStr = RiverTrail.Helper.stripToBaseType(indexType.OpenCLType);
                s = s + indexType.getOpenCLAddressSpace() +" "+ idxTypeStr + " " +
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
                    s = s + "(" + idxTypeStr + ") _id_" + i;
                }
                s = s + "};";
            } else {            
                // this path is taken by scalar comprehensions
                s = s + " "+indexType.OpenCLType+" "+ indexName+" = _id_0;"; 
            }
            } else if (construct === "map") {
                // 
                // The relative argumment is a value found in the ParallelArray.
                indexName = funDecl.params[0];
                indexType = funDecl.typeInfo.parameters[1];
                if (indexType.isScalarType()) {
                    s = s + " " + indexType.OpenCLType+" "+ RENAME(indexName)+" = tempThis[_readoffset];"
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
            var body = oclStatements(ast.body); // Generate the statements;
            s += tempVars.declare() + body;
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
            if(disableVectorization)
                s = s + "__kernel __attribute__((vec_type_hint(float3)))  void RT_" + funDecl.name + "(";
            else
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

            if(doIterationSpaceFlattening && rank == 2) {
                    s = s + "int _id_0" + " = (int)get_global_id(0);";
                    s += "int RT_Fi = (_id_0/" + iterSpace[1] + ");"; 
                    s += "int RT_Fj = _id_0 - (RT_Fi * " + iterSpace[1] + ");"; 
                    s += "_id_0 = RT_Fi; int _id_1 = RT_Fj;";
            }
            else {
                // add code to declare id_x for each iteration dimension
                for (i = 0; i < rank; i++) {
                    s = s + "int _id_" + i + " = (int)get_global_id(" + i + ");";
                }
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
            var body = oclStatements(funDecl.body);
            s = s + tempVars.declare() + body;
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

    function generateCopyExpression(dest, ast) {
        "use strict";

        var s_tmp = ""; 
        var sourceShape = ast.children[1].typeInfo.getOpenCLShape();
        var sourceType = ast.children[1].typeInfo.OpenCLType;
        var maxDepth = sourceShape.length;
        var sourceAddressSpace = (ast.children[1].typeInfo.getOpenCLAddressSpace() == "__global" ? "__global": "");
        if(!(ast.children[1].typeInfo.isScalarType()) && maxDepth >= 1) {
            verboseDebug && console.log("Doing copy assignment to value ", ast.children[0].value, " from shape ", sourceShape);
            var source_tmp_name = "tmp_" + ast.memBuffers.list[0];
            s_tmp += "(";
            tempVars.push("/* Copying Assignment */ " + sourceAddressSpace + " " + sourceType + " " + source_tmp_name);
            s_tmp += source_tmp_name + " = " + oclExpression(ast.children[1]) + "," ;
            var post_parens = ""; 
            var redu = 1; var rhs = ""; var lhs = ""; post_parens = ")";
            for(var i = 0 ; i < maxDepth; i++) {
                for(var j = 0; j < sourceShape[i]*redu; j++) {
                    if(i===maxDepth-1) {
                        lhs = "(" + getPointerCast(i, maxDepth, ast.typeInfo.OpenCLType) +
                            ast.memBuffers.list[i] + ")" + "[" + j + "]";
                        var n = j; var idx = "";
                        if (sourceAddressSpace === "__global") {
                            idx = "["+n+"]";
                        } else {
                            for(var k = maxDepth-1; k >=0; k--) {
                                idx = "[" + n % sourceShape[k] +"]" + idx;
                                n = Math.floor(n/sourceShape[k]);
                            }
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
            s_tmp = "(" + dest + (ast.assignOp ? tokens[ast.assignOp] : "") + "= " + s_tmp + ")";
        }
        else if(ast.typeInfo.isScalarType()) {
            // Do scalars ever have memory allocated to
            // them ?
            throw new Error("Compiler bug: Memory allocated for scalar copy");
        }
        return s_tmp;
    }


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
                            s += generateCopyExpression(RENAME(ast.children[0].value), ast);
                        } else {
                            s = s + "(" + RENAME(ast.children[0].value) + (ast.assignOp ? tokens[ast.assignOp] : "") + "= " + oclExpression(ast.children[1]) + ")"; // no ; because ASSIGN is an expression!
                        }
                        break;
                    case INDEX:
                        // array update <expr>[iv] = expr
                        // make sure that <expr> is in the __private address space. We catch it this late just for
                        // prototyping convenience. Could go anywhere after TI.
                        (findSelectionRoot(ast.children[0]).typeInfo.getOpenCLAddressSpace() !== "__global") || reportError("global arrays are immutable", ast);

                        if (ast.allocatedMem) {
                            s = s + generateCopyExpression(oclExpression(ast.children[0]), ast);
                        } else {
                            s = s + "((" + oclExpression(ast.children[0]) + ")" + (ast.assignOp ? tokens[ast.assignOp] : "") + "= " + oclExpression(ast.children[1]) + ")";
                        }
                        break;
                    case DOT:
                        // object property update.
                        // a.b = c;
                        // make sure that address spaces are right!
                        if (ast.allocatedMem) {
                            s = s + generateCopyExpression("(" + oclExpression(ast.children[0].children[0]) + "->" + ast.children[0].children[1].value + ")", ast);
                        } else {
                            s = s + "((" + oclExpression(ast.children[0].children[0]) + "->" + ast.children[0].children[1].value + ")" + (ast.assignOp ? tokens[ast.assignOp] : "") + "= " + oclExpression(ast.children[1]) + ")" ;
                        }
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
                var incType = incArg.typeInfo.OpenCLType;
                var outerType = ast.children[0].typeInfo.OpenCLType;
                switch (incType) {
                    case "float":
                    case "double":
                        // SAH: OpenCL does not have ++/-- for float and double, so we emulate it
                        if (ast.postfix) {
                            s = "((" + outerType + ") (" + RENAME(incArg.value) + " " + ast.value.substring(0, 1) + "= ((" + incType + ") 1)))";
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
                s = s + oclExpression(ast);
                break;
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
                    s = s + "((int)" + oclExpression(ast.children[0]) + ")"; 
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

/* File jit/compiler/runOCL.js*/
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

RiverTrail.compiler.runOCL = function () {
    // Executes the kernel function with the ParallelArray this and the args for the elemental function
    // paSource     - 'this' inside the kernel

    // kernel       - a precompiled kernel (CData)
    // ast          - result from parsing
    // construct    - outer construct in {combine,map,comprehension,comprehensionScalar}
    // rankOrShape  - either the rank of the iteration space, or for comprehension the shape of the interationspace
    // actualArgs   - extra kernel arguments
    // argumentTypes- types of kernel arguments
    // lowPrecision - whether kernel is meant to use float
    // useBuffer... - whether buffers should be cached
    var runOCL = function runOCL(paSource, kernel, ast, construct, rankOrShape, actualArgs,
                                 argumentTypes, lowPrecision, useBufferCaching) {
        var paResult;
        var kernelArgs = [];
        var resultMem;
        var sourceType;
        var iterSpace;
        var rank;
        if ((construct === "comprehension") || (construct === "comprehensionScalar")) {
            // comprehensions do not have a source, so we derive the required information
            // from rank and the ast
            sourceType = undefined;
            iterSpace = rankOrShape;
            rank = iterSpace.length;
        } else {
            sourceType = RiverTrail.Helper.inferPAType(paSource);
            rank = rankOrShape;
            iterSpace = sourceType.dimSize.slice(0, rank);
        }
        // construct kernel arguments
        var jsObjectToKernelArg = function (args, object) {
            if (object instanceof ParallelArray) {

                if (object.name === "CData") {
                    // we already have an OpenCL value
                    args.push(object.data);
                } else if(RiverTrail.Helper.isWebCLBufferObject(object.cachedOpenCLMem)) {
                    // JS: If we already have an OpenCL buffer, push that.
                    args.push(object.cachedOpenCLMem);
                } else if (RiverTrail.Helper.isTypedArray(object.data)) {
                    var memObj;
                    if (object.cachedOpenCLMem) {
                        memObj = object.cachedOpenCLMem;
                    } else {
                        // JS: We may not have mapped this ParallelArray before,
                        // so we map it now
                        memObj = RiverTrail.runtime.mapData(object.data);
                    }
                    args.push(memObj);
                    if (useBufferCaching) {
                        object.cachedOpenCLMem = memObj;
                    }
                } else {
                    // We have a regular array as data container. There is no point trying
                    // to convert it, as the constructor would already have tried.
                    throw new Error("Cannot transform regular array to OpenCL kernel arguments");
                }
                // N.B.: The following argument is for the array
                // offset, but we are already statically computing it,
                // and so we don't need to pass it dynamically (in
                // fact, it is incorrect to do both; see issue
                // #48). So we just pass 0 here instead.  A more
                // thorough fix would probably involve tweaking
                // codegen to not require any offset to be passed
                // dynamically.
                args.push(new RiverTrail.Helper.Integer(0));
            } else if (object instanceof RiverTrail.Helper.FlatArray) {
                // these are based on a flat array, so we can just push the data over
                args.push(RiverTrail.runtime.mapData(object.data));
            } else if (object instanceof Array) {
                // we have an ordinary JS array, which has passed the uniformity checks and thus can be mapped
                args.push(RiverTrail.runtime.mapData(object));
            } else if (typeof (object) === "number") {
                // Scalar numbers are passed directly, as doubles.
                args.push(object);
            } else if (object instanceof Number) {
                // Numbers are passed as just their values
                args.push(object.valueOf());
            } else if (object instanceof RiverTrail.Helper.Integer) {
                // How did I get here.
                console.log("(object instanceof RiverTrail.Helper.Integer) encountered unexpectedly");
                // Integers are passed directly
                args.push(object);
            } else if (RiverTrail.Helper.isTypedArray(object)) {
                // map the typed array
                args.push(RiverTrail.runtime.mapData(object));
            } else {
                throw new Error("only typed arrays and scalars are currently supported as OpenCL kernel arguments");
            }
            return args;
        }
        if ((construct !== "comprehension") && (construct !== "comprehensionScalar")) {
            jsObjectToKernelArg(kernelArgs, paSource);
            // console.log("jsObjectToKernelArg:kernelArgs.length: "+kernelArgs.length);
        }
        if (actualArgs !== undefined) {
            Array.prototype.reduce.call(actualArgs, jsObjectToKernelArg, kernelArgs);
        }
        // add memory for result
        // SAH: We have agreed that operations are elemental type preserving, thus I reuse the type
        //      of the argument here.
        if (paSource && (paSource.updateInPlacePA !== undefined)) {
            if (ast.typeInfo.result.isObjectType("InlineObject")) {
                // we do not support a scan over multiple results
                throw new Error("the impossible happened: in place scan operation with multiple returns!");
            }
            // the result space has been preallocated for us! So just use/map what is there.
            // See scan for how this is supposed to work
            // first we ensure that the shape of what we compute is the shape of what is expected
            var resShape;
            if (ast.typeInfo.result.isScalarType()) {
                resShape = iterSpace;
            } else {
                resShape = iterSpace.concat(ast.typeInfo.result.getOpenCLShape());
            }
            if (resShape.some(function (e,i) { return e !== paSource.updateInPlaceShape[i];})) {
                // throwing this will revert the outer scan to non-destructive mode
                throw new Error("shape mismatch during update in place!");
            }
            if (++paSource.updateInPlacePA.updateInPlaceUses !== 1) {
                throw new Error("preallocated memory used more than once!");
            }

            if (paSource.updateInPlacePA.data.name !== "CData") {
                if (paSource.updateInPlacePA.cachedOpenCLMem) {
                    paSource.updateInPlacePA.data = paSource.updateInPlacePA.cachedOpenCLMem;
                    delete paSource.updateInPlacePA.cachedOpenCLMem;
                } else {
                    paSource.updateInPlacePA.data = RiverTrail.runtime.mapData(paSource.updateInPlacePA.data);
                    if (useBufferCaching) {
                        paSource.updateInPlacePA.cachedOpenCLMem = paSource.updateInPlacePA.data;
                    }
                }
            }
            resultMem = {mem: paSource.updateInPlacePA.data, shape: resShape, type: RiverTrail.Helper.stripToBaseType(ast.typeInfo.result.OpenCLType), offset: paSource.updateInPlaceOffset};
            kernelArgs.push(resultMem.mem);
            kernelArgs.push(new RiverTrail.Helper.Integer(paSource.updateInPlaceOffset));
        } else {
            var allocateAndMapResult = function (type) {
                var resultElemType = RiverTrail.Helper.stripToBaseType(type.OpenCLType);
                var resShape;
                if (type.properties) {
                    resShape = iterSpace.concat(type.getOpenCLShape());
                } else {
                    resShape = iterSpace;
                }
                var template = RiverTrail.Helper.elementalTypeToConstructor(resultElemType);
                if (template == undefined) throw new Error("cannot map inferred type to constructor");
                var objToMap = new template(shapeToLength(resShape));
                var memObj = RiverTrail.runtime.mapData(objToMap);
                kernelArgs.push(memObj);
                kernelArgs.push(new RiverTrail.Helper.Integer(0));
                return {mem: memObj, shape: resShape, type: resultElemType, offset: 0, hostAllocatedObject: objToMap};
            };

            // We allocate whatever the result type says. To ensure portability of 
            // the extension, we need a template typed array. So lets just create one!
            if (ast.typeInfo.result.isObjectType("InlineObject")) {
                // we have multiple return values
                resultMem = {};
                for (var name in ast.typeInfo.result.properties.fields) {
                    resultMem[name] = allocateAndMapResult(ast.typeInfo.result.properties.fields[name]);
                }
            } else {
                // allocate and map the single result
                resultMem = allocateAndMapResult(ast.typeInfo.result);
            }
        }

        for(var argIdx = 0; argIdx < kernelArgs.length; argIdx++) {
            var arg = kernelArgs[argIdx];
            try {
                if (typeof (arg) === "number") {
                    RiverTrail.runtime.setScalarArgument(kernel, argIdx, arg, false, !lowPrecision);
                } else if (arg instanceof RiverTrail.Helper.Integer) {
                    RiverTrail.runtime.setScalarArgument(kernel, argIdx, arg.value, true, false);
                    // console.log("good");

                } else if (typeof(arg) === "object" && arg.name === "CData") {
                    RiverTrail.runtime.setArgument(kernel, argIdx, arg);
                }else if (typeof(arg) === "object" && arg._name === "WebCLBuffer") {
                    RiverTrail.runtime.setArgument(kernel, argIdx, arg);
                } else {
                    throw new Error("unexpected kernel argument type!");
                }
            } catch (e) {
                console.log("reduce error: ", e, " index: ", argIdx, "arg: ", arg);
                throw e;
            }
        }
        /*
        // set arguments
        kernelArgs.reduce(function (kernel, arg, index) {
            try {
                //console.log("driver 344 index: ", index, " arg: ", arg);
                if (typeof (arg) === "number") {
                    RiverTrail.runtime.setScalarArgument(kernel, index, arg, false, !lowPrecision);
                } else if (arg instanceof RiverTrail.Helper.Integer) {
                    // console.log("index: ", index, " arg.value: ", arg.value);
                    RiverTrail.runtime.setScalarArgument(kernel, index, arg.value, true, false);
                    // console.log("good");

                } else if (typeof(arg) === "object" && arg.name === "CData") {
                    RiverTrail.runtime.setArgument(kernel, index, arg);
                }else if (typeof(arg) === "object" && arg._name === "WebCLBuffer") {
                    RiverTrail.runtime.setArgument(kernel, index, arg);
                } else {
                    throw new Error("unexpected kernel argument type!");
                }
                return kernel;
            } catch (e) {
                console.log("reduce error: ", e, " index: ", index, "arg: ", arg);
                throw e;
            }
        }, kernel);
        */

        if ((construct === "map") || (construct == "combine") || (construct == "comprehension") || (construct == "comprehensionScalar")) {
            // The differences are to do with args to the elemental function and are dealt with there so we can use the same routine.
            // kernel.run(rank, shape, tiles)
            try {
                var kernelFailure = false;
                if(doIterationSpaceFlattening && rank == 2) {
                    var redu = [1];
                    for(var i = 0; i < rank; i++) {
                        redu [0] *= iterSpace[i];
                    }
                    kernelFailure = RiverTrail.runtime.run(kernel, 1, redu, iterSpace.map(function () { return 1; }));
                }
                else {
                    kernelFailure = RiverTrail.runtime.run(kernel, rank, iterSpace, iterSpace.map(function () { return 1; }));
                }
            } catch (e) {
                console.log("kernel.run fails: ", e);
                throw e;
            }
            if (kernelFailure) {
                // a more helpful error message would be nice. However, we don't know why it failed. A better exception model is asked for...
                throw new Error("kernel execution failed: " + RiverTrail.compiler.codeGen.getError(kernelFailure));
            }
        } else {
            alert("runOCL only deals with comprehensions, map and combine (so far).");
        }

        if (RiverTrail.Helper.isCData(resultMem.mem) || RiverTrail.Helper.isWebCLBufferObject(resultMem.mem)) {
            // single result
            paResult = new ParallelArray(resultMem.mem, resultMem.hostAllocatedObject, resultMem.shape);
            if (useBufferCaching) {
                paResult.cachedOpenCLMem = resultMem.mem;
            }
        } else {
            // multiple results
            var multiPA = {};
            for (var name in resultMem) {
                multiPA[name] = new ParallelArray(resultMem[name].mem, resultMem[name].shape, resultMem[name].type, resultMem[name].offset);
                if (useBufferCaching) {
                    multiPA[name].cachedOpenCLMem = resultMem[name].mem;
                }
            }
            paResult = new IBarfAtYouUnlessYouUnzipMe(multiPA);
        }

        return paResult;
    };

    // unsophisticated wrapper around multiple ParallelArray objects. This wrapper will block
    // all calls the ParallelArray API except for unzip, which returns the contained
    // data object.
    var IBarfAtYouUnlessYouUnzipMe = function IBarfAtYouUnlessYouUnzipMe(data) {
        this.unzip = function () {
            return data;
        };

        return this;
    };
    var barf = function barf(name) {
        return function () {
            throw "`" + name + "' not implemented for ParallelArray of objects. Please call `unzip' first!";
        }
    };
    IBarfAtYouUnlessYouUnzipMe.prototype = {};
    IBarfAtYouUnlessYouUnzipMe.prototype.map = barf("map");
    IBarfAtYouUnlessYouUnzipMe.prototype.combine = barf("combine");
    IBarfAtYouUnlessYouUnzipMe.prototype.scan = barf("scan");
    IBarfAtYouUnlessYouUnzipMe.prototype.filter = barf("filter");
    IBarfAtYouUnlessYouUnzipMe.prototype.scatter = barf("scatter");
    IBarfAtYouUnlessYouUnzipMe.prototype.reduce = barf("reduce");
    IBarfAtYouUnlessYouUnzipMe.prototype.get = barf("get");
    IBarfAtYouUnlessYouUnzipMe.prototype.partition = barf("partition");
    IBarfAtYouUnlessYouUnzipMe.prototype.flatten = barf("flatten");
    IBarfAtYouUnlessYouUnzipMe.prototype.toString = barf("toString");
    IBarfAtYouUnlessYouUnzipMe.prototype.getShape = barf("getShape");
    IBarfAtYouUnlessYouUnzipMe.prototype.getData = barf("getData");
    IBarfAtYouUnlessYouUnzipMe.prototype.getArray = barf("getArray");

    // Given the shape of an array return the number of elements. Duplicate from ParallelArray.js 
    var shapeToLength = function shapeToLength(shape) {
        var i;
        var result;
        if (shape.length == 0) {
            return 0;
        }
        result = shape[0];
        for (i = 1; i < shape.length; i++) {
            result = result * shape[i];
        }
        return result;
    };

    return runOCL;
} ();
