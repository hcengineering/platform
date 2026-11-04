echo "Downloading profile"
current=$(date +%Y%m%d%H%M%S)
./tool.sh profile http://tracex.local:3334 stop -o "./profiles/profile-${current}".cpuprofile
