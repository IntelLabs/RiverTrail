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
#include "jsfriendapi.h"
#include "dpo_debug.h"
#include "dpo_security_checks_stub.h"

#include "nsIClassInfoImpl.h"
#include "nsIProgrammingLanguage.h"
#include "nsServiceManagerUtils.h"
#include "dpoCContext.h"

#include "nsIDOMHTMLCanvasElement.h"

/*
 * implement our own macros for DPO_PROP_JS_OBJECTS and DPO_HOLD_JS_OBJECTS
 */
inline
void dpoCData::HoldObjects() {
	if (xpc == NULL) xpc = do_GetService(nsIXPConnect::GetCID(), NULL); 
    if (xpc != NULL) {
        xpc->AddJSHolder(NS_CYCLE_COLLECTION_UPCAST(this, dpoCData), NS_CYCLE_COLLECTION_PARTICIPANT(dpoCData));
    }
}                                                                                                    

inline
void dpoCData::DropObjects() {
    if (xpc != NULL) {
        xpc->RemoveJSHolder(NS_CYCLE_COLLECTION_UPCAST(this, dpoCData));
    }                                                                                                      \
}

/*
 * Implement ClassInfo support to make this class feel more like a JavaScript class, i.e.,
 * it is autmatically casted to the right interface and all methods are available
 * without using QueryInterface.
 * 
 * see https://developer.mozilla.org/en/Using_nsIClassInfo
 */
NS_IMPL_CLASSINFO( dpoCData, 0, 0, DPO_DATA_CID)
NS_IMPL_CI_INTERFACE_GETTER2(dpoCData, dpoIData, nsXPCOMCycleCollectionParticipant)

/* 
 * Implement the hooks for the cycle collector
 */
NS_IMPL_CYCLE_COLLECTION_CLASS(dpoCData)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN(dpoCData)
    NS_IMPL_CYCLE_COLLECTION_TRAVERSE_SCRIPT_OBJECTS
    NS_IMPL_CYCLE_COLLECTION_TRAVERSE_NSCOMPTR(parent)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END

NS_IMPL_CYCLE_COLLECTION_TRACE_BEGIN(dpoCData)
    NS_IMPL_CYCLE_COLLECTION_TRACE_JS_MEMBER_CALLBACK(theArray)
NS_IMPL_CYCLE_COLLECTION_TRACE_END

NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN(dpoCData)
    NS_IMPL_CYCLE_COLLECTION_UNLINK_NSCOMPTR(parent)
    if (tmp->theArray) {
	    DEBUG_LOG_STATUS("UNLINK!", "unlinking array " << tmp->theArray);
	    tmp->theArray = nullptr;
        tmp->DropObjects();
    }
NS_IMPL_CYCLE_COLLECTION_UNLINK_END

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(dpoCData)
    DEBUG_LOG_STATUS("COLLECT!", "entering collection");
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
	theArray = nullptr;
	theContext = NULL;
#ifdef PREALLOCATE_IN_JS_HEAP
	mapped = false;
#endif /* PREALLOCATE_IN_JS_HEAP */
	xpc = NULL;
}

dpoCData::~dpoCData()
{
	DEBUG_LOG_DESTROY("dpoCData", this);
	if (memObj != NULL) {
#ifdef INCREMENTAL_MEM_RELEASE
		DeferFree(memObj);
#else /* INCREMENTAL_MEM_RELEASE */
		clReleaseMemObject( memObj);
#endif /* INCREMENTAL_MEM_RELEASE */
	}
	if ((queue != NULL) && retained) {
        DEBUG_LOG_STATUS("~dpoCData", "releasing queue object");
		clReleaseCommandQueue( queue);
	}
    if (theArray) {
        DEBUG_LOG_STATUS("~dpoCData", "releasing array object");
		theArray = nullptr;
		DropObjects();
    }
	parent = NULL;
	xpc = NULL;
}

#ifdef INCREMENTAL_MEM_RELEASE
inline
int dpoCData::CheckFree(void) {
	if (parent.get() != NULL) {
		/* make sure we have not lost our parent due to CC */
	  return ((dpoCContext *) parent.get())->CheckFree();
	}
}

