const oracledb = require('oracledb');
const loadEnvFile = require('./utils/envUtil');

const envVariables = loadEnvFile('./.env');

// Database configuration setup. Ensure your .env file has the required database credentials.
const dbConfig = {
    user: envVariables.ORACLE_USER,
    password: envVariables.ORACLE_PASS,
    connectString: `${envVariables.ORACLE_HOST}:${envVariables.ORACLE_PORT}/${envVariables.ORACLE_DBNAME}`,
};


// ----------------------------------------------------------
// Wrapper to manage OracleDB actions, simplifying connection handling.
async function withOracleDB(action) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        return await action(connection);
    } catch (err) {
        console.error(err);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
}


// ----------------------------------------------------------
// Core functions for database operations
// Modify these functions, especially the SQL queries, based on your project's requirements and design.
async function testOracleConnection() {
    return await withOracleDB(async (connection) => {
        return true;
    }).catch(() => {
        return false;
    });
}

async function fetchArtistsFromDB() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute('SELECT * FROM ARTISTX', [], {outFormat: oracledb.OUT_FORMAT_OBJECT});
        console.log(result.rows);
        return result.rows;
    }).catch(() => {
        console.log("could not fetch");
        return [];
    });
}

async function funFactArtistsDB() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `
            SELECT p.artistName
            FROM Plays p
            WHERE NOT EXISTS (
                SELECT i.instrumentName
                FROM Instrument i
                WHERE NOT EXISTS (
                    SELECT *
                    FROM Plays p2
                    WHERE p2.artistName = p.artistName AND p2.instrumentName = i.instrumentName
                )
            )
            `, [], {outFormat: oracledb.OUT_FORMAT_OBJECT});
        console.log(result.rows);
        return result.rows;
    }).catch(() => {
        console.log("could not fetch");
        return [];
    });
}

async function fetchCommentsFromDB() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute('SELECT * FROM THREAD', [], {outFormat: oracledb.OUT_FORMAT_OBJECT});
        return result.rows;
    }).catch(() => {
        console.log("could not fetch");
        return [];
    });
}

async function initiateDemotable() {
    return await withOracleDB(async (connection) => {
        try {
            await connection.execute(`DROP TABLE ARTISTX`);
            console.log("Dropped table");
        } catch(err) {
            console.log('Table might not exist, proceeding to create...');
        }
        const result = await connection.execute(`
            CREATE TABLE ARTISTX (
                artistName VARCHAR2(255) PRIMARY KEY,
                artistOrigin VARCHAR2(255),
                artistDescription CLOB,
                monthlyListeners NUMBER
            )
        `);
        return true;
    }).catch(() => {
        return false;
    });
}

async function deleteArtistDB(artistName) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            'DELETE FROM ARTISTX WHERE ARTISTNAME = :name',
            {name: artistName},
            {outFormat: oracledb.OUT_FORMAT_OBJECT, autoCommit: true}
        );
        console.log(result.rowsAffected);
        return true;
    }).catch(() => {
        return false;
    })
}

async function insertArtist(name, listeners, origin) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `INSERT INTO ARTISTX (artistName, artistOrigin) VALUES (:n, :o)`,
            {n: name, o: origin},
            { autoCommit: true }
        );

        return result.rowsAffected && result.rowsAffected > 0;
    }).catch(() => {
        console.log("could not insert");
        return false;
    });
}

async function addCommentDB(description, commentedBy) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `INSERT INTO THREAD (description, commentedBy) VALUES (:des, :author)`,
            {des: description, author: commentedBy},
            { autoCommit: true }
        );

        return result.rowsAffected && result.rowsAffected > 0;
    }).catch(() => {
        console.log("could not add");
        return false;
    });
}

async function updateNameDemotable(oldName, newName) {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute(
            `UPDATE DEMOTABLE SET name=:newName where name=:oldName`,
            [newName, oldName],
            { autoCommit: true }
        );

        return result.rowsAffected && result.rowsAffected > 0;
    }).catch(() => {
        return false;
    });
}

async function countDemotable() {
    return await withOracleDB(async (connection) => {
        const result = await connection.execute('SELECT Count(*) FROM DEMOTABLE');
        return result.rows[0][0];
    }).catch(() => {
        return -1;
    });
}

module.exports = {
    testOracleConnection,
    fetchArtistsFromDB,
    funFactArtistsDB,
    fetchCommentsFromDB,
    initiateDemotable,
    addCommentDB,
    insertArtist,
    deleteArtistDB,
    updateNameDemotable, 
    countDemotable
};