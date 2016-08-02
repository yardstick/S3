import common from '../common';

export const kms = [];
let count = 1;

export const backend = {
    /*
     * Target implementation will be async in some aspects. let mimic it
     */

    /*
     * cb(err, masterKeyId: string)
     */
    createBucketKey: function createBucketKeyMem(bucketName, log, cb) {
        process.nextTick(() => {
            kms[count] = common.createDataKey();
            cb(null, count++);
        });
    },

    /*
     * cb(err, cipheredDataKey: Buffer)
     */
    cipherDataKey: function cipherDataKeyMem(cryptoScheme,
                                             masterKeyId,
                                             plainTextDataKey,
                                             log,
                                             cb) {
        process.nextTick(() => {
            common.createCipher(
                cryptoScheme, kms[masterKeyId], 0, log,
                (err, cipher) => {
                    if (err) {
                        cb(err);
                        return;
                    }
                    let cipheredDataKey =
                            cipher.update(plainTextDataKey);
                    const final = cipher.final();
                    if (final.length !== 0) {
                        cipheredDataKey =
                            Buffer.concat([cipheredDataKey,
                                           final]);
                    }
                    cb(null, cipheredDataKey);
                });
        });
    },

    /*
     * cb(err, plainTextDataKey: Buffer)
     */
    decipherDataKey: function decipherDataKeyMem(cryptoScheme,
                                                 masterKeyId,
                                                 cipheredDataKey,
                                                 log,
                                                 cb) {
        process.nextTick(() => {
            common.createDecipher(
                cryptoScheme, kms[masterKeyId], 0, log,
                (err, decipher) => {
                    if (err) {
                        cb(err);
                        return;
                    }
                    let plainTextDataKey =
                            decipher.update(cipheredDataKey);
                    const final = decipher.final();
                    if (final.length !== 0) {
                        plainTextDataKey =
                            Buffer.concat([plainTextDataKey,
                                           final]);
                    }
                    cb(null, plainTextDataKey);
                });
        });
    },

};

export default backend;
