/*
 * Copyright (c) 2011, Intel Corporation
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice, 
 *   this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice, 
 *   this list of conditions and the following disclaimer in the documentation 
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE 
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF 
 * THE POSSIBILITY OF SUCH DAMAGE.
 */

#ifndef _DPO_CONFIG_H_
#define _DPO_CONFIG_H_

#define DPO_INTERFACE_VERSION			2	/* running version number of the interface */
#define DPO_NUMBER_OF_ARTIFICIAL_ARGS	1	/* number of internal kernel arguments used by runtime */

#define CLPROFILE				/* enable cl profiling support */
#undef CLPROFILE_ASYNC			/* use event callbacks for profiling */
#undef OUTOFORDERQUEUE			/* enable out of order execution. Needs to be off on certain platforms. */
#undef USE_LOCAL_WORKSIZE		/* whether the tile argument is passed down to opencl */
#define DPO_BUILDLOG_MAX 1024	/* size of buildlog buffer */
#define DEBUG_OFF				/* disable debugging code */
#undef WINDOWS_ROUNDTRIP		/* enable code to measure rounttrip time of kernel run using windows API */
//#define PREALLOCATE_IN_JS_HEAP  /* allocate buffers in the JS heap and use CL_MEM_USE_HOST_POINTER */

#define DPO_PREFERENCE_BRANCH "extensions.dpointerface."	/* preference branch to use */
#define DPO_DEFAULT_PLATFORM_PREFNAME "defaultPlatform"		/* preference name for default platform */

#include "xpcom-config.h"
#include "mozilla-config.h"

#endif /* _DPO_CONFIG_H_ */
