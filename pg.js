const { Client } = require("pg");

const client = new Client({
    host: "localhost",
    user: "postgres",
    password: "root",
    database: "fce",
    ssl: false,
});

const clientConnection = client.connect();

const configColums = [
    "table_name",
    "column_name",
    "column_default",
    "is_nullable",
    "data_type",
    "character_maximum_length",
    "udt_name"
];

const getConfig = (tableName) => client.query(`SELECT ${configColums.join(", ")} FROM information_schema.columns WHERE table_name = '${tableName}'`);

const getSchema = async () => {
    await clientConnection;

    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema='public'");

    const tableConfs = await Promise.all(res.rows.filter(({ table_name }) => table_name.indexOf("temp_") !== 0)
        .map(({ table_name }) => table_name)
        .filter(tableName => tableName !== "pgmigrations")
        .map(getConfig)
    );

    return tableConfs.map(res => res.rows);
}

module.exports = {
    getSchema
};


