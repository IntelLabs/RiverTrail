The file jf.js contains a *very preliminary* port of the smallpt Monte-Carlo path tracer to Javascript. This tracer supports several features including global illumination and specular, diffuse and refractive BRDFs.

Instructions for running
------------------------

1) Copy the directory containing this README.txt file into the "examples" directory in your RiverTrail distribution. Alternately, you can edit vv.html to point to the RiverTrail libraries.

2) Run jf.js through a C/C++ preprocessor. I use /usr/bin/cpp.

/usr/bin/cpp -P -undef -Wundef -std=c99 -nostdinc -Wtrigraphs -fdollars-in-identifiers -C < ./jf.js  > test.js

3) Open vv.html in Firefox (with native or compiler or library RiverTrail support). This executes the javascript produced in test.js.


Notes:
-------

Increasing samples per pixel
----------------------------

Change the samps constant in jf.js to whatever value you like. With samps = 2, each pixel is processed twice, so two rays are projected one after the other and their color contributions are weighted approproately before being accumulated into a final color for the pixel. High samps means high running time and better resolution/less noise in the final rendered image. A samps of 5000 may take a few (5-10) hours.


Increasing the resolution of the scene
--------------------------------------

Simply increase the size of the "myCanvas" element in vv.html.



