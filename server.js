/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0.
 */

const { mqtt } = require('aws-iot-device-sdk-v2');
const { TextDecoder } = require('util');

const yargs = require('yargs');

// The relative path is '../../util/cli_args' from here, but the compiled javascript file gets put one level
// deeper inside the 'dist' folder
const common_args = require('./cli_args');

yargs
  .command(
    '*',
    false,
    (yargs) => {
      common_args.add_direct_connection_establishment_arguments(yargs);
      common_args.add_topic_message_arguments(yargs);
    },
    main
  )
  .parse();

let robotInfo;

async function execute_session(connection, argv) {
  return new Promise(async (resolve, reject) => {
    try {
      const decoder = new TextDecoder('utf8');
      const on_publish = async (topic, payload, dup, qos, retain) => {
        const json = decoder.decode(payload);
        console.log(
          `Publish received. topic:"${topic}" dup:${dup} qos:${qos} retain:${retain}`
        );
        console.log(`${json}`);
        try {
          const message = JSON.parse(json);
          // Handle message processing logic here
        } catch (error) {
          console.log('Warning: Could not parse message as JSON...');
        }
      };

      await connection.subscribe(argv.topic, mqtt.QoS.AtLeastOnce, on_publish);

      const publishInterval = setInterval(() => {
        const cleanedString = robotInfo.replace(/\u0000/g, '');
        const msg = {
          msg: cleanedString,
          // Include any necessary message properties here
        };
        const json = JSON.stringify(msg);
        connection
          .publish(argv.topic, json, mqtt.QoS.AtLeastOnce)
          .catch((error) => {
            console.error('Error occurred while publishing:', error);
            // Handle the error gracefully, if needed
          });
      }, 5000); // Adjust the interval as needed

      // Optionally, you can stop the publishing interval after a certain duration
      // setTimeout(() => {
      //   clearInterval(publishInterval);
      //   resolve();
      // }, 60000); // Stop after 60 seconds (adjust as needed)
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
}

async function main(argv) {
  common_args.apply_sample_arguments(argv);

  const connection = common_args.build_connection_from_cli_args(argv);

  // force node to wait 60 seconds before killing itself, promises do not keep node alive
  // ToDo: we can get rid of this but it requires a refactor of the native connection binding that includes
  //    pinning the libuv event loop while the connection is active or potentially active.
  const timer = setInterval(() => {}, 60 * 1000);

  await connection.connect();
  await execute_session(connection, argv);
  // Do not disconnect explicitly, as the script will keep publishing messages
  // await connection.disconnect();

  // Allow node to die if the promise above resolved
  clearTimeout(timer);
}

const { client } = require('./named_pipe/named_pipe_client');

client.on('data', (data) => {
  robotInfo = data.toString();
});

client.on('end', () => {
  console.log('Disconnected from named pipe server');
});

client.on('error', (err) => {
  console.error('Error occurred with named pipe client:', err.message);
  console.log('Reconnecting...');
});

//  nodemon .\server.js --endpoint a1cm3c34iajtv7-ats.iot.us-east-1.amazonaws.com --cert certificates\certificate.pem.crt --key certificates\private.pem.key --topic wheelChair/position --ca_file certificates\rootCA.pem
