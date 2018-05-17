/**
 * this module allows to auth user using an pregenerated api key
 */
function ApikeyAuth(req, metadataBackend, username, apikey) {
    this.req = req;
    this.metadataBackend = metadataBackend;
    this.username = username;
    this.apikey = apikey;
}

module.exports = ApikeyAuth;

function errorUserNotFoundMessageTemplate (user) {
    return `Sorry, we can't find CARTO user '${user}'. Please check that you have entered the correct domain.`;
}

function usernameMatches(basicAuthUsername, requestUsername) {
    return !(basicAuthUsername && (basicAuthUsername !== requestUsername));
}

ApikeyAuth.prototype.verifyCredentials = function (callback) {
    this.metadataBackend.getApikey(this.username, this.apikey, (err, apikey) => {
        if (err) {
            err.http_status = 404;
            err.message = errorUserNotFoundMessageTemplate(this.username);

            return callback(err);
        }
        
        if (isApiKeyFound(apikey)) {
            if (!usernameMatches(apikey.user, this.username)) {
                const error = new Error('Forbidden');
                error.type = 'auth';
                error.subtype = 'api-key-username-mismatch';
                error.http_status = 403;

                return callback(error);
            }
            
            if (!apikey.grantsSql) {
                const forbiddenError = new Error('forbidden');
                forbiddenError.http_status = 403;

                return callback(forbiddenError);
            }

            return callback(null, verifyRequest(this.apikey, this.apikey));
        }  else {
            const error = new Error('Unauthorized');
            error.type = 'auth';
            error.subtype = 'api-key-not-found';
            error.http_status = 401;

            return callback(error);  
        }      
    });
};

ApikeyAuth.prototype.hasCredentials = function () {
    return !!this.apikey;
};

ApikeyAuth.prototype.getCredentials = function () {
    return this.apikey;
};

function verifyRequest(apikey, requiredApikey) {
    return (apikey === requiredApikey && apikey !== 'default_public');
}

function isApiKeyFound(apikey) {
    return apikey.type !== null &&
        apikey.user !== null &&
        apikey.databasePassword !== null &&
        apikey.databaseRole !== null;
}
