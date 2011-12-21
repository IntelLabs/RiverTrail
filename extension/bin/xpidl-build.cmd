REM 
REM Copyright (c) 2011, Intel Corporation
REM All rights reserved.
REM
REM Redistribution and use in source and binary forms, with or without 
REM modification, are permitted provided that the following conditions are met:
REM
REM - Redistributions of source code must retain the above copyright notice, 
REM   this list of conditions and the following disclaimer.
REM - Redistributions in binary form must reproduce the above copyright notice, 
REM   this list of conditions and the following disclaimer in the documentation 
REM   and/or other materials provided with the distribution.
REM
REM THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
REM AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
REM IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
REM ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE 
REM LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
REM CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
REM SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
REM INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
REM CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
REM ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF 
REM THE POSSIBILITY OF SUCH DAMAGE.

@ECHO OFF
ECHO Building headers from %1
C:\mozilla-build\python\python.exe gecko-sdk\sdk\bin\header.py -Igecko-sdk\idl -Isrc -o %2.h %1
ECHO Building typelib from %1
C:\mozilla-build\python\python.exe gecko-sdk\sdk\bin\typelib.py -Igecko-sdk\idl -Isrc -o %2.xpt %1
