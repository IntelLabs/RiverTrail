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

#include "dpo_config.h"

#include "dpoIContext.h"
#include "dpoIPlatform.h"

#include "opencl_compat.h"

#include "nsCOMPtr.h"
#include "jsfriendapi.h"
#include "nsCycleCollectionParticipant.h"

#ifdef WINDOWS_ROUNDTRIP
#include <windows.h>
#endif /* WINDOWS_ROUNDTRIP */

#define DPO_CONTEXT_CID_STR "a08cccd2-42ba-48c8-b9c1-05229660a071"
#define DPO_CONTEXT_CID { 0xa08cccd2, 0x42ba, 0x48c8, { 0xb9, 0xc1, 0x05, 0x22, 0x96, 0x60, 0xa0, 0x71}}

class dpoCContext : public dpoIContext
{
public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_NSISECURITYCHECKEDCOMPONENT
  NS_DECL_DPOICONTEXT

  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS(dpoCContext)

  dpoCContext(dpoIPlatform *parent);
  nsresult InitContext(JSContext *cx, cl_platform_id platform);

#ifdef CLPROFILE
    static void CL_CALLBACK CollectTimings( cl_event event, cl_int status, void *data);
#endif /* CLPROFILE */
	static void CL_CALLBACK ReportCLError( const char *err_info, const void *private_info, size_t cb, void *user_data);
    static uint8_t *GetPointerFromTA(JSObject *ta, JSContext *cx);
	nsresult CreateAlignedTA(uint type, size_t length, JSObject **retval, JSContext *cx);
#ifdef WINDOWS_ROUNDTRIP
	static void RecordBeginOfRoundTrip(dpoIContext *parent);
	static void RecordEndOfRoundTrip(dpoIContext *parent);
#endif /* WINDOWS_ROUNDTRIP */

#ifdef INCREMENTAL_MEM_RELEASE
  int CheckFree();
  void DeferFree(cl_mem);
#endif /* INCREMENTAL_MEM_RELEASE */

private:
  ~dpoCContext();

protected:
  /* additional members */
  nsCOMPtr<dpoIPlatform> parent;
  cl_context context;			/* the corresponding OpenCL context object */
  cl_command_queue cmdQueue;	/* command queue shared by all child objects (e.g. kernels) */
  char *buildLog;				/* shared string used to store the build log in compileKernel */
  size_t buildLogSize;			/* current size of buildLog, 0 if not yet allocated */
  cl_mem kernelFailureMem;		/* memory buffer used to communicate abortion of kernels; shared among all kernels */
  cl_uint alignment_size;		/* stores the alignment size for the used devices */

  nsresult ExtractArray(const jsval &source, JSObject **result, JSContext *cx);
  cl_mem CreateBuffer(JSContext *ctx, cl_mem_flags flags, size_t size, void *ptr, cl_int *err);

#ifdef CLPROFILE
  cl_ulong clp_exec_start;
  cl_ulong clp_exec_end;
#endif /* CLPROFILE */
#ifdef WINDOWS_ROUNDTRIP
  LARGE_INTEGER wrt_exec_start;
  LARGE_INTEGER wrt_exec_end;
#endif /* WINDOWS_ROUNDTRIP */
#ifdef INCREMENTAL_MEM_RELEASE
    cl_mem *defer_list; 
    uint defer_pos;
	uint defer_max;
#endif /* INCREMENTAL_MEM_RELEASE */


};
