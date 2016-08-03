

    /**
     * PUT Object Copy in the requested bucket.
     * @param {AuthInfo} authInfo - Instance of AuthInfo class with
     * requester's info
     * @param {request} request - request object given by router,
     *                            includes normalized headers
     * @param {string} sourceBucket - name of source bucket for object copy
     * @param {string} sourceObject - name of source object for object copy
     * @param {object} log - the log request
     * @param {Function} callback - final callback to call with the result
     * @return {undefined}
     */
    export default
    function objectCopy(authInfo, request, sourceBucket,
        sourceObject, log, callback) {
        log.debug('processing request', { method: 'objectCopy' });
        // const bucketName = request.bucketName;
        // const objectKey = request.objectKey;
        // const valParams = {
        //     authInfo,
        //     bucketName,
        //     objectKey,
        //     requestType: 'objectPut',
        //     log,
        // };
        // const canonicalID = authInfo.getCanonicalID();
        // log.trace('owner canonicalID to send to data', { canonicalID });

        // return services.metadataValidateAuthorization(valParams, (err, bucket,
        //     objMD) => {
        //     if (err) {
        //         log.trace('error processing request', {
        //             error: err,
        //             method: 'services.metadataValidateAuthorization',
        //         });
        //         return callback(err);
        //     }
        //     if (bucket.hasDeletedFlag() &&
        //         canonicalID !== bucket.getOwner()) {
        //         log.trace('deleted flag on bucket and request ' +
        //             'from non-owner account');
        //         return callback(errors.NoSuchBucket);
        //     }
        //     if (bucket.hasTransientFlag() ||
        //         bucket.hasDeletedFlag()) {
        //         log.trace('transient or deleted flag so cleaning up bucket');
        //         return cleanUpBucket(bucket,
        //                 canonicalID, log, err => {
        //                     if (err) {
        //                         log.debug('error cleaning up bucket with flag',
        //                         { error: err,
        //                         transientFlag:
        //                             bucket.hasTransientFlag(),
        //                         deletedFlag:
        //                             bucket.hasDeletedFlag(),
        //                         });
        //                         // To avoid confusing user with error
        //                         // from cleaning up
        //                         // bucket return InternalError
        //                         return callback(errors.InternalError);
        //                     }
        //                     return _storeIt(bucketName, objectKey, objMD,
        //                         authInfo, canonicalID, request, log, callback);
        //                 });
        //     }
        //     return _storeIt(bucketName, objectKey, objMD, authInfo, canonicalID,
        //         request, log, callback);
        // });
    }
