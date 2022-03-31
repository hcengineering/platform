#!/bin/bash

# Direct donwload, or use VPN.
#wget https://artifacts.elastic.co/downloads/elasticsearch-plugins/ingest-attachment/ingest-attachment-7.14.2.zip
docker cp ./ingest-attachment-7.14.2.zip sanity-elastic-1:/ingest-attachment-7.14.2.zip
docker exec -ti sanity-elastic-1 ./bin/elasticsearch-plugin install file:///ingest-attachment-7.14.2.zip
docker restart sanity-elastic-1