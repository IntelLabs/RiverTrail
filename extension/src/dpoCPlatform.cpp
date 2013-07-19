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
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN(dpoCPlatform)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE_SCRIPT_OBJECTS
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(parent)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END

NS_IMPL_CYCLE_COLLECTION_TRACE_BEGIN(dpoCPlatform)
NS_IMPL_CYCLE_COLLECTION_TRACE_END

NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN(dpoCPlatform)
  NS_IMPL_CYCLE_COLLECTION_UNLINK(parent)
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

/* readonly attribute uint32_t numberOfDevices; */
NS_IMETHODIMP dpoCPlatform::GetNumberOfDevices(uint32_t *aNumberOfDevices)
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
#define MAX_DEVICE_NAME_LENGTH 64
/* readonly attribute AString deviceNames; */
NS_IMETHODIMP dpoCPlatform::GetDeviceNames(nsAString & aDeviceNames)
{

	char *dString = NULL;
	cl_uint ndevices;
	cl_device_id * devices;
	char *deviceNameBase;
	char currDeviceName[MAX_DEVICE_NAME_LENGTH];
	// Count number of devices on this platform
	cl_int err_code = clGetDeviceIDs(platform, CL_DEVICE_TYPE_ALL, 0, NULL, &ndevices);
	if (err_code != CL_SUCCESS) {
		return NS_ERROR_NOT_AVAILABLE;
	}
	// Allocate memory for all the device ids
	devices = (cl_device_id *)nsMemory::Alloc(sizeof(cl_device_id) * ndevices);
	// Get all the device ids
	err_code = clGetDeviceIDs(platform, CL_DEVICE_TYPE_ALL, ndevices, devices, NULL);
	if (err_code != CL_SUCCESS) {
		return NS_ERROR_NOT_AVAILABLE;
	}
	unsigned int deviceNameBaseLength = sizeof(char)*MAX_DEVICE_NAME_LENGTH*(ndevices)+sizeof(char)*ndevices+1;

	// Allocate memory for the result string
	deviceNameBase = (char *)nsMemory::Alloc(deviceNameBaseLength);
	memset(deviceNameBase, 0, deviceNameBaseLength);
	// Iterate over devices and
	for(int i = 0; i < ndevices; i++) {
		size_t aDeviceNameSize;
		memset(currDeviceName, 0, MAX_DEVICE_NAME_LENGTH);
		// Get device name
		err_code = clGetDeviceInfo(devices[i], CL_DEVICE_NAME,
			MAX_DEVICE_NAME_LENGTH, currDeviceName, &aDeviceNameSize);
		if (err_code != CL_SUCCESS) {
			return NS_ERROR_NOT_AVAILABLE;
		}
		// Check if the device is supported. Currently we only support Intel devices.
		// The device name may have leading spaces. Seek to the start of the name.

		char *nameStart = currDeviceName;
		while(*(nameStart++) == ' ') {};
		if(strncmp(nameStart-1, "Intel(R)", 8) == 0) {
			strncat(deviceNameBase, currDeviceName, aDeviceNameSize);
        }
		else {
			strncat(deviceNameBase, "Unknown Device", 16);
		}
		strncat(deviceNameBase, "#", 1);
	}
	aDeviceNames.AssignLiteral(deviceNameBase);
	// Free memory for device ids
	nsMemory::Free(devices);
	nsMemory::Free(deviceNameBase);
	return NS_OK;
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
NS_IMETHODIMP dpoCPlatform::CreateContext(const JS::Value &jTarget, JSContext *cx, dpoIContext **_retval)
{
	nsCOMPtr<dpoCContext> context;
	nsresult result = NS_OK;
	long target;

	if (jTarget.isInt32()) {
		target = jTarget.toInt32();
	} else if (jTarget.isNullOrUndefined()) {
		result = loadDevicePref(target);
	} else {
		return NS_ERROR_INVALID_ARG;
	}

	if (NS_SUCCEEDED(result)) {
		context = new dpoCContext( this);
		// Create a context with device index specified in |target|
		result = context->InitContext(cx, target, platform);
	}

	if (NS_SUCCEEDED(result)) {
		context.forget((dpoCContext **) _retval);
	}

    return result;
}

/* dpoIContext createDefaultContext (); */
nsresult dpoCPlatform::loadDevicePref(long &target)
{
	nsresult result;
	nsCOMPtr<nsIServiceManager> serviceManager;
	nsCOMPtr<nsIPrefService> prefService;
	nsCOMPtr<nsIPrefBranch> prefBranch;
	int32_t defDeviceType;

	result = NS_GetServiceManager(getter_AddRefs(serviceManager));
	if (result != NS_OK) {
		DEBUG_LOG_STATUS("GetDefaultContext", "cannot access service manager");
		return result;
	}

	result = serviceManager->GetServiceByContractID("@mozilla.org/preferences-service;1", NS_GET_IID(nsIPrefService), getter_AddRefs(prefService));
	if (result != NS_OK) {
		DEBUG_LOG_STATUS("GetDefaultContext", "cannot access preferences manager");
		return result;
	}

	result = prefService->GetBranch(DPO_PREFERENCE_BRANCH, getter_AddRefs(prefBranch));
	if (result != NS_OK) {
		DEBUG_LOG_STATUS("GetDefaultContext", "cannot access preference branch " DPO_PREFERENCE_BRANCH);
		return result;
	}

	result = prefBranch->GetIntPref(DPO_DEFAULT_DEVICETYPE_PREFNAME, &defDeviceType);
	if (result != NS_OK) {
		DEBUG_LOG_STATUS("GetDefaultContext", "cannot read preference value " DPO_DEFAULT_DEVICETYPE_PREFNAME);
		return result;
	}

	if (defDeviceType < 0) {
		DEBUG_LOG_STATUS("GetDefaultContext", "value for default device type is " << defDeviceType);
		return NS_ERROR_ILLEGAL_VALUE;
	}

	target = defDeviceType;

    return result;
}
