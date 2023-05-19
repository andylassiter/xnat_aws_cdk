import * as cdk from 'aws-cdk-lib';
import {NestedStack, NestedStackProps} from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import {ISubnet, Port} from 'aws-cdk-lib/aws-ec2';
import {Construct} from 'constructs';

interface NetworkStackProps extends NestedStackProps {
    vpcCidr: string,
}

export class NetworkStack extends NestedStack {
  id: string
  vpc: ec2.Vpc
  securityGroup: ec2.SecurityGroup
  elasticIp: ec2.CfnEIP

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);
    this.id = id;

    const vpcId = `${this.id}-vpc`
    this.vpc = new ec2.Vpc(this, vpcId, {
      cidr: props.vpcCidr,
      natGateways: 0,
      natGatewayProvider: ec2.NatProvider.instance({
        instanceType: new ec2.InstanceType('t2.micro')
      }),
      subnetConfiguration: [
        {
          name: `${this.id}-subnet-public-01`,
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24
        },
        {
          name: `${this.id}-subnet-private-01`,
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24
        }
      ]
    });

    // Tag the VPC and Subnets
    cdk.Aspects.of(this.vpc).add(new cdk.Tag('Name', vpcId))

    const subnetTagger = (subnet: ISubnet) => {
      cdk.Aspects.of(subnet).add((
          new cdk.Tag(
              'Name',
              `${this.vpc.node.id}-${subnet.node.id.replace(/Subnet[0-9]$/, '')}-${subnet.availabilityZone}`
          )
      ))
    }

    this.vpc.publicSubnets.forEach(subnetTagger);
    this.vpc.privateSubnets.forEach(subnetTagger);

    // Create Security Group for the Instance
    this.securityGroup = new ec2.SecurityGroup(this, `${this.id}-security-group`, {
      vpc: this.vpc,
      allowAllOutbound: true,
    });

    // Docker Swarm
    this.securityGroup.connections.allowFrom(this.securityGroup, Port.tcp(2377))
    this.securityGroup.connections.allowTo(this.securityGroup, Port.tcp(2377))

    this.securityGroup.addIngressRule(
        this.securityGroup,
        ec2.Port.allTraffic(),
        'allow all traffic within sg',
    )

    // SSH
    this.securityGroup.addIngressRule(
        ec2.Peer.ipv4("185.218.223.83/32"),
        ec2.Port.tcp(22),
        'allow SSH access from dedicated ip',
    );

    // HTTP
    this.securityGroup.addIngressRule(
        ec2.Peer.ipv4("185.218.223.83/32"),
        ec2.Port.tcp(80),
        'allow HTTP traffic from dedicated ip',
    );

    // HTTPS
    this.securityGroup.addIngressRule(
        ec2.Peer.ipv4("185.218.223.83/32"),
        ec2.Port.tcp(443),
        'allow HTTPS traffic from dedicated ip',
    );

    // HTTP
    this.securityGroup.addIngressRule(
        ec2.Peer.ipv4("128.252.0.0/16"),
        ec2.Port.tcp(80),
        'allow HTTP traffic from wustl ip range',
    );

    // HTTPS
    this.securityGroup.addIngressRule(
        ec2.Peer.ipv4("128.252.0.0/16"),
        ec2.Port.tcp(443),
        'allow HTTPS traffic from wustl ip range',
    );

    // Elastic IP
    this.elasticIp = new ec2.CfnEIP(this, `${this.id}-elastic-ip`, {
      domain: 'vpc',
    })

  }
}
