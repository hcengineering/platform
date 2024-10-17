FROM cockroachdb/cockroach:latest

ADD init.sh /cockroach/
RUN chmod a+x /cockroach/init.sh

ADD logs.yaml /cockroach/
ADD optimizations.sql /cockroach/
ADD datalake.sql /cockroach/

WORKDIR /cockroach/

EXPOSE 8080
EXPOSE 26257

ENTRYPOINT ["/cockroach/init.sh"]
