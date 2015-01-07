#!/bin/bash

# This is the pre-Commit hook for concat'ing scripts.
# Move this to .git/hooks

FILES="
    ../jslib/jit/narcissus/jsdefs.js
    ../jslib/jit/narcissus/jslex.js
    ../jslib/jit/narcissus/jsparse.js
    ../jslib/jit/narcissus/jsdecomp.js
    ../jslib/jit/compiler/definitions.js
    ../jslib/jit/compiler/helper.js
    ../jslib/jit/compiler/runtimes.js
    ../jslib/ParallelArray.js
    ../jslib/jit/compiler/driver.js
    ../jslib/jit/compiler/dotviz.js
    ../jslib/jit/compiler/typeinference.js
    ../jslib/jit/compiler/rangeanalysis.js
    ../jslib/jit/compiler/inferblockflow.js
    ../jslib/jit/compiler/infermem.js
    ../jslib/jit/compiler/genOCL.js
    ../jslib/jit/compiler/runOCL.js
"
rm RiverTrail.js
for f in $FILES
do
    echo "Processing $f"
    echo "/* File $f */" >> RiverTrail.js;
    cat $f >> RiverTrail.js;
done
