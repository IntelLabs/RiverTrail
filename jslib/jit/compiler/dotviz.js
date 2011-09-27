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
