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

#include "dpoCKernel.h"

#include "dpo_debug.h"
#include "dpoCData.h"
#include "dpoCContext.h"
#include "nsMemory.h"
#include "dpo_security_checks_stub.h"

#include "nsIClassInfoImpl.h"

#ifdef WINDOWS_ROUNDTRIP
#include "windows.h"
#endif /* WINDOWS_ROUNDTRIP */

/*
 * Implement ClassInfo support to make this class feel more like a JavaScript class, i.e.,
 * it is autmatically casted to the right interface and all methods are available
 * without using QueryInterface.
 * 
 * see https://developer.mozilla.org/en/Using_nsIClassInfo
 */
NS_IMPL_CLASSINFO( dpoCKernel, 0, 0, DPO_KERNEL_CID)
NS_IMPL_CI_INTERFACE_GETTER2(dpoCKernel, dpoIKernel, nsISecurityCheckedComponent)

/* 
 * Implement the hooks for the cycle collector
 */
NS_IMPL_CYCLE_COLLECTION_CLASS(dpoCKernel)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN(dpoCKernel)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE_SCRIPT_OBJECTS
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE_NSCOMPTR(parent)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END

NS_IMPL_CYCLE_COLLECTION_TRACE_BEGIN(dpoCKernel)
NS_IMPL_CYCLE_COLLECTION_TRACE_END

NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN(dpoCKernel)
  NS_IMPL_CYCLE_COLLECTION_UNLINK_NSCOMPTR(parent)
NS_IMPL_CYCLE_COLLECTION_UNLINK_END

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(dpoCKernel)
  NS_INTERFACE_MAP_ENTRY(dpoIKernel)
  NS_INTERFACE_MAP_ENTRY(nsISecurityCheckedComponent)
  NS_INTERFACE_MAP_ENTRY_AMBIGUOUS(nsISupports, dpoIKernel)
  NS_IMPL_QUERY_CLASSINFO(dpoCKernel)
NS_INTERFACE_MAP_END

NS_IMPL_CYCLE_COLLECTING_ADDREF(dpoCKernel)
NS_IMPL_CYCLE_COLLECTING_RELEASE(dpoCKernel)

DPO_SECURITY_CHECKS_ALL( dpoCKernel)

dpoCKernel::dpoCKernel(dpoIContext *aParent)
{
	DEBUG_LOG_CREATE("dpoCKernel", this);
	parent = aParent;
	kernel = NULL;
	cmdQueue = NULL;
}

dpoCKernel::~dpoCKernel()
{
	DEBUG_LOG_DESTROY("dpoCKernel", this);
	if (kernel != NULL) {
		clReleaseKernel(kernel);
	}
}

nsresult dpoCKernel::InitKernel(cl_command_queue aCmdQueue, cl_kernel aKernel, cl_mem aFailureMem)
{
	cl_int err_code;

	kernel = aKernel;
	err_code = clRetainCommandQueue( aCmdQueue);
	if (err_code != CL_SUCCESS) {
		DEBUG_LOG_ERROR("initCData", err_code);
		return NS_ERROR_NOT_AVAILABLE;
	}
	cmdQueue = aCmdQueue;

	failureMem = aFailureMem;

	err_code = clSetKernelArg(kernel, 0, sizeof(cl_mem), &failureMem);
	if (err_code != CL_SUCCESS) {
		DEBUG_LOG_ERROR("initCData", err_code);
		return NS_ERROR_NOT_AVAILABLE;
	}

	return NS_OK;
}

/* readonly attribute PRUint32 numberOfArgs; */
NS_IMETHODIMP dpoCKernel::GetNumberOfArgs(PRUint32 *aNumberOfArgs)
{
	cl_uint result;
	cl_int err_code;

	err_code = clGetKernelInfo(kernel, CL_KERNEL_NUM_ARGS, sizeof(cl_uint), &result, NULL);
	if (err_code != CL_SUCCESS) {
		DEBUG_LOG_ERROR("GetNumberOfArgs", err_code);
		return NS_ERROR_NOT_AVAILABLE;
	}

	/* skip internal arguments when counting */
	*aNumberOfArgs = result - DPO_NUMBER_OF_ARTIFICIAL_ARGS;

    return NS_OK;
}

/* void setArgument (in PRUint32 number, in dpoIData argument); */
NS_IMETHODIMP dpoCKernel::SetArgument(PRUint32 number, dpoIData *argument)
{
	cl_int err_code;
	cl_mem buffer;

	/* skip internal arguments */
	number = number + DPO_NUMBER_OF_ARTIFICIAL_ARGS;

	buffer = ((dpoCData *) argument)->GetContainedBuffer();
	DEBUG_LOG_STATUS("SetArgument", "buffer is " << buffer);

	err_code = clSetKernelArg(kernel, number, sizeof(cl_mem), &buffer);

	if (err_code != CL_SUCCESS) {
		DEBUG_LOG_ERROR("SetArgument", err_code);
		return NS_ERROR_INVALID_ARG;
	}

    return NS_OK;
}

