import {Stack} from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as efs from 'aws-cdk-lib/aws-efs';
import {Construct} from "constructs";

export interface InstanceProps extends ec2.InstanceProps {
    fileSystem?: efs.FileSystem
    mountPoint?: string
}

export class Instance extends Construct {

    instance: ec2.Instance

    constructor(scope: Construct, id: string, props: InstanceProps) {
        super(scope, id);

        this.instance = new ec2.Instance(scope, `${id}-instance`, props);

        // Update
        this.instance.userData.addCommands("yum check-update -y", "yum upgrade -y")

        // Install and setup Docker
        this.instance.userData.addCommands(
            "amazon-linux-extras install docker",
            "wget -O /usr/libexec/docker/cli-plugins/docker-compose https://github.com/docker/compose/releases/download/v2.10.2/docker-compose-linux-x86_64",
            "chmod +x /usr/libexec/docker/cli-plugins/docker-compose",
            "systemctl enable docker.service",
            "systemctl start docker.service",
            "usermod -a -G docker ec2-user"
        )

        // Install git
        this.instance.userData.addCommands("yum install -y git")

        // Mount file system
        if (props.fileSystem) {
            this.instance.userData.addCommands(
                "yum install -y amazon-efs-utils",
                "yum install -y nfs-utils",
                "file_system_id_1=" + props.fileSystem.fileSystemId,
                "efs_mount_point_1=" + props.mountPoint,
                "mkdir -p \"${efs_mount_point_1}\"",
                "test -f \"/sbin/mount.efs\" && echo \"${file_system_id_1}:/ ${efs_mount_point_1} efs defaults,_netdev\" >> /etc/fstab || " +
                "echo \"${file_system_id_1}.efs." + Stack.of(this).region + ".amazonaws.com:/ ${efs_mount_point_1} nfs4 nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport,_netdev 0 0\" >> /etc/fstab",
                "mount -a -t efs,nfs4 defaults");

            props.fileSystem.connections.allowDefaultPortFrom(this.instance);
        }

        // Install jdk 8
        this.instance.userData.addCommands(
            "amazon-linux-extras enable corretto8",
            "yum install -y java-1.8.0-amazon-corretto-devel",
        )

        // Install gradle
        this.instance.userData.addCommands(
            "mkdir /opt/gradle",
            "wget -O gradle-7.6-bin.zip \"https://services.gradle.org/distributions/gradle-7.6-bin.zip\"\n",
            "unzip -d /opt/gradle gradle-7.6-bin.zip",
            "touch /etc/profile.d/gradle.sh",
            "echo \"export PATH=$PATH:/opt/gradle/gradle-7.6/bin\" >> /etc/profile.d/gradle.sh",
            "rm gradle-7.6-bin.zip"
        )

    }
}