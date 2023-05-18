import {NestedStack, NestedStackProps} from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import {Construct} from 'constructs';
import * as efs from "aws-cdk-lib/aws-efs";
import {Instance} from '../../resources/instance'
import {EbsDeviceVolumeType} from "aws-cdk-lib/aws-ec2";
import {XnatInstance} from "../../resources/xnat-instance";

interface XnatStackProps extends NestedStackProps {
    vpc: ec2.Vpc
    securityGroup: ec2.SecurityGroup
    fileSystem: efs.FileSystem
    elasticIp?: ec2.CfnEIP
    keyName: string
}

export class XnatStack extends NestedStack {

    xnatJupyter01: XnatInstance

    constructor(scope: Construct, id: string, props: XnatStackProps) {
        super(scope, id, props);

        this.xnatJupyter01 = new XnatInstance(this, `xnat-jupyter-01`, {
            vpc: props.vpc,
            securityGroup: props.securityGroup,
            fileSystem: props.fileSystem,
            elasticIp: props.elasticIp,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.LARGE),
            machineImage: new ec2.AmazonLinuxImage({
                generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
            }),
            swarmNodeInstanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.LARGE),
            keyName: props.keyName,
            numSwarmNodes: 0,
        })
    }

}