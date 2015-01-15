Building the Firefox River Trail Extension
==========================================

**This README is for extension developers.**  If you just want to install the River Trail extension, you can [install a pre-built version](https://github.com/IntelLabs/RiverTrail/releases).

Preliminaries: OpenCL SDK
-------------------------

MacOS X 10.6 and later already provide the required OpenCL stack as part of the operating system. On Windows and Linux, you will need to install [the Intel OpenCL SDK] for the extension to work.

[the Intel OpenCL SDK]: https://software.intel.com/en-us/intel-opencl

Building the extension
----------------------

This extension is based on the [Firefox Add-on SDK](https://developer.mozilla.org/en-US/Add-ons/SDK).  In order to build and test the extension, first install the Add-on SDK and activate it in the Add-on SDK's directory. For example, on Linux, Mac OS and MinGW on Windows:
```bash
cd addon-sdk
source bin/activate
```
On Windows with the native shell:
```bash
cd addon-sdk
bin\activate
```
You can then test, run, and package the extension using the [cfx](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/cfx) tool that comes with the Add-on SDK.  (Note: as of this writing, cfx is due to be replaced with [jpm](https://www.npmjs.com/package/jpm) in the near future.)

```bash
cd RiverTrail/extension
cfx run # launches an instance of Firefox with the extension
cfx xpi # creates an installable XPI file
```
Once you have the extension up and running, test it out with one of our [demos](https://github.com/IntelLabs/RiverTrail/wiki#sample-applications).
