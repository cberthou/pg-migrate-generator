const _ = require("lodash/fp");

const replaceMarkup = (id) => `%replace-markup-${id}%`;

const translations = {
    int4: "integer"
}

const translateType = (type) => translations[type] || type;

const isNullable = (column) => column.is_nullable === "YES";
const getColumnName = (column) => column.column_name;
const getColumnRawType = (column) => column.udt_name;

const getColumnType = (column) => {
    if ((getColumnRawType(column) === "varchar" || getColumnRawType(column) === "char") && column.character_maximum_length) {
        return `${column.udt_name}(${column.character_maximum_length})`
    }
    return translateType(getColumnRawType(column));
}
const getTableName = (column) => column.table_name;

const isText = (column) => {
    const type = getColumnRawType(column);

    return type === "string" || type === "text" || type === "char" || type === "varchar";
}

const isNumber = (column) => {
    const type = getColumnRawType(column);

    return type === "numeric" || type === "integer";
}

const numericDefaultRegex = /'([0-9]*)'::[a-z]*/

const getColumnDefault = (column) => {
    if (column.column_default === null) {
        return undefined;
    }

    if (isText(column) && column.column_default && column.column_default.startsWith("NULL")) {
        return null;
    }

    if (isNumber(column) && column.column_default !== null) {
        const match = numericDefaultRegex.exec(column.column_default);
        return  match ? +match[1] : +column.column_default;
    }

    return column.column_default;
}

const removeEmptyValues = _.pickBy(value => {
    return value !== "" && value !== undefined;
});

const getColumnConfig = (column) => {
    console.log(column, isNullable(column));
    if (isNullable(column) && getColumnDefault(column) === undefined) {
        return getColumnType(column)
    }

    const config = {
        type: getColumnType(column),
        default: getColumnDefault(column),
        notNull: !isNullable(column)
    };

    if (config.default && config.default.startsWith("nextval") && config.type === "integer") {
        return "id";
    }

    if (config.default === "uuid_generate_v4()") {
        return replaceMarkup("uuid");
    }

    return removeEmptyValues(config);
}

const generateConfig = (pgConfig) =>
    pgConfig.map(columns => ({
        tableName: getTableName(columns[0]),
        columns: columns.map((column) => ({
            name: getColumnName(column),
            config: getColumnConfig(column)
        })).reduce((acc, column) => {
            acc[column.name] = column.config;
            return acc;
        },{})
    }));


const generateTable = (tableConfig) => `pgm.createTable("${tableConfig.tableName}", ${JSON.stringify(tableConfig.columns)});`;

const generatePgMigrateUp = (config) => config.map(tableConfig => generateTable(tableConfig)).join("\n\n");

const generatePgMigrateDown = (config) => config.map(tableConfig => `pgm.dropTable("${tableConfig.tableName}");`).join("\n\n")

const generatePgMigrate = (config) => `exports.up = (pgm) => {
  ${generatePgMigrateUp(config)}
}
exports.down = (pgm) => {
${generatePgMigrateDown(config)}
}
`;

const uuidGenerator = () => `{
  type: "uuid",
  notNull: true,
  default: new PgLiteral('uuid_generate_v4()')
}`

const replaceMarkupValues = (text) => text.replace(new RegExp(`"${replaceMarkup("uuid")}"`, "mg"), uuidGenerator());

module.exports = {
    generateConfig,
    generatePgMigrate,
    replaceMarkupValues
};