// High precision is true when arguments are passed as doubles and false when passed as floats.
/* void setScalarArgument (in PRUint32 number, in jsval argument); */
NS_IMETHODIMP dpoCKernel::SetScalarArgument(PRUint32 number, const jsval & argument, 
	const jsval & isInteger, const jsval & highPrecision)
{
	cl_int err_code;
	bool isIntegerB;
	bool isHighPrecisionB;

	/* skip internal arguments */
	number = number + DPO_NUMBER_OF_ARTIFICIAL_ARGS;

	if (!JSVAL_IS_BOOLEAN(isInteger)) {
		DEBUG_LOG_STATUS("SetScalarArgument", "illegal isInteger argument.");

		return NS_ERROR_INVALID_ARG;
	}
	isIntegerB = JSVAL_TO_BOOLEAN(isInteger);
	
	if (!JSVAL_IS_BOOLEAN(highPrecision)) {
		DEBUG_LOG_STATUS("SetScalarArgument", "illegal highPrecision argument.");

		return NS_ERROR_INVALID_ARG;
	}
	isHighPrecisionB = JSVAL_TO_BOOLEAN(highPrecision);

	if (!JSVAL_IS_NUMBER(argument)) {
		DEBUG_LOG_STATUS("SetScalarArgument", "illegal number argument.");

		return NS_ERROR_INVALID_ARG;
	}

	if (JSVAL_IS_INT(argument)) {
		int value = JSVAL_TO_INT(argument);
		DEBUG_LOG_STATUS("SetScalarArgument", "(JSVAL_IS_INT(argument)) isIntegerB: " << isIntegerB  << " isHighPrecisionB " << isHighPrecisionB);

		if (isIntegerB) {
			DEBUG_LOG_STATUS("SetScalarArgument", "(JSVAL_IS_INT(argument)) setting integer argument " << number << " to integer value " << value);
			cl_int intVal = (cl_int) value;
			err_code = clSetKernelArg(kernel, number, sizeof(cl_int), &intVal);
		} else if (isHighPrecisionB) {
			DEBUG_LOG_STATUS("SetScalarArgument", "setting double argument " << number << " to integer value " << value);
			cl_double doubleVal = (cl_double) value;
			err_code = clSetKernelArg(kernel, number, sizeof(cl_double), &doubleVal);
		} else {
			DEBUG_LOG_STATUS("SetScalarArgument", "setting float argument " << number << " to integer value " << value);
			cl_float floatVal = (cl_float) value;
			err_code = clSetKernelArg(kernel, number, sizeof(cl_float), &floatVal);
		}

		if (err_code != CL_SUCCESS) {
			DEBUG_LOG_ERROR("SetScalarArgument", err_code);
			return NS_ERROR_NOT_AVAILABLE;
		}
	} else if (JSVAL_IS_DOUBLE(argument)) {
		double value = JSVAL_TO_DOUBLE(argument);
		DEBUG_LOG_STATUS("SetScalarArgument", "(JSVAL_IS_DOUBLE(argument)) isIntegerB: " << isIntegerB  << " isHighPrecisionB " << isHighPrecisionB);

		if (isIntegerB) {
			DEBUG_LOG_STATUS("SetScalarArgument", "setting int formal argument " << number << " using double value " << value);
			cl_int intVal = (cl_int) value;
			err_code = clSetKernelArg(kernel, number, sizeof(cl_int), &intVal);
		} else if (isHighPrecisionB) {
			DEBUG_LOG_STATUS("SetScalarArgument", "setting double formal argument " << number << " using double value " << value);
			cl_double doubleVal = (cl_double) value;
			err_code = clSetKernelArg(kernel, number, sizeof(cl_double), &doubleVal);
		} else {
			DEBUG_LOG_STATUS("SetScalarArgument", "setting float formal argument " << number << " using double value " << value);
			cl_float floatVal = (cl_float) value;
			err_code = clSetKernelArg(kernel, number, sizeof(cl_float), &floatVal);
		}

		if (err_code != CL_SUCCESS) {
			DEBUG_LOG_ERROR("SetScalarArgument", err_code);
			return NS_ERROR_NOT_AVAILABLE;
		}
	} else {
		DEBUG_LOG_STATUS("SetScalarArgument", "illegal number argument.");

		return NS_ERROR_INVALID_ARG;
	}

	return NS_OK;
}

