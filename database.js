import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
import { types } from 'pg';

types.setTypeParser(20, val => parseInt(val)); // para inteiros grandes

const {Pool} = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

export default pool;