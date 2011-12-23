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

#include "dpoCPlatform.h"

#include "dpo_debug.h"
#include "dpo_security_checks_stub.h"
#include "dpoCContext.h"

#include "nsIClassInfoImpl.h"
#include <nsStringAPI.h>
#include <nsServiceManagerUtils.h>
#include <nsIPrefService.h>

/*
 * Implement ClassInfo support to make this class feel more like a JavaScript class, i.e.,
 * it is autmatically casted to the right interface and all methods are available
 * without using QueryInterface.
 * 
 * see https://developer.mozilla.org/en/Using_nsIClassInfo
 */
NS_IMPL_CLASSINFO( dpoCPlatform, 0, 0, DPO_PLATFORM_CID)
NS_IMPL_CI_INTERFACE_GETTER2(dpoCPlatform, dpoIPlatform, nsISecurityCheckedComponent)

/* 
 * Implement the hooks for the cycle collector
 */
NS_IMPL_CYCLE_COLLECTION_CLASS(dpoCPlatform)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN(dpoCPlatform)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE_SCRIPT_OBJECTS
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE_NSCOMPTR(parent)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END

NS_IMPL_CYCLE_COLLECTION_TRACE_BEGIN(dpoCPlatform)
NS_IMPL_CYCLE_COLLECTION_TRACE_END

NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN(dpoCPlatform)
  NS_IMPL_CYCLE_COLLECTION_UNLINK_NSCOMPTR(parent)
NS_IMPL_CYCLE_COLLECTION_UNLINK_END

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(dpoCPlatform)
  NS_INTERFACE_MAP_ENTRY(dpoIPlatform)
  NS_INTERFACE_MAP_ENTRY(nsISecurityCheckedComponent)
  NS_INTERFACE_MAP_ENTRY_AMBIGUOUS(nsISupports, dpoIPlatform)
  NS_IMPL_QUERY_CLASSINFO(dpoCPlatform)
NS_INTERFACE_MAP_END

NS_IMPL_CYCLE_COLLECTING_ADDREF(dpoCPlatform)
NS_IMPL_CYCLE_COLLECTING_RELEASE(dpoCPlatform)

DPO_SECURITY_CHECKS_ALL( dpoCPlatform)

dpoCPlatform::dpoCPlatform(dpoIInterface *aParent, cl_platform_id aPlatform)
{
	DEBUG_LOG_CREATE("dpoCPlatform", this);
	parent = aParent;
	platform = aPlatform;
}

dpoCPlatform::~dpoCPlatform()
{
	DEBUG_LOG_DESTROY("dpoCPlatform", this);
	parent = NULL;
}

/* readonly attribute PRUint32 numberOfDevices; */
NS_IMETHODIMP dpoCPlatform::GetNumberOfDevices(PRUint32 *aNumberOfDevices)
{
	cl_uint devices;
	cl_int err_code = clGetDeviceIDs(platform, CL_DEVICE_TYPE_ALL, 0, NULL, &devices);
	
	if (err_code != CL_SUCCESS)
	{
		return NS_ERROR_NOT_AVAILABLE;
	}

	*aNumberOfDevices = devices;
    return NS_OK;
}

nsresult dpoCPlatform::GetPlatformPropertyHelper(cl_platform_info param, nsAString & out)
{
	char *rString = NULL;
	size_t length;
	cl_int err;
	nsresult result;

	err = clGetPlatformInfo(platform, param, 0, NULL, &length);

	if (err == CL_SUCCESS) {
		rString = (char *) nsMemory::Alloc(sizeof(char)*(length+1));
		err = clGetPlatformInfo(platform, param, length, rString, NULL);
		out.AssignLiteral(rString);
		nsMemory::Free(rString);
	
		result = NS_OK;
	} else {
		result = NS_ERROR_NOT_AVAILABLE;
	}
	
	return result;
}

/* readonly attribute AString version; */
NS_IMETHODIMP dpoCPlatform::GetVersion(nsAString & aVersion)
{
	return GetPlatformPropertyHelper(CL_PLATFORM_VERSION, aVersion);
}

/* readonly attribute AString name; */
NS_IMETHODIMP dpoCPlatform::GetName(nsAString & aName)
{
	return GetPlatformPropertyHelper(CL_PLATFORM_NAME, aName);
}

/* readonly attribute AString vendor; */
NS_IMETHODIMP dpoCPlatform::GetVendor(nsAString & aVendor)
{
	return GetPlatformPropertyHelper(CL_PLATFORM_VENDOR, aVendor);
}

/* readonly attribute AString profile; */
NS_IMETHODIMP dpoCPlatform::GetProfile(nsAString & aProfile)
{
	return GetPlatformPropertyHelper(CL_PLATFORM_PROFILE, aProfile);
}

/* readonly attribute AString extensions; */
NS_IMETHODIMP dpoCPlatform::GetExtensions(nsAString & aExtensions)
{
	return GetPlatformPropertyHelper(CL_PLATFORM_EXTENSIONS, aExtensions);
}

/* dpoIContext createContext (in long target); */
NS_IMETHODIMP dpoCPlatform::CreateContext(dpoIContext **_retval NS_OUTPARAM)
{
	nsCOMPtr<dpoCContext> context;
	nsresult result;

	context = new dpoCContext( this);
	result = context->InitContext(platform);

	if (result == NS_OK) {
		context.forget((dpoCContext **) _retval);
	}

    return result;
}
