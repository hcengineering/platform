
helm upgrade dev --set master.persistence.size=10Gi,data.persistence.size=10Gi,image.repository=anticrm/elasticsearch,ingest.enabled=true,data.heapSize=8192m,master.heapSize=512m,coordinating.heapSize=512m,ingest.heapSize=512m bitnami/elasticsearch 
