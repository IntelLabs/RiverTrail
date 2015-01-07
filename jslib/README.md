# River Trail library source code

This directory contains source files for the River Trail library.  **Don't include these files in your web page.  Instead, use `RiverTrail.js` or `RiverTrail.min.js` from the `../dist/` directory.**

The `Gruntfile.js` and `package.json` files in this directory are intended for use with the [Grunt](http://gruntjs.com) JavaScript task runner.  In order to use them:

  * Install [Node.js](http://nodejs.org/) and `npm`, the Node.js package manager.
  * In this directory, run `npm install`.  This will install Grunt and two Grunt plugins, `grunt-contrib-concat` and `grunt-contrib-uglify`.
  * Install the Grunt command-line interface: `npm install -g grunt-cli`.  (You may need to do this with `sudo` or administrator privileges.)
  * Finally, run `grunt` in this directory.  Doing so will concatenate the River Trail library source files into a single file, `../dist/RiverTrail.js`.  It will also create a minified version, `../dist/RiverTrail.min.js`.
