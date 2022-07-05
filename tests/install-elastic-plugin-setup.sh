#!/bin/bash

# Usage
# ./install-elastic-plugin-setup.sh sanity_elastic_1

curdir=$(dirname $0)
${curdir}/install-elastic-plugin.sh $@
${curdir}/setup-elastic.sh 9200