#!/bin/bash

clear
source ./pulse_lib.sh

TOKEN_OK=$(./token.sh claims.json)
TOKEN_SYSTEM=$(./token.sh claims_system.json)
TOKEN_WRONG=$(./token.sh claims_wrong_ws.json)
ZP="00000000-0000-0000-0000-000000000001/TESTS/JWT_tests"

echo "================> SYSTEM change - OK"
    TOKEN=${TOKEN_SYSTEM}
    # delete ${ZP}
    put ${ZP} "system value"

echo "================> USER read/change - OK"
    TOKEN=${TOKEN_OK}
    get ${ZP}
    put ${ZP} "user value"

echo "================> WRONG USER read/change - ERROR"
    TOKEN=${TOKEN_WRONG}
    get ${ZP}
    put ${ZP} "wrong user value"

echo "================> SYSTEM read/change - OK"
    TOKEN=${TOKEN_SYSTEM}
    get ${ZP}
    put ${ZP} "system value 2"

echo "================> USER read - OK"
    TOKEN=${TOKEN_OK}
    get ${ZP}

exit
