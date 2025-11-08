#!/bin/bash

clear
#source ./pulse_lib.sh

websocat ws://127.0.0.1:8095/ws/testworkspace

exit


let ws = new WebSocket("ws://localhost:8095/ws/testworkspace");
ws.onmessage = e => console.log("Message from server:", e.data);
ws.onopen = () => ws.send("Hello from browser!");



















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
