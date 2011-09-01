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

#include "dpoIInterface.h"

#include "opencl_compat.h"

#include "nsIClassInfo.h"
#include "nsCOMPtr.h"

#include "nsCycleCollectionParticipant.h"

#define DPO_INTERFACE_CID_STR "faf155ad-4c58-4d33-bb3e-fa7cdb466eed"
#define DPO_INTERFACE_CID { 0xfaf155ad, 0x4c58, 0x4d33, { 0xbb, 0x3e, 0xfa, 0x7c, 0xdb, 0x46, 0x6e, 0xed}}

class dpoCInterface : public dpoIInterface
{
public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_NSISECURITYCHECKEDCOMPONENT
  NS_DECL_DPOIINTERFACE
  
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS(dpoCInterface)

  static dpoCInterface *getInstance();

private:
  dpoCInterface();
  ~dpoCInterface();

protected:
  static nsCOMPtr<dpoCInterface> singleton;

  static cl_platform_id *platforms;
  static cl_uint noOfPlatforms;
  static nsresult InitPlatformInfo();
};
