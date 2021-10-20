const { ESLint } = require("eslint");

const format = async (unformattedText) => {
    const eslint = new ESLint({ fix: true });

    return eslint.lintText(unformattedText);
}

module.exports = {
    format
};