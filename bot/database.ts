import mysql, { Pool } from 'mysql';
import 'dotenv/config';

export const createCon: Pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: process.env.DB_PASS,
    database: "safeAgent",
    connectionLimit: 10, // Allows multiple queries without new connections
});

export const runQuery = (con: Pool, query: string, clgMessage: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        con.query(query, (err, result) => {
            if (err) return reject(err);
            console.log(clgMessage);
            resolve(result);
        });
    });
};

export const endCon = (con: Pool): void => {
    process.on('SIGINT', () => {
        con.end(err => {
            if (err) throw err;
            console.log("DB Connection closed!");
            process.exit(0);
        });
    });
};
