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

#include "dpoCInterface.h"

#include "dpoCPlatform.h"
#include "dpo_debug.h"
#include "dpo_security_checks_stub.h"
#include <nsStringAPI.h>
#include <nsServiceManagerUtils.h>
#include <nsIPrefService.h>

#include "nsIClassInfoImpl.h"

/*
 * Implement ClassInfo support to make this class feel more like a JavaScript class, i.e.,
 * it is autmatically casted to the right interface and all methods are available
 * without using QueryInterface.
 * 
 * see https://developer.mozilla.org/en/Using_nsIClassInfo
 */
NS_IMPL_CLASSINFO( dpoCInterface, 0, 0, DPO_INTERFACE_CID)
NS_IMPL_CI_INTERFACE_GETTER2(dpoCInterface, dpoIInterface, nsISecurityCheckedComponent)

/* 
 * Implement the hooks for the cycle collector
 */
NS_IMPL_CYCLE_COLLECTION_CLASS(dpoCInterface)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN(dpoCInterface)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE_SCRIPT_OBJECTS
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END

NS_IMPL_CYCLE_COLLECTION_TRACE_BEGIN(dpoCInterface)
NS_IMPL_CYCLE_COLLECTION_TRACE_END

NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN(dpoCInterface)
NS_IMPL_CYCLE_COLLECTION_UNLINK_END

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(dpoCInterface)
  NS_INTERFACE_MAP_ENTRY(dpoIInterface)
  NS_INTERFACE_MAP_ENTRY(nsISecurityCheckedComponent)
  NS_INTERFACE_MAP_ENTRY_AMBIGUOUS(nsISupports, dpoIInterface)
  NS_IMPL_QUERY_CLASSINFO(dpoCInterface)
NS_INTERFACE_MAP_END

NS_IMPL_CYCLE_COLLECTING_ADDREF(dpoCInterface)
NS_IMPL_CYCLE_COLLECTING_RELEASE(dpoCInterface)

DPO_SECURITY_CHECKS_ALL( dpoCInterface)

dpoCInterface::dpoCInterface()
{
  	DEBUG_LOG_CREATE("dpoCInterface", this);
}

dpoCInterface::~dpoCInterface()
{
	DEBUG_LOG_DESTROY("dpoCInterface", this);
}

cl_uint dpoCInterface::noOfPlatforms = 0;
cl_platform_id *dpoCInterface::platforms = NULL;

nsresult dpoCInterface::InitPlatformInfo()
{
	cl_int err_code;
	cl_uint nplatforms;
	
	err_code = clGetPlatformIDs( 0, NULL, &nplatforms);
	if (err_code != CL_SUCCESS) {
		DEBUG_LOG_ERROR( "InitPlatformInfo", err_code);
		return NS_ERROR_NOT_AVAILABLE;
	}

	platforms = new cl_platform_id[nplatforms];

	err_code = clGetPlatformIDs( nplatforms, platforms, &noOfPlatforms);

	if (err_code != CL_SUCCESS) {
		DEBUG_LOG_ERROR( "InitPlatformInfo", err_code);
		return NS_ERROR_NOT_AVAILABLE;
	}

	return NS_OK;
}


/* dpoIPlatform getPlatform (); */
NS_IMETHODIMP dpoCInterface::GetPlatform(dpoIPlatform **_retval NS_OUTPARAM)
{
	nsresult result = NS_OK;
	cl_int err_code;
	nsCOMPtr<dpoCPlatform> thePlatform;
	const cl_uint maxNameLength = 256;
	char name[maxNameLength];
	
	if (platforms == NULL) {
		result = InitPlatformInfo();
	}

	if (result != NS_OK) 
		return result;
		
	for (cl_uint i = 0; i < noOfPlatforms; i++) {
		err_code = clGetPlatformInfo(platforms[i], CL_PLATFORM_NAME, maxNameLength*sizeof(char), name, NULL);
		if (err_code != CL_SUCCESS) {
			DEBUG_LOG_ERROR( "GetIntelPlatform", err_code);
			return NS_ERROR_NOT_AVAILABLE;
		}
		if ((strcmp(name, "Intel(R) OpenCL") == 0) || (strcmp(name, "Apple") == 0)) {
			thePlatform = new dpoCPlatform(this, platforms[i]);		
			if (thePlatform == NULL) {
				return NS_ERROR_OUT_OF_MEMORY;
			} else {
				NS_ADDREF(thePlatform);
				*_retval = thePlatform;
				return NS_OK;
			}
		}
	}

	return NS_ERROR_NOT_AVAILABLE;
}

#ifdef DPO_SCOPE_TRIAL
/* [implicit_jscontext] jsval searchScope (in jsval scope, in AString name); */
NS_IMETHODIMP dpoCInterface::SearchScope(const jsval & scope, const nsAString & name, JSContext *cx, jsval *_retval NS_OUTPARAM)
{
	JSObject *scopeObj, *parentObj;
	JSBool result;
	char *propName;

	if (!JSVAL_IS_OBJECT(scope)) {
		*_retval = JSVAL_VOID;
		return NS_ERROR_ILLEGAL_VALUE;
	}

	scopeObj = JSVAL_TO_OBJECT(scope);
	parentObj = JS_GetParent(cx, scopeObj);

	if (parentObj == NULL) {
		*_retval = JSVAL_VOID;
		return NS_ERROR_NOT_AVAILABLE;
	}

	*_retval = OBJECT_TO_JSVAL(parentObj);
	return NS_OK;

	propName = ToNewUTF8String(name);
	result = JS_LookupPropertyWithFlags(cx, parentObj, propName, 0, _retval);
	nsMemory::Free(propName);

	if (result == JS_FALSE) {
		*_retval = JSVAL_VOID;
		return NS_ERROR_NOT_AVAILABLE;
	}
	
    return NS_OK;
}
#endif /* DPO_SCOPE_TRIAL */

/* singleton factory */
nsCOMPtr<dpoCInterface> dpoCInterface::singleton = NULL;

dpoCInterface *dpoCInterface::getInstance()
{
	if (singleton == NULL) {
		singleton = new dpoCInterface();
	}

	NS_ADDREF(singleton);
	return singleton;
}

