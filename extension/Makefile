# 
# Copyright (c) 2011, Intel Corporation
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without 
# modification, are permitted provided that the following conditions are met:
#
# - Redistributions of source code must retain the above copyright notice, 
#   this list of conditions and the following disclaimer.
# - Redistributions in binary form must reproduce the above copyright notice, 
#   this list of conditions and the following disclaimer in the documentation 
#   and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
# ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE 
# LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF 
# THE POSSIBILITY OF SUCH DAMAGE.
#

OUTPUTDIR = Release/MacOS
OUTPUTNAME = extension.bundle
EXTENSIONDIR = xpi-contents
GECKODIR = gecko-sdk
EXCLUDEFILES = src/dllmain.cpp

#
# nothing to configure below this line
#

LIBS =
XPIDL = $(GECKODIR)/bin/xpidl
IDLDIR = $(GECKODIR)/idl
GECKOLIB = $(GECKODIR)/lib
GECKOINC = $(GECKODIR)/include
GECKOFLAGS = -fno-rtti -fno-exceptions -fshort-wchar -fPIC -fno-common
GECKODEF = -DXP_UNIX -DXP_MACOS
IDLFILES = $(filter-out $(EXCLUDEFILES),$(wildcard src/*.idl))
CPPFILES = $(filter-out $(EXCLUDEFILES),$(wildcard src/*.cpp))
MAKEDEPEND = $(CC) -MM
SED = sed

TYPELIBS = $(patsubst %.idl,%.xpt,$(IDLFILES))
HEADERS = $(patsubst %.idl,%.h,$(IDLFILES))
OBJFILES = $(patsubst %.cpp,%.o,$(CPPFILES))
DEPFILES = $(patsubst %.cpp,%.d,$(CPPFILES))

.PHONY: all clean deploy

-include $(DEPFILES)

all: $(TYPELIBS) $(HEADERS) $(OUTPUTDIR)/$(OUTPUTNAME)

clean:
	rm -f $(TYPELIBS) $(HEADERS) $(OBJFILES) $(DEPFILES) $(OUTPUTDIR)/$(OUTPUTNAME)

deploy: all
	cp $(OUTPUTDIR)/$(OUTPUTNAME) $(EXTENSIONDIR)/components/
	cp $(TYPELIBS) $(EXTENSIONDIR)/components/

$(OUTPUTDIR):
	mkdir -p $(OUTPUTDIR)

$(OUTPUTDIR)/$(OUTPUTNAME): $(OUTPUTDIR) $(OBJFILES)
	$(CXX) $(OBJFILES) -bundle -framework OpenCL -L$(GECKOLIB) -lxpcomglue_s -lxpcom -lnspr4 -lmozalloc $(GECKOLIB)/XUL -o $@

%.xpt: %.idl
	$(XPIDL) -w -m typelib -e $@ -I $(IDLDIR) -I $(dir $<) $< 

%.h: %.idl
	$(XPIDL) -w -m header -e $@ -I $(IDLDIR) -I $(dir $<) $< 

%.o: %.cpp 
	@$(MAKEDEPEND) $(GECKODEF) -I $(GECKOINC) $(GECKOFLAGS) $< | $(SED) -e 's|.*:|$*.o:|' > $*.d
	$(CXX) -c $< -o $@ -I $(dir $<) -I $(GECKOINC) $(GECKOFLAGS) $(GECKODEF)




