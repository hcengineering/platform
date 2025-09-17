FROM hardcoreeng/base-slim:v20250916
WORKDIR /usr/src/app

COPY bundle/bundle.js ./

# Create geodb directory and optionally copy MaxMind databases
RUN mkdir -p /usr/src/geodb
# Copy entire geodb directory
COPY geodb/ /usr/src/geodb/

# Log what databases are available
RUN echo "GeoIP databases status:" && \
    (ls -la /usr/src/geodb/*.mmdb 2>/dev/null && echo "MaxMind databases found") || \
    echo "No MaxMind databases found - geolocation will be disabled"

EXPOSE 4007
CMD [ "node", "bundle.js" ]
