const Transform = require('stream').Transform;
const crypto = require('crypto');

class MD5Sum extends Transform {

    constructor(callback) {
        super({});
        this.hash = crypto.createHash('md5');
        this.callback = callback;
    }

    _transform(chunk, encoding, callback) {
        this.hash.update(chunk, encoding);
        callback(null, chunk, encoding);
    }

    _flush(callback) {
        this.callback(null, this.hash.digest('hex'));
        callback(null);
    }

}

module.exports = MD5Sum;
