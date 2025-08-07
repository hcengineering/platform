#!/bin/bash

clear

URL="http://localhost:8095/api"

R='\033[0;31m' # Color red
G='\033[0;32m' # Color green
W='\033[0;33m' # Color ?
S='\033[0;34m' # Color Blue
F='\033[0;35m' # Color Fiolet
L='\033[0;36m' # Color LightBlue
N='\033[0m' # No Color
GRAY='\033[90m' # bright black

api() {
  local tmpfile
  tmpfile=$1
  local status
  status=$(head -n 1 "$tmpfile")
  local status_code
  status_code=$(echo "$status" | awk '{print $2}')
  local etag
  etag=$(grep -i "^ETag:" "${tmpfile}")
  local body
  body=$(awk 'found { print; next } NF == 0 { found = 1 }' "$tmpfile")
  case "$status_code" in
	2*) echo -en "${G}${status}${N}" ;;
	3*) echo -en "${F}${status}${N}" ;;
	4*) echo -en "${R}${status}${N}" ;;
	5*) echo -en "${R}${status}${N}" ;;
	*)  echo -en "${GRAY}${status}${N}" ;;
  esac
  if [ -n "$etag" ]; then echo -n -e " ${F}${etag}${N}" ; fi
  if [ -n "$body" ]; then echo -e "\n   ${GRAY}[${body}]${N}" ; else echo -e " ${L}(no body)${N}" ; fi
  rm -f "$tmpfile"
}

get() {
  echo -n -e "📥 ${L}GET ${W}$1${N} > "
  local tmpfile
  tmpfile=$(mktemp)
  curl -i -s -X GET "$URL/$1" -H "Authorization: Bearer ${TOKEN}" | tr -d '\r' > "$tmpfile"
  api ${tmpfile}
}

put() { # If-None-Match If-Match
  local match
  local match_prn
#  if [ -n "$3" ]; then match=(-H "$3: $4") ; else match=() ; fi
#  if [ -n "$3" ]; then match_prn=" ${F}$3:$4${N}" ; else match_prn="" ; fi
#  echo -n -e "📥 ${L}PUT ${W}$1${N}${match_prn} > "

  if [ -n "$3" ]; then match1=(-H "$3") ; else match1=() ; fi
  if [ -n "$3" ]; then match1_prn=" ${F}$3${N}" ; else match1_prn="" ; fi
  if [ -n "$4" ]; then match2=(-H "$4") ; else match2=() ; fi
  if [ -n "$4" ]; then match2_prn=" ${F}$4${N}" ; else match2_prn="" ; fi
  echo -n -e "📥 ${L}PUT ${W}$1${N}${match1_prn}${match2_prn} > "

  local tmpfile
  tmpfile=$(mktemp)
#  curl -v -i -s -X PUT "$URL/$1" -H "Authorization: Bearer ${TOKEN}" "${match1[@]}" "${match2[@]}" -H "Content-Type: application/json" -d "$2" | tr -d '\r' > "$tmpfile"
  curl -i -s -X PUT "$URL/$1" -H "Authorization: Bearer ${TOKEN}" "${match1[@]}" "${match2[@]}" -H "Content-Type: application/json" -d "$2" | tr -d '\r' > "$tmpfile"
  api ${tmpfile}
}

delete() {
  echo -n -e "📥 ${L}DELETE ${W}$1${N} > "
  local tmpfile
  tmpfile=$(mktemp)
  curl -i -s -X DELETE "$URL/$1" -H "Authorization: Bearer ${TOKEN}" | tr -d '\r' > "$tmpfile"
  api ${tmpfile}
}
