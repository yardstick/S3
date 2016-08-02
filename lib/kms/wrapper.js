import config from '../Config';
import inMemory from './in_memory/backend';
import file from './file/backend';
import common from './common';
import async from 'async';
import { errors } from 'arsenal';

let client;
let implName;

if (config.backends.kms === 'mem') {
    client = inMemory;
    implName = 'memoryKms';
} else if (config.backends.kms === 'file') {
    client = file;
    implName = 'fileKms';
} else if (config.backends.kms === 'scality') {
    throw new Error('KMS backend not implemented');
} else {
    throw new Error('KMS backend is not configured');
}


export default class kms {

    /*
     * cb(err, masterKeyId: string)
     */
    static createBucketKey(bucketName, log, cb) {
        log.debug('creating a new bucket key');
        client.createBucketKey(bucketName, log, (err, masterKeyId) => {
            if (err) {
                log.warn('error from kms', { implName, error: err });
                return cb(err);
            }
            log.trace('bucket key created in kms');
            return cb(null, masterKeyId);
        });
    }

    /*
     * cb(err, serverSideEncryptionInfo: object)masterKeyId: string)
     */
    static bucketLevelEncryption(bucketName, headers, log, cb) {
        const sseAlgorithm = headers['x-amz-scal-server-side-encryption'];
        const sseMasterKeyId =
                  headers['x-amz-scal-server-side-encryption-aws-kms-key-id'];
        /*
         * the purpose of bucket level encryption is to exempt client
         * from sending appropriate headers to trigger encryption.
         * Since server side encryption with customer provided key needs
         * the key for every access to the ciphered objects and we don't
         * want to store it in the bucket metadata. It is not feasible
         * in bucket level encryption.
         */
        if (sseAlgorithm === 'AES256' ||
            (sseAlgorithm === 'aws:kms' && sseMasterKeyId === undefined)) {
            this.createBucketKey(bucketName, log, (err, masterKeyId) => {
                if (err) {
                    cb(err);
                    return;
                }
                const serverSideEncryptionInfo = {
                    cryptoScheme: 1,
                    algorithm: sseAlgorithm,
                    masterKeyId,
                    mandatory: true,
                };
                cb(null, serverSideEncryptionInfo);
            });
        } else if (sseAlgorithm === 'aws:kms') {
            const serverSideEncryptionInfo = {
                cryptoScheme: 1,
                algorithm: sseAlgorithm,
                masterKeyId: sseMasterKeyId,
                mandatory: true,
            };
            cb(null, serverSideEncryptionInfo);
        } else {
            /*
             * no encryption
             */
            cb(null, null);
        }
    }

    static createDataKey(log) {
        log.debug('creating a new data key');
        const newKey = common.createDataKey();
        log.trace('data key created by the kms');
        return newKey;
    }

    /*
     * cb(err, cipheredDataKey: Buffer)
     */
    static _cipherDataKey(cryptoScheme,
                          masterKeyId,
                          plainTextDataKey,
                          log, cb) {
        log.debug('ciphering a data key');
        client.cipherDataKey(cryptoScheme, masterKeyId, plainTextDataKey, log,
                             (err, cipheredDataKey) => {
                                 if (err) {
                                     log.warn('error from kms',
                                              { implName, error: err });
                                     return cb(err);
                                 }
                                 log.trace('data key ciphered by the kms');
                                 return cb(null, cipheredDataKey);
                             });
    }

    /*
     * cb(err, plainTextDataKey: Buffer)
     */
    static _decipherDataKey(cryptoScheme, masterKeyId,
                            cipheredDataKey, log, cb) {
        log.debug('deciphering a data key');
        client.decipherDataKey(cryptoScheme, masterKeyId, cipheredDataKey, log,
                               (err, plainTextDataKey) => {
                                   if (err) {
                                       log.warn('error from kms',
                                                { implName, error: err });
                                       return cb(err);
                                   }
                                   log.trace('data key deciphered by the kms');
                                   return cb(null, plainTextDataKey);
                               });
    }

    /*
     * cb(err, cipher: ReadWritable.stream)
     */
    static _createCipher(cryptoScheme, dataKey, offset, log, cb) {
        log.debug('creating a cipher');
        common.createCipher(
            cryptoScheme, dataKey, offset, log,
            (err, cipher) => {
                if (err) {
                    log.warn('error from kms', { implName, error: err });
                    return cb(err);
                }
                log.trace('cipher created by the kms');
                return cb(null, cipher);
            });
    }

    /*
     * cb(err, decipher: ReadWritable.stream)
     */
    static _createDecipher(cryptoScheme, dataKey, offset, log, cb) {
        log.debug('creating a decipher');
        common.createDecipher(
            cryptoScheme, dataKey, offset, log,
            (err, decipher) => {
                if (err) {
                    log.warn('error from kms', { implName, error: err });
                    return cb(err);
                }
                log.trace('decipher created by the kms');
                return cb(null, decipher);
            });
    }

    /*
     * cb(err, cipherBundle)
     */
    static createCipherBundle(serverSideEncryption,
                              log, cb) {
        const dataKey = this.createDataKey(log);
        const cipherBundle = {
            algorithm: serverSideEncryption.algorithm,
            masterKeyId: serverSideEncryption.masterKeyId,
            cryptoScheme: 1,
            cipheredDataKey: null,
            cipher: null,
        };

        async.waterfall([
            function cipherDataKey(next) {
                return kms._cipherDataKey(cipherBundle.cryptoScheme,
                                          serverSideEncryption.masterKeyId,
                                          dataKey, log, next);
            },
            function createCipher(cipheredDataKey, next) {
                cipherBundle.cipheredDataKey =
                    cipheredDataKey.toString('base64');
                return kms._createCipher(cipherBundle.cryptoScheme,
                                         dataKey, 0, log, next);
            },
            function finishCipherBundle(cipher, next) {
                cipherBundle.cipher = cipher;
                return next(null, cipherBundle);
            },
        ], (err, cipherBundle) => {
            if (err) {
                log.error('error processing cipher bundle',
                          { implName, error: err });
            }
            return cb(err, cipherBundle);
        });
    }
    /*
     * cb(err, decipherBundle)
     */
    static createDecipherBundle(serverSideEncryption, offset,
                                log, cb) {
        const decipherBundle = {
            cryptoScheme: serverSideEncryption.cryptoScheme,
            decipher: null,
        };
        if (!serverSideEncryption.masterKeyId ||
            !serverSideEncryption.cipheredDataKey ||
            !serverSideEncryption.cryptoScheme) {
            log.error('Invalid cryptographic information', { implName });
            return cb(errors.InternalError);
        }
        async.waterfall([
            function decipherDataKey(next) {
                return kms._decipherDataKey(
                    decipherBundle.cryptoScheme,
                    serverSideEncryption.masterKeyId,
                    serverSideEncryption.cipheredDataKey,
                    log, next);
            },
            function createDecipher(plainTextDataKey, next) {
                return kms._createDecipher(decipherBundle.cryptoScheme,
                                           plainTextDataKey,
                                           offset, log, next);
            },
            function finishDecipherBundle(decipher, next) {
                decipherBundle.decipher = decipher;
                return next(null, decipherBundle);
            },
        ], (err, decipherBundle) => {
            if (err) {
                log.error('error processing decipher bundle',
                          { implName, error: err });
                return cb(err);
            }
            return cb(err, decipherBundle);
        });
    }
}

