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

#include "dpoIData.h"
#include "dpoIContext.h"

#include "opencl_compat.h"

#include "nsCOMPtr.h"
#include "nsCycleCollectionParticipant.h"

#define DPO_DATA_CID_STR "a855373b-3de9-4a86-856c-0b201c33c0b0"
#define DPO_DATA_CID { 0xa855373b, 0x3de9, 0x4a86, {0x85, 0x6c, 0x0b, 0x20, 0x1c, 0x33, 0xc0, 0xb0}}


class dpoCData : public dpoIData
{
public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_NSISECURITYCHECKEDCOMPONENT
  NS_DECL_DPOIDATA

  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS_AMBIGUOUS(dpoCData, dpoIData)

  dpoCData(dpoIContext *aParent);
  nsresult InitCData(JSContext *cx, cl_command_queue aQueue, cl_mem aMemObj, uint32 aType, uint32 aLength, uint32 aSize, JSObject *anArray);
  cl_mem GetContainedBuffer();
  uint32 GetType();
  uint32 GetSize();
  uint32 GetLength();

#ifdef INCREMENTAL_MEM_RELEASE
  static int CheckFree();
#endif /* INCREMENTAL_MEM_RELEASE */

private:
  ~dpoCData();

protected:
  /* additional members */
  nsCOMPtr<dpoIContext> parent;
  cl_command_queue queue;
  cl_mem memObj;
  uint32 type;
  uint32 length;
  uint32 size;
  JSObject *theArray;
  JSContext *theContext;
  bool retained;
#ifdef PREALLOCATE_IN_JS_HEAP
  bool mapped;
#endif /* PREALLOCATE_IN_JS_HEAP */
  cl_int EnqueueReadBuffer( size_t size, void *ptr);
#ifdef INCREMENTAL_MEM_RELEASE
  static void DeferFree(cl_mem);
  static cl_mem *defer_list; 
  static uint defer_pos;
#endif /* INCREMENTAL_MEM_RELEASE */
};
