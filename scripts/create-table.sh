#!/usr/bin/env bash
#
# Create the DynamoDB table for Partio Tapahtumat.
#
# Prerequisites:
#   - AWS CLI installed and configured (aws configure) with a user that has
#     dynamodb:CreateTable permission.
#   - The region defaults to eu-north-1 (override with AWS_REGION env var).
#
# Usage:
#   ./scripts/create-table.sh
#
set -euo pipefail

TABLE="${DYNAMODB_TABLE}"
REGION="${AWS_REGION:-eu-north-1}"

echo "Creating DynamoDB table '${TABLE}' in region ${REGION} ..."

# If the table already exists, report it and exit cleanly.
if aws dynamodb describe-table --table-name "${TABLE}" --region "${REGION}" >/dev/null 2>&1; then
  echo "Table '${TABLE}' already exists."
  exit 0
fi

aws dynamodb create-table \
  --table-name "${TABLE}" \
  --region "${REGION}" \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
    AttributeName=startsAt,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "startsAtIndex",
        "KeySchema": [
          { "AttributeName": "pk", "KeyType": "HASH" },
          { "AttributeName": "startsAt", "KeyType": "RANGE" }
        ],
        "Projection": { "ProjectionType": "ALL" }
      }
    ]'

echo "Waiting for table to become ACTIVE ..."
aws dynamodb wait table-exists --table-name "${TABLE}" --region "${REGION}"

echo "Done. Table '${TABLE}' is ready."
echo "Details:"
aws dynamodb describe-table --table-name "${TABLE}" --region "${REGION}" \
  --query "Table.{TableName:TableName,Status:TableStatus,GSI:GlobalSecondaryIndexes[0].IndexName}" \
  --output table
