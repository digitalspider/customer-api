# Customer Serverless APIs

Serverless APIs that provide Customer CRUD
Simple commands are:

```bash
yarn install
yarn lint   # verify that code is clean
yarn build  # build using esbuild via sam build
yarn test   # run unit tests
yarn start  # run API lambdas locally
```

GitHub Actions is used to deploy the application.

The URLs for this applications are:

- DEV = https://customer-api.dev.digitalspider.com.au
- STAGING = https://customer-api.staging.digitalspider.com.au
- PROD = https://customer-api.digitalspider.com.au

# Swagger OPENAPI specs

You can download the Swagger OPEN API specifications here [customer.openapi.yaml](customer.openapi.yaml)

# SAM Typescript

This project has a dependency on [AWS SAM CLI being installed](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html).

Because the lambdas are in typescript, `sam build --beta-features` is used.
See: https://aws.amazon.com/blogs/compute/building-typescript-projects-with-aws-sam-cli/

# IDE Integration

The AWS Toolkit is an open source plug-in for popular IDEs that uses the SAM CLI to build and deploy serverless applications on AWS. The AWS Toolkit also adds a simplified step-through debugging experience for Lambda function code. See the following links to get started.

- [VS Code](https://docs.aws.amazon.com/toolkit-for-vscode/latest/userguide/welcome.html)

## Cleanup

To delete the sample application that you created, use the AWS CLI. Assuming you used your project name for the stack name, you can run the following:

```bash
aws cloudformation delete-stack --stack-name ds-customer-api-dev
```
