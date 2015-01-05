Building the Firefox River Trail Extension
==========================================

Preliminaries: OpenCL SDK
-------------------------

MacOS X 10.6 and later already provide the required OpenCL stack as part of the operating system. On Windows and Linux, you will need to install [the Intel OpenCL SDK] for the extension to work.

[the Intel OpenCL SDK]: https://software.intel.com/en-us/intel-opencl

Building the extension
----------------------

This extension is based on the [Firefox Add-on SDK](https://developer.mozilla.org/en-US/Add-ons/SDK).  In order to build and test the extension, first install the Add-on SDK and activate it in the Addon SDK's directory. For example, on Linux, Mac OS and MinGW on Windows:
```
cd addon-sdk
source bin/activate
```
On Windows with the native shell:
```
cd addon-sdk
bin\activate
```
You can then test, run, and package the extension using the [cfx](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/cfx) tool that comes with the Add-on SDK.
```
cd RiverTrail/extension
cfx xpi
```
This will create an XPI file. Load this file as an addon in Firefox and try out one of the examples.
