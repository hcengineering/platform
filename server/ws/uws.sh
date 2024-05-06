if test -f ./src/server_u.ts; then
  if ! test -f ./v20.43.0.zip; then
    wget --quiet https://github.com/uNetworking/uWebSockets.js/archive/refs/tags/v20.43.0.zip
  fi
  if ! test -f ./src/uws/uws.js; then
    unzip -qq -j ./v20.43.0.zip -d ./src/uws/
  fi
fi