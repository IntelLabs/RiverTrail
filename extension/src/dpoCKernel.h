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

#include "dpoIKernel.h"
#include "dpoIContext.h"

#include "opencl_compat.h"

#include "nsCOMPtr.h"
#include "nsCycleCollectionParticipant.h"

#define DPO_KERNEL_CID_STR "cf99095d-391f-4ee8-bdea-7e50c90c6fb2"
#define DPO_KERNEL_CID { 0xcf99095d, 0x391f, 0x4ee8, {0xbd, 0xea, 0x7e, 0x50, 0xc9, 0x0c, 0x6f, 0xb2}}

class dpoCKernel : public dpoIKernel
{
public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_NSISECURITYCHECKEDCOMPONENT
  NS_DECL_DPOIKERNEL

  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS(dpoCKernel)

  dpoCKernel(dpoIContext *parent);

  nsresult InitKernel(cl_command_queue aCmdQueue, cl_kernel aKernel);

private:
  ~dpoCKernel();

protected:
  /* additional members */
	nsCOMPtr<dpoIContext> parent;
	cl_kernel kernel;
	cl_command_queue cmdQueue;
};
