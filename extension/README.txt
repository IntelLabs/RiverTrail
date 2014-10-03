Building the Firefox OpenCL Interface Extension
=================================================

OpenCL Stack
------------

MacOS X 10.6 and later already provide the required OpenCL stack as part of the 
operating system. On Windows and Linux, you will need to install Intel OpenCL 
SDK available at

http://www.intel.com/go/opencl

Building the extension - MacOS
------------------------------

Open a terminal and navigate to the extension subdirectory. Execute the 
following commands:

make -f Makefile.MacOS
make -f Makefile.MacOS deploy

This will build the C++ part of the extension and populate the xpi-contents 
directory.

Building the extension - Linux
------------------------------

Open a terminal and navigate to the extension subdirectory. Execute the 
following commands:

make -f Makefile.Linux
make -f Makefile.Linux deploy

This will build the C++ part of the extension and populate the xpi-contents 
directory.

Building the extension - Windows
--------------------------------

You will need at least Visual C++ Express 2010 and the mozilla build
environment available from

http://ftp.mozilla.org/pub/mozilla.org/mozilla/libraries/win32/MozillaBuildSetup-Latest.exe

Install the build environment to the default directory. Open the project file 
found in the extension directory. From the menu select Build->Build solution 
or press F7. This will build the C++ part of the extension and populate the 
xpi-contents directory.

Creating the XPI file
---------------------

To create an XPI file, which can be directly installed as an extension in
Firefox, add the contents of the xpi-contents directory to a new zip archive.
Next, change the extension of the newly created file from zip to xpi.

On MacOS, you can accomplish this automatically by running the following command
from the extension subdirectory:

make -f Makefile.MacOS xpi

The resulting .xpi file can be directly installed in Firefox.  Further details
on extension packaging can be found at

https://developer.mozilla.org/en/extension_packaging

