
helm upgrade dev --set master.persistence.size=10Gi,data.persistence.size=10Gi,image.repository=anticrm/elasticsearch bitnami/elasticsearch

helm upgrade dev --set master.persistence.size=10Gi,data.persistence.size=10Gi,image.repository=anticrm/elasticsearch,ingest.enabled=true bitnami/elasticsearch 