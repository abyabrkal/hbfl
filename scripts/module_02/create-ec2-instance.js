// Imports
const AWS = require("aws-sdk");
const helpers = require("./helpers");

// Configure region
AWS.config.update({ region: "us-east-1" });

// Declare local variables
const ec2 = new AWS.EC2();
const sgName = "hamster_sg";
const keyName = "hamster_key";

// Do all the things together
createSecurityGroup(sgName)
  .then(() => {
    return createKeyPair(keyName);
  })
  .then(helpers.persistKeyPair)
  .then(() => {
    return createInstance(sgName, keyName);
  })
  .then((data) => {
    console.log("Created instance with:", data);
  })
  .catch((err) => {
    console.error("Failed to create instance with:", err);
  });

// Create functions

function createSecurityGroup(sgName) {
  const params = {
    Description: sgName,
    GroupName: sgName,
  };

  return new Promise((resolve, reject) => {
    ec2.createSecurityGroup(params, (err, data) => {
      if (err) reject(err);
      else {
        const params = {
          GroupId: data.GroupId,
          IpPermissions: [
            {
              IpProtocol: "tcp",
              FromPort: 22,
              ToPort: 22,
              IpRanges: [{ CidrIp: "0.0.0.0/0" }],
            },
            {
              IpProtocol: "tcp",
              FromPort: 3000,
              ToPort: 3000,
              IpRanges: [{ CidrIp: "0.0.0.0/0" }],
            },
          ],
        };

        ec2.authorizeSecurityGroupIngress(params, (err) => {
          if (err) reject(err);
          else resolve();
        });
      }
    });
  });
}

function createKeyPair(keyName) {
  const params = {
    KeyName: keyName,
  };

  return new Promise((resolve, reject) => {
    ec2.createKeyPair(params, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

function createInstance(sgName, keyName) {
  let userData = `#!/bin/bash
  curl --silent --location https://rpm.nodesource.com/setup_12.x | sudo bash -
  sudo yum install -y nodejs
  sudo yum install -y git
  git clone https://github.com/abyabrkal/hbfl.git
  cd hbfl
  npm i
  npm run start
  `;

  // Warning came while creating EC2 instance [EC2 Created Successfully]
  // Buffer() is deprecated due to security and usability issues.
  // Please use the Buffer.alloc(), Buffer.allocUnsafe(), or Buffer.from() methods instead.
  const userDataEncoded = new Buffer(userData).toString("base64");

  const params = {
    ImageId: "ami-09d95fab7fff3776c",
    InstanceType: "t2.micro",
    KeyName: keyName,
    MaxCount: 1,
    MinCount: 1,
    SecurityGroups: [sgName],
    UserData: userDataEncoded,
  };

  return new Promise((resolve, reject) => {
    ec2.runInstances(params, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}
