aws s3api head-bucket --bucket ${AWS_BUCKET_NAME}
if [ $? -ne 0 ]; then
  echo "Creating bucket ${AWS_BUCKET_NAME}"
  aws s3api create-bucket --bucket ${AWS_BUCKET_NAME} --region ${AWS_DEFAULT_REGION} --create-bucket-configuration LocationConstraint=${AWS_DEFAULT_REGION}
fi
sam deploy --no-confirm-changeset --no-fail-on-empty-changeset --config-file $1