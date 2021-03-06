const glob = require('glob');
const { resolve } = require('path');
const { readFileSync, promises: fs } = require('fs');

const pkgFile = resolve(__dirname, '../package.json');
const varFile = resolve(__dirname, '../src/variable.json');
const cssFiles = glob
  .sync(resolve(__dirname, '../src/*.scss'))
  .filter((file) => !/template/.test(file))
  .sort((file1, file2) => {
    if (/\/vars.scss$/.test(file1)) return -1;
    if (/\/vars.scss$/.test(file2)) return 1;
    if (/\/common.scss$/.test(file1)) return -1;
    if (/\/common.scss$/.test(file2)) return 1;
    if (/main[\S]*.scss$/.test(file1)) return -1;
    if (/\/[\d]+.scss$/.test(file2)) return -1;
  });
const tmpFile = resolve(__dirname, '../src/_template.scss');

function createContent(tmp, contents) {
  const { title, version, description, repository, main } = require(pkgFile);
  const { preprocessor, vars } = require(varFile);
  const keys = Object.keys(vars);
  const variables = keys
    .map((key) => {
      const e = vars[key];
      let value;

      if (e.type !== 'select') {
        value = e.value;
      } else {
        if (Array.isArray(e.value)) {
          value = `[${e.value.map((o) => `"${o}"`)}]`;
        } else {
          value = `{\n  ${Object.keys(e.value)
            .map((o) => `"${o}": "${e.value[o]}"`)
            .join(',\n  ')}\n}`;
        }
      }

      return (
        `@var ${e.type} ${key} "${e.desc}" ` +
        // Wrap url(...) in quotes
        `${value.indexOf('url(') === 0 ? `"${value}"` : value}`
      );
    })
    .join('\n');

  const newVersion = version.split('.');
  newVersion[2] = +(newVersion[2] || 0) + 1;

  return [
    tmp
      .replace('{{title}}', title)
      .replace('{{version}}', newVersion.join('.'))
      .replace('{{description}}', description)
      .replace(/{{repository}}/g, repository)
      .replace('{{main}}', main)
      .replace('{{preprocessor}}', preprocessor)
      .replace('{{variables}}', variables),
    contents,
  ].join('');
}

fs.readFile(tmpFile, 'utf8').then((tmp) => {
  let contents = [];
  cssFiles.forEach((cssFile) => {
    contents.push(readFileSync(cssFile, 'utf8'));
  });

  const { main } = require(pkgFile);

  fs.writeFile(
    resolve(__dirname, `../${main}`),
    createContent(tmp, contents.join('\n'))
  );

  console.log('done!!');
});
