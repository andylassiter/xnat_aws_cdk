import {Stack, StackProps} from "aws-cdk-lib";
import {Construct} from "constructs";
import {FileSystemStack} from "./base/file-system-stack";
import {NetworkStack} from "./base/network-stack";
import {XnatStack} from "./xnat/xnat-stack";

interface MainStackProps extends StackProps {
    vpcCidr?: string
    keyName: string
}

export class Main extends Stack {

    networkStack: NetworkStack
    fileSystemStack: FileSystemStack
    xnatStack: XnatStack

    constructor(scope: Construct, id: string, props: MainStackProps) {
        super(scope, id, props);

        const name: string = 'xnat-jupyter-01';
        const vpcCidr: string = props.vpcCidr ? props.vpcCidr : '10.100.0.0/16';

        this.networkStack = new NetworkStack(this, `${name}-network`, {
            vpcCidr: vpcCidr
        });

        this.fileSystemStack = new FileSystemStack(this, `${name}-file-system`, {
            vpc: this.networkStack.vpc
        });

        this.fileSystemStack.addDependency(this.networkStack);

        this.xnatStack = new XnatStack(this, `${name}-xnat`, {
            vpc: this.networkStack.vpc,
            securityGroup: this.networkStack.securityGroup,
            fileSystem: this.fileSystemStack.fileSystem,
            elasticIp: this.networkStack.elasticIp,
            keyName: props.keyName,
        })

        this.xnatStack.addDependency(this.networkStack);
        this.xnatStack.addDependency(this.fileSystemStack);
    }

}