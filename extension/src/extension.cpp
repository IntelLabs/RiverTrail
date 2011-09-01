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

/*
 * This file contains the glue code that registers the implementations 
 * with the XPI framework. The code has a very rigid structure to follow.
 * Most of it is taken from examples on the web and amended to my setting
 */
#include "extension.h"

#include "mozilla/ModuleUtils.h"
#include "nsIClassInfoImpl.h"

/*
 * define an nsCID variable to hold the class identifier for all our classes
 */
NS_DEFINE_CID(kInterface, DPO_INTERFACE_CID);
//NS_DEFINE_CID(kPlatform, DPO_PLATFORM_CID);
//NS_DEFINE_CID(kContext, DPO_CONTEXT_CID);
//NS_DEFINE_CID(kData, DPO_DATA_CID);
//NS_DEFINE_CID(kKernel, DPO_KERNEL_CID);

/*
 * create a factory for all classes
 */
NS_GENERIC_FACTORY_SINGLETON_CONSTRUCTOR( dpoCInterface, dpoCInterface::getInstance);

/*
 * using the defines above, we create a range of structures that glue
 * implementations and contracts together. These are
 *
 * containedClasses: all classes contained in this module
 *      <nsCID> CID, <bool> isService, NULL, constructor from factory
 *
 * interesting here is the service flag. If that is true, only one instance
 * of the component is created for the entire browser and can be accessed by
 * means of getService instead of getComponent. 
 *
 * supportedContracts: a mapping from contracts to classes
 *      <const char *> contract id, <nsCID> class identifier
 *
 * supportedCategories: a mapping between categories and contracts. This allows
 *                      to register content handlers or event listeners, i.e.,
 *                      have a component invoked at certain events. 
 */
static const mozilla::Module::CIDEntry kContainedClasses[] = {
	{ &kInterface, true, NULL, dpoCInterfaceConstructor },
	// all other classes are never constructed from JavaScript directly
	{ NULL }
};

static const mozilla::Module::ContractIDEntry kSupportedContracts[] = {
    { DPO_COMPONENT_CONTRACTID, &kInterface },
    { NULL }
};

static const mozilla::Module::CategoryEntry kRegistetredCategories[] = {
	{ "JavaScript-global-constructor", "DPOInterface", DPO_COMPONENT_CONTRACTID},
    { NULL }
};

static const mozilla::Module kDPOModule = {
    mozilla::Module::kVersion,
    kContainedClasses,
	kSupportedContracts,
	kRegistetredCategories
};

/*
 * Finally, export the NSModule symbol used by XPCOM to query above information
 */
NSMODULE_DEFN(nsDPOModule) = &kDPOModule;



