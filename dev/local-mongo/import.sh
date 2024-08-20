#!/bin/bash
mongorestore --uri="mongodb://localhost:27017" --drop --gzip ./dump $@
