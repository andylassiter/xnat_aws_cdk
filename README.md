# Deploy XNAT to AWS

Deploys the XNAT docker compose stack to AWS using CDK.

## Usage
1. Ensure you have the following environment variables set:
   * `CDK_DEFAULT_ACCOUNT` - the AWS account to deploy to
   * `CDK_DEFAULT_REGION` - the region to deploy to
   * `KEY_NAME` - the name of the key pair to use for the EC2 instance, manually created in the AWS console.
   * `OWNER` - (optional) the owner of the XNAT instance, used for tagging resources.
   * `ENVIROMENT` - (optional) the environment of the XNAT instance (e.g. dev, test, prod), used for tagging resources.
2. Run `npm install` to install the dependencies.
3. Run `cdk list` to list the stacks in the app. You should see 
4. Then run `cdk deploy <stack name>` to deploy the stack.

You may need to use the `--profile` option with the above `cdk` commands if you have multiple AWS profiles.

## Useful commands

* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk list`        list all stacks in the app
* `cdk synth`       emits the synthesized CloudFormation template
* `cdk destroy`     destroy the stack
* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests


