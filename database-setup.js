import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';


 const {Pool} = pg;
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL
    });

let client;
async function connect(){
    try {
        client = await pool.connect();
        console.log('conectado ao banco de dados');

        const res = await client.query('SELECT NOW()');
        console.log(res.rows[0]);

    } catch(err) {
        console.error('erro ao conectar ao banco de dados: ', err)
    } finally {
        if(client) {
            client.release();
            console.log('conexão liberada');
        }
        await pool.end();
        console.log('pool fechada');
    }
};

connect();