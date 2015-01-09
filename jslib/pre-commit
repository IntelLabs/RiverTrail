#!/bin/bash

# This is a pre-commit hook script to run `grunt` and add the
# resulting generated files to the repo.  To run this script as a
# pre-commit hook, save a file containing
#
#    #!/bin/bash
#    
#    ./jslib/pre-commit
#
# as ./git/hooks/pre-commit, ensuring that both that file and this one
# are executable.

cd jslib
grunt && git --git-dir=../.git --work-tree=.. add ../dist/RiverTrail.js ../dist/RiverTrail.min.js