#!/bin/sh

echo "Waiting for Elasticsearch to be ready..."
until curl -s -f "http://elasticsearch:9200/_cluster/health?wait_for_status=yellow&timeout=60s" > /dev/null; do
  echo "Waiting for Elasticsearch..."
  sleep 5
done
echo "Elasticsearch is ready!"

echo "Waiting for Kibana to be ready..."
until curl -s -f "http://kibana:5601/api/status" > /dev/null; do
  echo "Waiting for Kibana..."
  sleep 10
done
echo "Kibana is ready!"

# Set default number of replicas to 0 for single-node setup
curl -XPUT 'http://elasticsearch:9200/_all/_settings?preserve_existing=true' -H 'Content-Type: application/json' -d '{
  "index.number_of_replicas" : "0"
}'

# Create ILM Policy
curl -X PUT 'http://elasticsearch:9200/_ilm/policy/logs_policy' -H 'Content-Type: application/json' -d '{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "1d"
          }
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}'

# Create Index Template
curl -X PUT 'http://elasticsearch:9200/_index_template/app_logs_template' -H 'Content-Type: application/json' -d '{
  "index_patterns": ["app-logs-*"],
  "template": {
    "settings": {
      "index.lifecycle.name": "logs_policy",
      "index.lifecycle.rollover_alias": "app-logs"
    }
  }
}'

# Check if the initial index exists before creating it
INDEX_EXISTS=$(curl -I -s -o /dev/null -w "%{http_code}" 'http://elasticsearch:9200/app-logs-000001')

if [ "$INDEX_EXISTS" -ne 200 ]; then
  # Create Initial Index
  curl -X PUT 'http://elasticsearch:9200/app-logs-000001' -H 'Content-Type: application/json' -d '{
    "aliases": {
      "app-logs": {
        "is_write_index": true
      }
    }
  }'
fi
