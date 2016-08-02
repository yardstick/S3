import { auth } from 'arsenal';
import http from 'http';
import { logger } from '../utilities/logger';
const Getopt = require('node-getopt');

function _createEncryptedBucket(hostname,
                                port,
                                bucketName,
                                accessKey,
                                secretKey,
                                verbose) {
    const options = {
        method: 'PUT',
        hostname,
        port,
        path: `/${bucketName}/`,
        headers: {
            'Content-Length': 0,
            'host': '127.0.0.1:8000',
            'x-amz-scal-server-side-encryption': 'AES256',
        },
    };

    const request = http.request(options, response => {
        if (verbose) {
            logger.info(` <= STATUS: ${response.statusCode}`);
            logger.info(` <= HEADERS: ${JSON.stringify(response.headers)}`);
        }
        response.setEncoding('utf8');
        response.on('data', chunk => {
            if (verbose) {
                logger.info(`BODY: ${chunk}`);
            }
        });
        response.on('end', () => {
            if (verbose) {
                logger.info('No more data in response.');
            }
            if (response.statusCode >= 200 && response.statusCode < 300) {
                logger.info('Success');
                process.exit(0);
            } else {
                logger.error('request failed with HTTP Status ',
                             response.statusCode);
                process.exit(1);
            }
        });
    });

    auth.generateV4Headers(request, '', accessKey, secretKey, 's3');
    if (verbose) {
        logger.info(` => HEADERS: ${JSON.stringify(request._headers)}`);
    }
    request.write('');
    request.end();
}


export function createEncryptedBucket() {
    const getopt = new Getopt([
        ['a', 'accesskey=ARG', 'the access key id.'],
        ['k', 'secretkey=ARG', 'the secret access key'],
        ['b', 'bucket=ARG', 'option with argument'],
        ['h', 'host=ARG', 'server to connect to'],
        ['p', 'port=ARG', 'tcp port'],
        ['v', 'verbose', 'be verbose'],
        ['', 'help', 'display this help'],
    ]);              // create Getopt instance

    getopt.bindHelp();    // bind option 'help' to default action
    getopt.parseSystem(); // parse command line

    const opt = getopt.parsedOption.options;
    if (opt.accesskey === undefined ||
        opt.secretkey === undefined ||
        opt.bucket === undefined ||
        opt.host === undefined ||
        opt.port === undefined) {
        logger.error('Missing argument');
        getopt.showHelp();
        process.exit(1);
    }

    _createEncryptedBucket(opt.host,
                           opt.port,
                           opt.bucket,
                           opt.accesskey,
                           opt.secretkey,
                           opt.verbose);
}
