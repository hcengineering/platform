location="${1:-./sanity-ws}"

# Restore workspace contents in mongo/elastic
./tool.sh backup ${location} sanity-ws
