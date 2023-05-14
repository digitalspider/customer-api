APP_USER_POOL_ID=$1
APP_CLIENT_ID=$2
APP_CLIENT_SECRET=$3
APP_USERNAME=$4
APP_PASSWORD=$5

# this
# See: https://docs.aws.amazon.com/cognito/latest/developerguide/signing-up-users-in-your-app.html#cognito-user-pools-computing-secret-hash
COMPUTED_HASH=$(echo -n "${APP_USERNAME}${APP_CLIENT_ID}" | openssl dgst -sha256 -hmac ${APP_CLIENT_SECRET} -binary | openssl enc -base64)

COGNITO_ID_TOKEN=`aws cognito-idp admin-initiate-auth --user-pool-id ${APP_USER_POOL_ID} \
	--client-id ${APP_CLIENT_ID} \
	--auth-flow ADMIN_USER_PASSWORD_AUTH \
	--auth-parameters USERNAME=${APP_USERNAME},PASSWORD=${APP_PASSWORD},SECRET_HASH=${COMPUTED_HASH} | jq .AuthenticationResult.IdToken`

echo ${COGNITO_ID_TOKEN} | tr -d '"'
