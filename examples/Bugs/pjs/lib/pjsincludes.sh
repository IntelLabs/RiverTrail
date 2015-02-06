#!/bin/bash
d=$1
cat <<EOF
    <script type="text/javascript" src="$d/jslib/ParallelArray.js"></script>
    <script type="application/javascript" src="$d/jslib/jit/narcissus/jsdefs.js"></script>
    <script type="application/javascript" src="$d/jslib/jit/narcissus/jslex.js"></script>
    <script type="application/javascript" src="$d/jslib/jit/narcissus/jsparse.js"></script>
    <script type="application/javascript" src="$d/jslib/jit/narcissus/jsdecomp.js"></script>
    <script type="application/javascript" src="$d/jslib/jit/compiler/definitions.js"></script>
    <script type="application/javascript" src="$d/jslib/jit/compiler/helper.js"></script>
    <script type="application/javascript" src="$d/jslib/jit/compiler/driver.js"></script>
    <script type="application/javascript" src="$d/jslib/jit/compiler/dotviz.js"></script>
    <script type="application/javascript" src="$d/jslib/jit/compiler/typeinference.js"></script>
    <script type="application/javascript" src="$d/jslib/jit/compiler/rangeanalysis.js"></script>
    <script type="application/javascript" src="$d/jslib/jit/compiler/inferblockflow.js"></script>
    <script type="application/javascript" src="$d/jslib/jit/compiler/infermem.js"></script>
    <script type="application/javascript" src="$d/jslib/jit/compiler/genOCL.js"></script>
    <script type="application/javascript" src="$d/jslib/jit/compiler/runOCL.js"></script>
EOF
