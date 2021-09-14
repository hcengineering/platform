
helm upgrade dev --set master.persistence.size=10Gi,data.persistence.size=10Gi,image.repository=anticrm/elasticsearch,ingest.enabled=true,data.heapSize=4096m,master.heapSize=256m,coordinating.heapSize=256m bitnami/elasticsearch 
