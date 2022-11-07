> :warning: **DISCONTINUATION OF PROJECT** - *This project will no longer be maintained by Intel.  This project has been identified as having known security escapes.  Intel has ceased development and contributions including, but not limited to, maintenance, bug fixes, new releases, or updates, to this project.* **Intel no longer accepts patches to this project.**

River Trail
===========

River Trail is a JavaScript library and a Firefox add-on that together provide support for **data-parallel programming in JavaScript**, targeting multi-core CPUs, GPUs and vector SSE/AVX instructions.

Please see the [project wiki](https://github.com/IntelLabs/RiverTrail/wiki) or the [FAQs](https://github.com/IntelLabs/RiverTrail/wiki/Frequently-Asked-Questions) for more details.

## Quick Start

  1. Install [OpenCL](http://www.intel.com/go/opencl).  (Mac OS X users can skip this step, since OpenCL is already part of the system.)
  2. Install or open [Firefox](https://www.mozilla.org/en-US/firefox/new/).  Important: see the below note about Firefox version requirements.
  3. Install the [River Trail Firefox add-on](https://github.com/IntelLabs/RiverTrail/releases/).
  4. Using Firefox with the River Trail add-on enabled, try one of our [live demos](https://github.com/IntelLabs/RiverTrail/wiki#sample-applications), or the [interactive shell](http://intellabs.github.io/RiverTrail-interactive/)!
  5. A good way to get started with programming with the River Trail API is to go through our [tutorial](http://intellabs.github.io/RiverTrail/tutorial/).

## Firefox version requirements

The final release of River Trail ([v0.35.0](https://github.com/IntelLabs/RiverTrail/releases)) is known to work with Firefox versions 33, 34, and 35.  It may work with newer versions of Firefox, but has not been tested.

Note that River Trail is an unsigned extension.  Beginning with Firefox 42, Mozilla began to change their extension security model to require extensions to be [signed through addons.mozilla.org](https://wiki.mozilla.org/Add-ons/Extension_Signing).  Extension signing is now mandatory and cannot be overridden for Firefox release and beta channels, but [may be overridden in Firefox nightly and Firefox Developer Edition](https://wiki.mozilla.org/Add-ons/Extension_Signing) by setting the `xpinstall.signatures.required` preference to "false".
