#!/bin/bash

clear
source ./pulse_lib.sh

TOKEN=$(./token.sh claims.json)
ZP="00000000-0000-0000-0000-000000000001/TESTS"

echo "--------- if-match ----------"

    delete ${ZP}
    put "00000000-0000-0000-0000-000000000001/TESTS" "Value_1" "HULY-TTL: 1" "If-Match: *"
    get ${ZP}
    put "00000000-0000-0000-0000-000000000001/TESTS" "Value_2" "HULY-TTL: 1"
    get ${ZP}
    put "00000000-0000-0000-0000-000000000001/TESTS" "Value_3" "HULY-TTL: 1" "If-Match: dd358c74cb9cb897424838fbcb69c933"
    put "00000000-0000-0000-0000-000000000001/TESTS" "Value_4" "HULY-TTL: 1" "If-Match: *"
    put "00000000-0000-0000-0000-000000000001/TESTS" "Value_5" "HULY-TTL: 1" "If-Match: c7bcabf6b98a220f2f4888a18d01568d"
    put "00000000-0000-0000-0000-000000000001/TESTS" "Value_6" "HULY-TTL: 1" "If-None-Match: *"

echo "-- Expected OK: 201 Created (key was not exist)"

     put ${ZP} "enother text" "If-None-Match" "*"

    put ${ZP} "some text"
    echo "-- Expected Error: 412 Precondition Failed (key was exist)"
     put ${ZP} "enother text" "If-None-Match" "*"

echo "================> UPDATE PUT If-Match"

    get ${ZP}

    echo "-- Expected OK: 204 No Content (right hash)"
     put ${ZP} "some text" "If-Match" "552e21cd4cd9918678e3c1a0df491bc3"
    get ${ZP}

    echo "-- Expected OK: 204 No Content (hash still right)"
     put ${ZP} "enother version" "If-Match" "552e21cd4cd9918678e3c1a0df491bc3"

















put "00000000-0000-0000-0000-000000000001/TESTS" "Value_1" "HULY-TTL: 3"
echo "sleep 1 sec"
sleep 1
get "00000000-0000-0000-0000-000000000001/TESTS"
echo "sleep 3 sec"
sleep 2
get "00000000-0000-0000-0000-000000000001/TESTS"

echo "--------- delete ----------"
put "00000000-0000-0000-0000-000000000001/TESTS" "Value_2" "HULY-TTL: 3"
get "00000000-0000-0000-0000-000000000001/TESTS"
delete "00000000-0000-0000-0000-000000000001/TESTS"
get "00000000-0000-0000-0000-000000000001/TESTS"

echo "--------- prefix ----------"
put "00000000-0000-0000-0000-000000000001/TESTS1" "Value_1" "HULY-TTL: 3"
put "00000000-0000-0000-0000-000000000001/TESTS2" "Value_1" "HULY-TTL: 3"
put "00000000-0000-0000-0000-000000000001/HREST2" "Value_1" "HULY-TTL: 3"
get "00000000-0000-0000-0000-000000000001?prefix=TES"
sleep 1
get "00000000-0000-0000-0000-000000000001?prefix="

exit
