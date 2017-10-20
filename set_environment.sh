#!/bin/bash

# oracle environment
export OCI_HOME=/instantclient_12_1
export OCI_LIB_DIR=$OCI_HOME
export OCI_INC_DIR=$OCI_HOME/sdk/include
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$OCI_HOME
