import crypto from 'crypto';
import { errors } from 'arsenal';

export default class common {

    static _algorithm() {
        return 'aes-256-ctr';
    }

    /* AES-256 Key */
    static _keySize() {
        return 32;
    }

    /* IV is 128bit for AES-256-CTR */
    static _IVSize() {
        return 16;
    }

    /* block size is 128bit for AES-256-CTR */
    static _aesBlockSize() {
        return 16;
    }

    static createDataKey() {
        return new Buffer(crypto.randomBytes(this._keySize()));
    }

    static _incrementIV(derivedIV, counter) {
        const newIV = derivedIV;
        const len = derivedIV.length;
        let i = len - 1;
        let ctr = counter;
        while (ctr !== 0) {
            const mod = (ctr + newIV[i]) % 256;
            ctr = Math.floor((ctr + newIV[i]) / 256);
            newIV[i] = mod;
            i -= 1;
            if (i < 0) {
                i = len - 1;
            }
        }
        return newIV;
    }

    /*
     * cb(err, derivedKey, derivedIV)
     */
    static _deriveKey(cryptoScheme, dataKey, log, cb) {
        if (cryptoScheme <= 1) {
            /* we are not storing hashed human password.
             * It's a random key, so 1 iteration and
             * a fixed salt is enough for our usecase.
             * don't change these without bumping
             * scheme number
             */
            const salt = new Buffer('ItsTasty');
            const iterations = 1;
            crypto.pbkdf2(
                dataKey, salt, iterations,
                this._keySize(), 'sha1', (err, derivedKey) => {
                    if (err) {
                        log.error('pbkdf2 function failed on key derivation',
                                  { err });
                        cb(errors.InternalError);
                        return;
                    }
                    crypto.pbkdf2(
                        derivedKey, salt, iterations,
                        this._IVSize(), 'sha1', (err, derivedIV) => {
                            if (err) {
                                log.error(
                                    'pbkdf2 function failed on IV derivation',
                                    { err });
                                cb(errors.InternalError);
                                return;
                            }
                            cb(null, derivedKey, derivedIV);
                        });
                });
        } else {
            log.error('Unknown cryptographic scheme', { cryptoScheme });
            cb(errors.InternalError);
        }
    }

    /*
     * cb(err, decipher: ReadWritable.stream)
     */
    static createDecipher(cryptoScheme, dataKey, offset, log, cb) {
        this._deriveKey(
            cryptoScheme, dataKey, log,
            (err, derivedKey, derivedIV) => {
                if (err) {
                    log.warn('key derivation failed', { err });
                    cb(err);
                    return;
                }
                const aesBlockSize = this._aesBlockSize();
                const blocks = Math.floor(offset / aesBlockSize);
                const toSkip = offset % aesBlockSize;
                const iv = this._incrementIV(derivedIV, blocks);
                const cipher = crypto.createDecipheriv(this._algorithm(),
                                                       derivedKey, iv);
                if (toSkip) {
                    /* seek within the block to finish cipher initialization */
                    const dummyBuffer = new Buffer(toSkip);
                    cipher.write(dummyBuffer);
                    cipher.read();
                }
                cb(null, cipher);
            });
    }

    /*
     * cb(err, cipher: ReadWritable.stream)
     */
    static createCipher(cryptoScheme, dataKey, offset, log, cb) {
        /* aes-256-ctr decipher is both ways */
        this.createDecipher(cryptoScheme, dataKey, offset, log, cb);
    }
}
