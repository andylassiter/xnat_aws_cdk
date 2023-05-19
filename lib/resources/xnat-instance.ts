import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as efs from "aws-cdk-lib/aws-efs";
import {Construct} from "constructs";
import {Instance, InstanceProps} from "./instance";
import {EbsDeviceVolumeType} from "aws-cdk-lib/aws-ec2";

export interface XnatInstanceProps extends InstanceProps {
    vpc: ec2.Vpc
    securityGroup: ec2.SecurityGroup
    fileSystem: efs.FileSystem
    elasticIp?: ec2.CfnEIP
    keyName: string
    numSwarmNodes: number
    swarmNodeInstanceType: ec2.InstanceType;
}

export class XnatInstance extends Construct {

    xnatInstance: Instance

    constructor(scope: Construct, id: string, props: XnatInstanceProps) {
        super(scope, id);

        // Create Xnat EC2 Instance
        this.xnatInstance = new Instance(this, id, {
            vpc: props.vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
            },
            securityGroup: props.securityGroup,
            instanceType: props.instanceType,
            machineImage: props.machineImage,
            keyName: props.keyName,
            fileSystem: props.fileSystem,
            mountPoint: "/data",
            blockDevices: [
                {
                    deviceName: '/dev/xvda',
                    volume: ec2.BlockDeviceVolume.ebs(64, {
                        deleteOnTermination: true,
                        volumeType: EbsDeviceVolumeType.GP2
                    }),
                }
            ],
        });

        if (props.elasticIp) {
            new ec2.CfnEIPAssociation(this, `${id}-eip-association`, {
                allocationId: props.elasticIp.attrAllocationId,
                instanceId: this.xnatInstance.instance.instanceId
            })
        }

        // Download and setup xnat-docker-compose and jupyter plugin
        const xdcUrl = "https://github.com/NrgXnat/xnat-docker-compose"
        const xdcPath = `/data/${id}`
        const jupyterHubPluginName = "xnat-jupyterhub-plugin-0.3.0.jar"

        this.xnatInstance.instance.userData.addCommands(
            `USER_ID=$(id -g ec2-user)`,
            `GROUP_ID=$(getent group docker | cut -d: -f3)`,
            // Only download xnat-docker-compose and setup if it doesn't already exist
            `[ ! -d ${xdcPath} ] && mkdir -p ${xdcPath} \
                                         && git clone -b features/jupyterhub ${xdcUrl} ${xdcPath} \
                                         && cp ${xdcPath}/linux.env ${xdcPath}/.env \
                                         && sed -i 's|_UID=|_UID='"$USER_ID"'|' ${xdcPath}/.env \
                                         && sed -i 's|_GID=|_GID='"$GROUP_ID"'|' ${xdcPath}/.env \
                                         && wget --no-verbose --output-document="${xdcPath}/xnat/plugins/${jupyterHubPluginName}" https://ci.xnat.org/job/Plugins_Develop/job/JupyterHub/22/artifact/build/libs/xnat-jupyterhub-plugin-0.3.0.jar \
                                         && chown -R ec2-user:docker ${xdcPath}`,
        )

        this.xnatInstance.instance.userData.addCommands(
            'docker pull jupyter/datascience-notebook:hub-3.0.0',
            'docker pull xnat/datascience-notebook:latest',
            'docker swarm init',
            `docker swarm join-token worker | grep -oP "(?<=--token )[^ ]+" > ${xdcPath}/swarm-token`,
            // in the background add a command to wait 10 minutes for the swarm nodes to join then add node labels to each worker node
            // this is done in the background because the swarm nodes take a while to join and we don't want to block the rest of the userdata script
            '(sleep 600 && docker node ls --filter "role=worker" --format "{{.ID}}" | xargs -I {} docker node update --label-add type=jupyter {} ) &',
        );

        let swarmNodes = []

        for (let i = 0; i < props.numSwarmNodes; i ++) {
            let instanceName = `${id}-swarm-node-${i}`
            const swarmNode = new Instance(this, instanceName, {
                vpc: props.vpc,
                vpcSubnets: {
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                //role: webserverRole,
                securityGroup: props.securityGroup,
                instanceType: props.swarmNodeInstanceType,
                machineImage: new ec2.AmazonLinuxImage({
                    generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
                }),
                keyName: props.keyName,
                fileSystem: props.fileSystem,
                mountPoint: "/data",
                blockDevices: [
                    {
                        deviceName: '/dev/xvda',
                        volume: ec2.BlockDeviceVolume.ebs(48, {
                            deleteOnTermination: true,
                            volumeType: EbsDeviceVolumeType.GP2
                        }),
                    }
                ],
            });

            swarmNode.instance.userData.addCommands(
                'docker pull jupyter/datascience-notebook:hub-3.0.0',
                'docker pull xnat/datascience-notebook:latest',
                `TOKEN=$(cat ${xdcPath}/swarm-token)`,
                `docker swarm join --token $TOKEN ${this.xnatInstance.instance.instancePrivateIp}:2377`,
            );

            swarmNode.node.addDependency(this.xnatInstance);
            swarmNodes.push(swarmNode);
        }

    }
}