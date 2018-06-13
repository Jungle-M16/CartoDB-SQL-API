const EventEmitter = require('events');
const PSQL = require('cartodb-psql');
const copyTo = require('pg-copy-streams').to;
const copyFrom = require('pg-copy-streams').from;

module.exports = class StreamCopy extends EventEmitter {
    constructor (sql, userDbParams) {
        super();

        this.pg = new PSQL(userDbParams);
        this.sql = sql;
        this.connectionClosedByClient = false;
    }

    to(cb) {
        this.pg.connect((err, client, done)  => {
            if (err) {
                return cb(err);
            }

            const copyToStream = copyTo(this.sql);
            const pgstream = client.query(copyToStream);

            pgstream
                .on('error', err => {
                    if (!this.connectionClosedByClient) {
                        done(err);
                    }
                })
                .on('end', () => {
                    done();
                    this.emit('copy-to-end', copyToStream.rowCount);
                });

            cb(null, pgstream, client, done);
        });
    }

    from(cb) {
        this.pg.connect((err, client, done) => {
            if (err) {
                return cb(err);
            }

            const copyFromStream = copyFrom(this.sql);
            const pgstream = client.query(copyFromStream);

            pgstream
                .on('error', err => {
                    done();
                })
                .on('end', () => {
                    done();
                    this.emit('copy-from-end', copyFromStream.rowCount);
                });

            cb(null, pgstream, client, done);
        });
    }

    setConnectionClosedByClient(connectionClosedByClient) {
        this.connectionClosedByClient = connectionClosedByClient;
    }
};
