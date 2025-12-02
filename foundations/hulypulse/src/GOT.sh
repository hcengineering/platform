#!/bin/bash

clear

redis-cli set lleo value
redis-cli del lleo
redis-cli set ttlkey 1 EX 2
# подожди ~2 сек → должно прийти expired
