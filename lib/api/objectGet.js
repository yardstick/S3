import services from '../services';
import { errors, versioning } from 'arsenal';
import { parseRange } from './apiUtils/object/parseRange';

const VSUtils = versioning.VersioningUtils;

/**
 * GET Object - Get an object
 * @param {AuthInfo} authInfo - Instance of AuthInfo class with requester's info
 * @param {object} request - normalized request object
 * @param {object} log - Werelogs instance
 * @param {function} callback - callback to function in route
 * @return {undefined}
 */
export default
function objectGet(authInfo, request, log, callback) {
    log.debug('processing request', { method: 'objectGet' });
    const bucketName = request.bucketName;
    const objectKey = request.objectKey;
    const query = request.query;
    const mdValParams = {
        authInfo,
        bucketName,
        objectKey,
        requestType: 'objectGet',
        log,
        query,
    };

    services.metadataValidateAuthorization(mdValParams, (err, bucket,
        objMD) => {
        if (err) {
            log.debug('error processing request', { error: err });
            return callback(err);
        }
        services.validateHeaders(objMD, request, (error, objMD,
            responseMetaHeaders) => {
            if (error) {
                log.debug('error processing request', { error });
                return callback(error);
            }
            // return ObjNotFound if the version is a delete marker
            if (VSUtils.getdm(objMD)) {
                return callback(errors.ObjNotFound);
            }
            // 0 bytes file
            if (objMD.location === null) {
                return callback(null, null, responseMetaHeaders);
            }
            let range;
            let maxContentLength;
            if (request.headers.range) {
                maxContentLength =
                    parseInt(responseMetaHeaders['Content-Length'], 10);
                range = parseRange(request.headers.range, maxContentLength);
                if (range) {
                    // End of range should be included so + 1
                    responseMetaHeaders['Content-Length'] =
                        Math.min(maxContentLength - range[0],
                        range[1] - range[0] + 1);
                    responseMetaHeaders['Accept-Ranges'] = 'bytes';
                    responseMetaHeaders['Content-Range'] = `bytes ${range[0]}-`
                        + `${Math.min(maxContentLength - 1, range[1])}` +
                        `/${maxContentLength}`;
                }
            }
            // To provide for backwards compatibility before md-model-version 2,
            // need to handle cases where objMD.location is just a string
            const dataLocator = Array.isArray(objMD.location) ?
                objMD.location : [{ key: objMD.location }];
            // If have a data model before version 2, cannot support get range
            // for objects with multiple parts
            if (range && dataLocator.length > 1 &&
                dataLocator[0].start === undefined) {
                return callback(errors.NotImplemented);
            }
            return callback(null, dataLocator, responseMetaHeaders, range);
        });
        return undefined;
    });
}
