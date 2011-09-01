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

#include "dpoIPlatform.h"
#include "dpoIInterface.h"

#include "opencl_compat.h"

#include "nsCOMPtr.h"
#include "nsCycleCollectionParticipant.h"

#define DPO_PLATFORM_CID_STR "85be27a7-ba88-4491-a9c1-fdf72d305e9a"
#define DPO_PLATFORM_CID { 0x85be27a7, 0xba88, 0x4491, { 0xa9, 0xc1, 0xfd, 0xf7, 0x2d, 0x30, 0x5e, 0x9a}}

class dpoCPlatform : public dpoIPlatform
{
public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_NSISECURITYCHECKEDCOMPONENT
  NS_DECL_DPOIPLATFORM

  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS(dpoCPlatform)

  dpoCPlatform(dpoIInterface *parent, cl_platform_id platform);

private:
  ~dpoCPlatform();

protected:
	/* additional members */
	nsresult GetPlatformPropertyHelper( cl_platform_info param, nsAString & out);

	cl_platform_id platform;
	nsCOMPtr<dpoIInterface> parent;
};
