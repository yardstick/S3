import assert from 'assert';
import kms from '../../lib/kms/wrapper';
import { cleanup, DummyRequestLogger } from './helpers';

const log = new DummyRequestLogger();

describe('KMS unit tests', () => {
    beforeEach(() => {
        cleanup();
    });

    it('should construct a sse info object on AES256', done => {
        const algorithm = 'AES256';
        const headers = {
            'x-amz-scal-server-side-encryption': algorithm,
        };
        kms.bucketLevelEncryption(
            'dummyBucket', headers, log,
            (err, sseInfo) => {
                assert.strictEqual(err, null);
                assert.strictEqual(sseInfo.cryptoScheme, 1);
                assert.strictEqual(sseInfo.mandatory, true);
                assert.strictEqual(sseInfo.algorithm, algorithm);
                assert.notEqual(sseInfo.masterKeyId, undefined);
                assert.notEqual(sseInfo.masterKeyId, null);
                done();
            });
    });

    it('should construct a sse info object on aws:kms', done => {
        const algorithm = 'aws:kms';
        const masterKeyId = 'foobarbaz';
        const headers = {
            'x-amz-scal-server-side-encryption': algorithm,
            'x-amz-scal-server-side-encryption-aws-kms-key-id': masterKeyId,
        };
        kms.bucketLevelEncryption(
            'dummyBucket', headers, log,
            (err, sseInfo) => {
                assert.strictEqual(err, null);
                assert.strictEqual(sseInfo.cryptoScheme, 1);
                assert.strictEqual(sseInfo.mandatory, true);
                assert.strictEqual(sseInfo.algorithm, 'aws:kms');
                assert.strictEqual(sseInfo.masterKeyId, masterKeyId);
                done();
            });
    });

    it('should not construct a sse info object on garbage', done => {
        const algorithm = 'garbage';
        const masterKeyId = 'foobarbaz';
        const headers = {
            'x-amz-scal-server-side-encryption': algorithm,
            'x-amz-scal-server-side-encryption-aws-kms-key-id': masterKeyId,
        };
        kms.bucketLevelEncryption(
            'dummyBucket', headers, log,
            (err, sseInfo) => {
                assert.strictEqual(err, null);
                assert.strictEqual(sseInfo, null);
                done();
            });
    });

    it('should not construct a sse info object on no header', done => {
        kms.bucketLevelEncryption(
            'dummyBucket', {}, log,
            (err, sseInfo) => {
                assert.strictEqual(err, null);
                assert.strictEqual(sseInfo, null);
                done();
            });
    });

    it('should create a cipher bundle for AES256', done => {
        const algorithm = 'AES256';
        const headers = {
            'x-amz-scal-server-side-encryption': algorithm,
        };
        kms.bucketLevelEncryption(
            'dummyBucket', headers, log,
            (err, sseInfo) => {
                kms.createCipherBundle(
                    sseInfo, log, (err, cipherBundle) => {
                        assert.strictEqual(cipherBundle.algorithm,
                                           sseInfo.algorithm);
                        assert.strictEqual(cipherBundle.masterKeyId,
                                           sseInfo.masterKeyId);
                        assert.strictEqual(cipherBundle.cryptoScheme,
                                           sseInfo.cryptoScheme);
                        assert.notEqual(cipherBundle.cipheredDataKey, null);
                        assert.notEqual(cipherBundle.cipher, null);
                        done();
                    });
            });
    });

    it('should create a cipher bundle for aws:kms', done => {
        const headers = {
            'x-amz-scal-server-side-encryption': 'AES256',
        };
        let masterKeyId;
        kms.bucketLevelEncryption(
            'dummyBucket', headers, log,
            (err, sseInfo) => {
                assert.strictEqual(err, null);
                masterKeyId = sseInfo.bucketKeyId;
            });

        headers['x-amz-scal-server-side-encryption'] = 'aws:kms';
        headers['x-amz-scal-server-side-encryption-aws-kms-key-id'] =
            masterKeyId;
        kms.bucketLevelEncryption(
            'dummyBucket', headers, log,
            (err, sseInfo) => {
                kms.createCipherBundle(
                    sseInfo, log, (err, cipherBundle) => {
                        assert.strictEqual(cipherBundle.algorithm,
                                           sseInfo.algorithm);
                        assert.strictEqual(cipherBundle.masterKeyId,
                                           sseInfo.masterKeyId);
                        assert.strictEqual(cipherBundle.cryptoScheme,
                                           sseInfo.cryptoScheme);
                        assert.notEqual(cipherBundle.cipheredDataKey, null);
                        assert.notEqual(cipherBundle.cipher, null);
                        done();
                    });
            });
    });

    /* cb(err, cipherBundle, decipherBundle)*/
    function _utestCreateBundlePair(log, cb) {
        const algorithm = 'AES256';
        const headers = {
            'x-amz-scal-server-side-encryption': algorithm,
        };
        kms.bucketLevelEncryption(
            'dummyBucket', headers, log,
            (err, sseInfo) => {
                if (err) {
                    cb(err);
                    return;
                }
                kms.createCipherBundle(
                    sseInfo, log, (err, cipherBundle) => {
                        if (err) {
                            cb(err);
                            return;
                        }
                        sseInfo.cipheredDataKey =
                            new Buffer(cipherBundle.cipheredDataKey, 'base64');
                        kms.createDecipherBundle(
                            sseInfo, 0, log, (err, decipherBundle) => {
                                if (err) {
                                    cb(err);
                                    return;
                                }
                                assert.strictEqual(typeof decipherBundle,
                                                   'object');
                                assert.strictEqual(decipherBundle.cryptoScheme,
                                                   cipherBundle.cryptoScheme);
                                assert.notEqual(decipherBundle.decipher, null);
                                cb(null, cipherBundle, decipherBundle);
                            });
                    });
            });
    }

    it('should cipher and decipher a datastream', done => {
        _utestCreateBundlePair(log, (err, cipherBundle, decipherBundle) => {
            assert.strictEqual(err, null);
            cipherBundle.cipher.pipe(decipherBundle.decipher);
            const target = new Buffer(10000);
            target.fill('e');
            cipherBundle.cipher.write(target);
            const result = decipherBundle.decipher.read();
            assert.deepEqual(result, target);
            done();
        });
    });
});