inline
void dpoCData::DeferFree(cl_mem obj) {
	if (parent.get() != NULL) {
	  ((dpoCContext *) parent.get())->DeferFree(obj);
	} else {
		/* lost parent, maybe due to CC. fall back */
		clReleaseMemObject(obj);
	}
}
#endif /* INCREMENTAL_MEM_RELEASE */

cl_int dpoCData::EnqueueReadBuffer(size_t size, void *ptr) {
#ifdef INCREMENTAL_MEM_RELEASE
	cl_int err_code;
	int freed;

	do {
		freed = CheckFree();
		err_code = clEnqueueReadBuffer(queue, memObj, CL_TRUE, 0, size, ptr, 0, NULL, NULL);
	} while (((err_code == CL_MEM_OBJECT_ALLOCATION_FAILURE) || (err_code == CL_OUT_OF_HOST_MEMORY)) && freed);

	return err_code;
#else /* INCREMENTAL_MEM_RELEASE */
	return clEnqueueReadBuffer(queue, memObj, CL_TRUE, 0, size, ptr, 0, NULL, NULL);
#endif /* INCREMENTAL_MEM_RELEASE */
}

nsresult dpoCData::InitCData(JSContext *cx, cl_command_queue aQueue, cl_mem aMemObj, uint32 aType, uint32 aLength, uint32 aSize, JSObject *anArray)
{
	cl_int err_code;

	type = aType;
	length = aLength;
	size = aSize;
	memObj = aMemObj;
	theContext = cx;

	if (anArray) {
		// tell the JS runtime that we hold this typed array
		HoldObjects();
		theArray = anArray;
	} else {
		theArray = nullptr;
	}

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
#ifdef PREALLOCATE_IN_JS_HEAP
	void *mem;
#endif /* PREALLOCATE_IN_JS_HEAP */

	if (theArray) {
#ifdef PREALLOCATE_IN_JS_HEAP
		if (false && !mapped) {
			DEBUG_LOG_STATUS("GetValue", "memory is " << theArray);
			void *mem = clEnqueueMapBuffer(queue, memObj, CL_TRUE, CL_MAP_READ, 0, size, 0, NULL, NULL, &err_code);

			if (err_code != CL_SUCCESS) {
				DEBUG_LOG_ERROR("GetValue", err_code);
				return NS_ERROR_NOT_AVAILABLE;
			}
#ifndef DEBUG_OFF
			if (!js_IsTypedArray(theArray)) {
				DEBUG_LOG_STATUS("GetValue", "Cannot access typed array");
				return NS_ERROR_NOT_AVAILABLE;
			}

			if (mem != JS_GetTypedArrayData(theArray)) {
				DEBUG_LOG_STATUS("GetValue", "EnqueueMap returned wrong pointer");
			}
#endif /* DEBUG_OFF */
			mapped = true;
		}
#endif /* PREALLOCATE_IN_JS_HEAP */
		*aValue = OBJECT_TO_JSVAL(theArray);
		return NS_OK;
	} else {
       	// tell the runtime that we cache this array object
		HoldObjects();

#ifdef INCREMENTAL_MEM_RELEASE
		CheckFree();
#endif /* INCREMENTAL_MEM_RELEASE */

		if (((dpoCContext *) parent.get())->CreateAlignedTA(type, length, &theArray, cx) != NS_OK) {
			return NS_ERROR_NOT_AVAILABLE;
		}
		
		if (!theArray) {
			DEBUG_LOG_STATUS("GetValue", "Cannot create typed array");
			return NS_ERROR_OUT_OF_MEMORY;
		}

		err_code = EnqueueReadBuffer(size, JS_GetArrayBufferViewData(theArray, cx));

		if (err_code != CL_SUCCESS) {
			DEBUG_LOG_ERROR("GetValue", err_code);
			return NS_ERROR_NOT_AVAILABLE;
		}

		*aValue = OBJECT_TO_JSVAL(theArray);
	
		DEBUG_LOG_STATUS("GetValue", "materialized typed array");

		return NS_OK;
	}
}

/* [implicit_jscontext] void writeTo (in jsval dest); */
NS_IMETHODIMP dpoCData::WriteTo(const jsval & dest, JSContext *cx)
{
	return NS_ERROR_NOT_IMPLEMENTED;
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
