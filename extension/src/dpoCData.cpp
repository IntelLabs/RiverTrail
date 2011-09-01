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

#include "dpoCData.h"

#include "dpo_debug.h"
#include "jstypedarray.h"
#include "dpo_debug.h"
#include "dpo_security_checks_stub.h"

#include "nsIClassInfoImpl.h"
#include "nsIProgrammingLanguage.h"


/*
 * Implement ClassInfo support to make this class feel more like a JavaScript class, i.e.,
 * it is autmatically casted to the right interface and all methods are available
 * without using QueryInterface.
 * 
 * see https://developer.mozilla.org/en/Using_nsIClassInfo
 */
NS_IMPL_CLASSINFO( dpoCData, 0, 0, DPO_DATA_CID)
NS_IMPL_CI_INTERFACE_GETTER2(dpoCData, dpoIData, nsISecurityCheckedComponent)

/* 
 * Implement the hooks for the cycle collector
 */
NS_IMPL_CYCLE_COLLECTION_CLASS(dpoCData)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN(dpoCData)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE_SCRIPT_OBJECTS
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE_NSCOMPTR(parent)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END

NS_IMPL_CYCLE_COLLECTION_TRACE_BEGIN(dpoCData)
if (!JSVAL_IS_VOID(tmp->theArray) && (JSVAL_IS_GCTHING(tmp->theArray))) {
    void *gcThing = JSVAL_TO_GCTHING(tmp->theArray);
    NS_IMPL_CYCLE_COLLECTION_TRACE_JS_CALLBACK(gcThing, "theArray")
  }
NS_IMPL_CYCLE_COLLECTION_TRACE_END

NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN(dpoCData)
  NS_IMPL_CYCLE_COLLECTION_UNLINK_NSCOMPTR(parent)
  if (tmp->theArray != JSVAL_VOID) {
    tmp->theArray = JSVAL_VOID;
  }
NS_IMPL_CYCLE_COLLECTION_UNLINK_END

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(dpoCData)
  NS_INTERFACE_MAP_ENTRY(dpoIData)
  NS_INTERFACE_MAP_ENTRY(nsISecurityCheckedComponent)
  NS_INTERFACE_MAP_ENTRY_AMBIGUOUS(nsISupports, dpoIData)
  NS_IMPL_QUERY_CLASSINFO(dpoCData)
NS_INTERFACE_MAP_END

NS_IMPL_CYCLE_COLLECTING_ADDREF(dpoCData)
NS_IMPL_CYCLE_COLLECTING_RELEASE(dpoCData)

DPO_SECURITY_CHECKS_ALL( dpoCData)

dpoCData::dpoCData(dpoIContext *aParent) 
{
	DEBUG_LOG_CREATE("dpoCData", this);
	parent = aParent;
	queue = NULL;
	memObj = NULL;
	theArray = JSVAL_VOID;
	theContext = NULL;
#ifdef PREALLOCATE_IN_JS_HEAP
	mapped = false;
#endif /* PREALLOCATE_IN_JS_HEAP */
}

dpoCData::~dpoCData()
{
	DEBUG_LOG_DESTROY("dpoCData", this);
	if (memObj != NULL) {
		clReleaseMemObject( memObj);
	}
	if ((queue != NULL) && retained) {
		clReleaseCommandQueue( queue);
	}
	if (theArray != JSVAL_VOID) {
		DEBUG_LOG_STATUS("~dpoCData", "wrapper is beeing destroyed but jsval is still alive!");
		theArray = JSVAL_VOID;
	}
}

nsresult dpoCData::InitCData(JSContext *cx, cl_command_queue aQueue, cl_mem aMemObj, uint32 aType, uint32 aLength, uint32 aSize, const jsval anArray)
{
	cl_int err_code;

	type = aType;
	length = aLength;
	size = aSize;
	memObj = aMemObj;
	theArray = anArray;
	theContext = cx;

	DEBUG_LOG_STATUS("InitCData", "queue is " << aQueue << " buffer is " << aMemObj);

	err_code = clRetainCommandQueue( queue);
	if (err_code != CL_SUCCESS) {
		DEBUG_LOG_ERROR("initCData", err_code);
		// SAH: we should really fail here but a bug in the whatif OpenCL 
		//      makes the above retain operation always fail :-(
		retained = false;
	} else {
		retained = true;
	}
	queue = aQueue;

	return NS_OK;
}

