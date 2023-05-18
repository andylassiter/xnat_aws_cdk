#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {Main} from "../lib/stacks/main";

const app = new cdk.App();

const env = {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
}

const tags = {
    owner: process.env.OWNER || '',
    environment: process.env.ENVIRONMENT || '',
}

const XnatJupyterStack = new Main(app, 'XnatJupyterStack', {
    env: env,
    tags: tags,
    keyName: process.env.KEY_NAME || '',
})
