Building the Firefox OpenCL Interface Extension
=================================================

Prerequisites
-------------

Before you can start, you need to download the Gecko SDK. The latest version can
be found at

https://developer.mozilla.org/en/gecko_sdk

Download the windows or Mac OS archive and extract at least the bin, lib, idl and
include directories to the gecko-sdk directory. For MacOS, you will usually want
to download the 64 bit version.

OpenCL Stack
------------

MacOS X 10.6 and later already provide the required OpenCL stack as part of the 
operating system. On Windows, you will need to install Intel OpenCL SDK available at

http://www.intel.com/go/opencl

Building the extension - MacOS
------------------------------

Open a terminal and navigate to the extension subdirectory. Execute the following
commands:

make
make deploy

This will build the C++ part of the extension and populate the xpi-contents directory.

Building the extension - Windows
--------------------------------

You will need at least Visual C++ Express 2010. Open the project file found in the
extension directory. From the menu select Build->Build solution or press F7. This will
build the C++ part of the extension and populate the xpi-contents directory.

Creating the XPI file
---------------------

To create an XPI file, which can be directly installed as an extension in Firefox, add
the contents of the xpi-content directory to a new zip archive. Next, change the 
extension of the newly created file from zip to xpi.

Further details on extension packaging can be found at

https://developer.mozilla.org/en/extension_packaging

