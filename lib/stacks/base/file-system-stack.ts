import {NestedStack, NestedStackProps, RemovalPolicy} from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as efs from 'aws-cdk-lib/aws-efs';
import {Construct} from 'constructs';

interface FileSystemStackProps extends NestedStackProps {
    vpc: ec2.Vpc
}

export class FileSystemStack extends NestedStack {
    id: string
    vpc: ec2.Vpc
    fileSystem: efs.FileSystem

    constructor(scope: Construct, id: string, props: FileSystemStackProps) {
        super(scope, id, props);
        this.id = id;
        this.vpc = props.vpc;
        this.createFileSystem();
    }

    createFileSystem() {
        this.fileSystem = new efs.FileSystem(this, `${this.id}-efs`, {
            vpc: this.vpc,
            performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
            removalPolicy: RemovalPolicy.DESTROY,
        });
    }
}