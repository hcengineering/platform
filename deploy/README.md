
helm upgrade dev --set master.persistence.size=10Gi,data.persistence.size=10Gi,image.repository=anticrm/elasticsearch,ingest.enabled=true,data.heapSize=8192m,master.heapSize=1024m,coordinating.heapSize=1024m bitnami/elasticsearch 
