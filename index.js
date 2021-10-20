const pg = require("./pg");
const configGenerator = require("./configGenerator");
const formatter = require("./formatter");
const fs = require("fs");
const path = require("path");
const _ = require("lodash/fp");

const prepare = _.pipe(
    configGenerator.generateConfig,
    configGenerator.generatePgMigrate,
    configGenerator.replaceMarkupValues
)

const main = async () => {
    const schema = await pg.getSchema();

    const text = prepare(schema);

    const formattedText = await formatter.format(text);

    await fs.promises.writeFile(path.join(__dirname, "migrate.js"), formattedText[0].output);
}

main();