/* PRUint32 run (in PRUint32 rank, [array, size_is (rank)] in PRUint32 shape, [array, size_is (rank), optional] in PRUint32 tile); */
NS_IMETHODIMP dpoCKernel::Run(PRUint32 rank, PRUint32 *shape, PRUint32 *tile, PRUint32 *_retval)
{
	cl_int err_code;
	cl_event runEvent, readEvent, writeEvent;
	size_t *global_work_size;
	size_t *local_work_size;
	const int zero = 0;

	DEBUG_LOG_STATUS("Run", "preparing execution of kernel");

    if (sizeof(size_t) == sizeof(PRUint32)) {
		global_work_size = (size_t *) shape;
	} else {
		global_work_size = (size_t *) nsMemory::Alloc(rank * sizeof(size_t));
		if (global_work_size == NULL) {
			DEBUG_LOG_STATUS("Run", "allocation of global_work_size failed");
			return NS_ERROR_OUT_OF_MEMORY;
		}
		for (int cnt = 0; cnt < rank; cnt++) {
			global_work_size[cnt] = shape[cnt];
		}
	}

#ifdef USE_LOCAL_WORKSIZE
	if (tile == NULL) {
		local_work_size = NULL;
	} else {
		if ((sizeof(size_t) == sizeof(PRUint32))) {
			local_work_size = (size_t *) tile;
		} else {
			local_work_size = (size_t *) nsMemory::Alloc(rank * sizeof(size_t));
			if (local_work_size == NULL) {
				DEBUG_LOG_STATUS("Run", "allocation of local_work_size failed");
				return NS_ERROR_OUT_OF_MEMORY;
			}
			for (int cnt = 0; cnt < rank; cnt++) {
				local_work_size[cnt] = (size_t) tile[cnt];
			}
		}
	}
#else /* USE_LOCAL_WORKSIZE */
	local_work_size = NULL;
#endif /* USE_LOCAL_WORKSIZE */

	DEBUG_LOG_STATUS("Run", "setting failure code to 0");

	err_code = clEnqueueWriteBuffer(cmdQueue, failureMem, CL_FALSE, 0, sizeof(int), &zero, 0, NULL, &writeEvent);
	if (err_code != CL_SUCCESS) {
		DEBUG_LOG_ERROR("Run", err_code);
		return NS_ERROR_ABORT;
	}

	DEBUG_LOG_STATUS("Run", "enqueing execution of kernel");

#ifdef WINDOWS_ROUNDTRIP
	dpoCContext::RecordBeginOfRoundTrip(parent);
#endif /* WINDOWS_ROUNDTRIP */

	err_code = clEnqueueNDRangeKernel(cmdQueue, kernel, rank, NULL, global_work_size, NULL, 1, &writeEvent, &runEvent);
	if (err_code != CL_SUCCESS) {
		DEBUG_LOG_ERROR("Run", err_code);
		return NS_ERROR_ABORT;
	}

	DEBUG_LOG_STATUS("Run", "reading failure code");

	err_code = clEnqueueReadBuffer(cmdQueue, failureMem, CL_FALSE, 0, sizeof(int), _retval, 1, &runEvent, &readEvent);
	if (err_code != CL_SUCCESS) {
		DEBUG_LOG_ERROR("Run", err_code);
		return NS_ERROR_ABORT;
	}

	DEBUG_LOG_STATUS("Run", "waiting for execution to finish");
	
	// For now we always wait for the run to complete.
	// In the long run, we may want to interleave this with JS execution and only sync on result read.
	err_code = clWaitForEvents( 1, &readEvent);
	
	DEBUG_LOG_STATUS("Run", "first event fired");

	if (err_code != CL_SUCCESS) {
		DEBUG_LOG_ERROR("Run", err_code);
		return NS_ERROR_ABORT;
	}
#ifdef WINDOWS_ROUNDTRIP
	dpoCContext::RecordEndOfRoundTrip(parent);
#endif /* WINDOWS_ROUNDTRIP */
	
#ifdef CLPROFILE
#ifdef CLPROFILE_ASYNC
	err_code = clSetEventCallback( readEvent, CL_COMPLETE, &dpoCContext::CollectTimings, parent);
	
	DEBUG_LOG_STATUS("Run", "second event fired");
	if (err_code != CL_SUCCESS) {
		DEBUG_LOG_ERROR("Run", err_code);
		return NS_ERROR_ABORT;
	}
#else /* CLPROFILE_ASYNC */
	dpoCContext::CollectTimings(readEvent,CL_COMPLETE,parent);
#endif /* CLPROFILE_ASYNC */
#endif /* CLPROFILE */
		
	DEBUG_LOG_STATUS("Run", "execution completed successfully, start cleanup");
	
	if (global_work_size != (size_t *) shape) {
		nsMemory::Free(global_work_size);
	}
#ifdef USE_LOCAL_WORKSIZE
	if (local_work_size != (size_t *) tile) {
		nsMemory::Free(local_work_size);
	}
#endif /* USE_LOCAL_WORKSIZE */
	
	err_code = clReleaseEvent(readEvent);
	err_code = clReleaseEvent(runEvent);
	err_code = clReleaseEvent(writeEvent);

	if (err_code != CL_SUCCESS) {
		DEBUG_LOG_ERROR("Run", err_code);
		return NS_ERROR_ABORT;
	}

	DEBUG_LOG_STATUS("Run", "cleanup complete");

    return NS_OK;
}
