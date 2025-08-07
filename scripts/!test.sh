#!/bin/bash

clear
source ./pulse_lib.sh

TOKEN=$(./token.sh claims.json)
ZP="00000000-0000-0000-0000-000000000001/TESTS"
# /AnyKey"

#     put ${ZP} "one text"

#    put "00000000-0000-0000-0000-000000000001/TESTS" "text 1" "If-None-Match: *" "Blooooooooo: blya"

#exit

#put "00000000-0000-0000-0000-000000000001/TESTS" "Value_1" "HULY-TTL: 3"
#echo "sleep 1 sec"
#sleep 1
#get "00000000-0000-0000-0000-000000000001/TESTS"
#echo "sleep 3 sec"
#sleep 2
#get "00000000-0000-0000-0000-000000000001/TESTS"

put "00000000-0000-0000-0000-000000000001/TESTS1" "Value_1" "HULY-TTL: 3"
put "00000000-0000-0000-0000-000000000001/TESTS2" "Value_1" "HULY-TTL: 3"
put "00000000-0000-0000-0000-000000000001/HREST2" "Value_1" "HULY-TTL: 3"
get "00000000-0000-0000-0000-000000000001?prefix=TES"
sleep 1
get "00000000-0000-0000-0000-000000000001?prefix="

exit

echo "--------- delete ----------"
put "00000000-0000-0000-0000-000000000001/TESTS" "Value_2" "HULY-TTL: 3"
get "00000000-0000-0000-0000-000000000001/TESTS"
delete "00000000-0000-0000-0000-000000000001/TESTS"
get "00000000-0000-0000-0000-000000000001/TESTS"
#HULY-EXPIRE-AT: 


#    put "00000000-0000-0000-0000-000000000001/TESTS/some" "text 2"
#    put "00000000-0000-0000-0000-000000000001/TESTS/some/gogo/" "text 3"


exit


echo "================> LIST"
    put "00000000-0000-0000-0000-000000000001/Huome2/MyKey1" "value1"
    put "00000000-0000-0000-0000-000000000001/Huome2/MyKey2" "value2"
    get "00000000-0000-0000-0000-000000000001/Huome2"
    delete "00000000-0000-0000-0000-000000000001/Huome2/MyKey1"
    delete "00000000-0000-0000-0000-000000000001/Huome2/MyKey2"

echo "================> WRONG UUID"
    get "WrongUUID/TESTS/AnyKey"

echo "================> INSERT If-None-Match"

    echo "-- Expected Error: 400 Bad Request (If-None-Match may be only *)"
     put ${ZP} "enother text" "If-None-Match" "552e21cd4cd9918678e3c1a0df491bc3"

    delete ${ZP}

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
    get ${ZP}

    echo "-- Expected OK: 204 No Content (any hash)"
     put ${ZP} "enother version2" "If-Match" "*"
    get ${ZP}

    echo "-- Expected Error: 412 Precondition Failed (wrong hash)"
     put ${ZP} "enother version3" "If-Match" "552e21cd4cd9918678e3c1a0df491bc3"

    delete ${ZP}

    echo "-- Expected Error: 412 Precondition Failed (any hash not found)"
     put ${ZP} "enother version2" "If-Match" "*"

echo "================> UPSERT (Expected OK)"
    put ${ZP} "my value"
    get ${ZP}
    put ${ZP} "my new value"
    get ${ZP}

exit
