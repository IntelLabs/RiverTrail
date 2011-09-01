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

#ifndef _DPO_SECURITY_CHECK_STUB_H_
#define _DPO_SECURITY_CHECK_STUB_H_

#include <nsMemory.h>

#define DPO_ALL_ACCESS_STR "allAccess"
#define DPO_ALL_ACCESS_SIZE (10 * sizeof( char))

#define DPO_SECURITY_CHECKS_ONE( cname, pname)														\
	NS_IMETHODIMP cname::pname(const nsIID * iid, char **_retval) {									\
	char *res = (char *) nsMemory::Clone( DPO_ALL_ACCESS_STR, DPO_ALL_ACCESS_SIZE);					\
	if (res == NULL) {																				\
	  return NS_ERROR_OUT_OF_MEMORY;																\
	}																								\
	*_retval = res;																					\
																									\
	return NS_OK;																					\
}

#define DPO_SECURITY_CHECKS_ONE_ARG( cname, pname)													\
	NS_IMETHODIMP cname::pname(const nsIID * iid, const PRUnichar *propertyName, char **_retval) {	\
	char *res = (char *) nsMemory::Clone( DPO_ALL_ACCESS_STR, DPO_ALL_ACCESS_SIZE);					\
	if (res == NULL) {																				\
	  return NS_ERROR_OUT_OF_MEMORY;																\
	}																								\
	*_retval = res;																					\
																									\
	return NS_OK;																					\
}

#define DPO_SECURITY_CHECKS_ALL( cname)						\
	DPO_SECURITY_CHECKS_ONE( cname, CanCreateWrapper)		\
	DPO_SECURITY_CHECKS_ONE_ARG( cname, CanCallMethod)		\
	DPO_SECURITY_CHECKS_ONE_ARG( cname, CanGetProperty)		\
	DPO_SECURITY_CHECKS_ONE_ARG( cname, CanSetProperty)	
	
#endif /* _DPO_SECURITY_CHECK_STUB_H_ */