/* [implicit_jscontext] readonly attribute jsval value; */
NS_IMETHODIMP dpoCData::GetValue(JSContext *cx, jsval *aValue)
{
	cl_int err_code;
	js::TypedArray *tdest;
#ifdef PREALLOCATE_IN_JS_HEAP
	void *mem;
#endif /* PREALLOCATE_IN_JS_HEAP */

	if (theArray != JSVAL_VOID) {
#ifdef PREALLOCATE_IN_JS_HEAP
		if (!mapped) {
			void *mem = clEnqueueMapBuffer(queue, memObj, CL_TRUE, CL_MAP_READ, 0, size, 0, NULL, NULL, &err_code);

			if (err_code != CL_SUCCESS) {
				DEBUG_LOG_ERROR("GetValue", err_code);
				return NS_ERROR_NOT_AVAILABLE;
			}
#ifndef DEBUG_OFF
			tdest = js::TypedArray::fromJSObject(JSVAL_TO_OBJECT(theArray));
			if (!tdest) {
				DEBUG_LOG_STATUS("GetValue", "Cannot access typed array");
				return NS_ERROR_NOT_AVAILABLE;
			}

			if (mem != tdest->data) {
				DEBUG_LOG_STATUS("GetValue", "EnqueueMap returned wrong pointer");
			}
#endif /* DEBUG_OFF */
			mapped = true;
		}
#endif /* PREALLOCATE_IN_JS_HEAP */
		*aValue = theArray;
		return NS_OK;
	} else {
		JSObject *jsArray;
	
		if (!JS_EnterLocalRootScope(cx)) {
			DEBUG_LOG_STATUS("GetValue", "Cannot root local scope");
			return NS_ERROR_NOT_AVAILABLE;
		}
		jsArray = js_CreateTypedArray(cx, type, length);
		if (!jsArray) {
			DEBUG_LOG_STATUS("GetValue", "Cannot create typed array");
			return NS_ERROR_OUT_OF_MEMORY;
		}

		tdest = js::TypedArray::fromJSObject(jsArray);
	
		err_code = clEnqueueReadBuffer(queue, memObj, CL_TRUE, 0, size, tdest->data, 0, NULL, NULL);
		if (err_code != CL_SUCCESS) {
			DEBUG_LOG_ERROR("GetValue", err_code);
			return NS_ERROR_NOT_AVAILABLE;
		}

		theArray = OBJECT_TO_JSVAL(jsArray);
	
		*aValue = theArray;

		DEBUG_LOG_STATUS("GetValue", "materialized typed array");

		JS_LeaveLocalRootScope(cx);

		return NS_OK;
	}
}

/* [implicit_jscontext] void writeTo (in jsval dest); */
NS_IMETHODIMP dpoCData::WriteTo(const jsval & dest, JSContext *cx)
{
	JSObject * jsArray;
	js::TypedArray *destArray;
	cl_int err_code;
	
	if (!JSVAL_IS_OBJECT( dest)) {
		return NS_ERROR_INVALID_ARG;
	}

	jsArray = JSVAL_TO_OBJECT(dest);

	if (!js_IsTypedArray( jsArray)) {
		return NS_ERROR_CANNOT_CONVERT_DATA;
	}

	destArray = js::TypedArray::fromJSObject( jsArray);

	if ((destArray->type != type) || (destArray->length != length)) {
		return NS_ERROR_INVALID_ARG;
	}

	err_code = clEnqueueReadBuffer(queue, memObj, CL_TRUE, 0, size, destArray->data, 0, NULL, NULL);
	if (err_code != CL_SUCCESS) {
		DEBUG_LOG_ERROR("WriteTo", err_code);
		return NS_ERROR_NOT_AVAILABLE;
	}

    return NS_OK;
}

cl_mem dpoCData::GetContainedBuffer()
{
	return memObj;
}

uint32 dpoCData::GetSize()
{
	return size;
}

uint32 dpoCData::GetType()
{
	return type;
}

uint32 dpoCData::GetLength()
{
	return length;
}
