import { auth, policies } from 'arsenal';

import bucketDelete from './bucketDelete';
import bucketGet from './bucketGet';
import bucketGetACL from './bucketGetACL';
import bucketHead from './bucketHead';
import bucketPut from './bucketPut';
import bucketPutACL from './bucketPutACL';
import completeMultipartUpload from './completeMultipartUpload';
import initiateMultipartUpload from './initiateMultipartUpload';
import listMultipartUploads from './listMultipartUploads';
import listParts from './listParts';
import multipartDelete from './multipartDelete';
import objectDelete from './objectDelete';
import objectGet from './objectGet';
import objectGetACL from './objectGetACL';
import objectHead from './objectHead';
import objectPut from './objectPut';
import objectPutACL from './objectPutACL';
import objectPutPart from './objectPutPart';
import serviceGet from './serviceGet';
import vault from '../auth/vault';

const RequestContext = policies.RequestContext;
auth.setHandler(vault);

const api = {
    callApiMethod(apiMethod, request, log, callback, locationConstraint) {
        const requestContext = new RequestContext(request.headers,
            request.query, request.bucketName, request.objectKey,
            request.socket.remoteAddress, request.connection.encrypted,
            apiMethod, 's3', locationConstraint);
        auth.server.doAuth(request, log, (err, authInfo) => {
            if (err) {
                log.trace('authentication error', { error: err });
                return callback(err);
            }
            if (apiMethod === 'bucketPut') {
                return bucketPut(authInfo, request, locationConstraint,
                    log, callback);
            }
            return this[apiMethod](authInfo, request, log, callback);
        }, 's3', requestContext);
    },
    bucketDelete,
    bucketGet,
    bucketGetACL,
    bucketHead,
    bucketPut,
    bucketPutACL,
    completeMultipartUpload,
    initiateMultipartUpload,
    listMultipartUploads,
    listParts,
    multipartDelete,
    objectDelete,
    objectGet,
    objectGetACL,
    objectHead,
    objectPut,
    objectPutACL,
    objectPutPart,
    serviceGet,
};

export default api;
