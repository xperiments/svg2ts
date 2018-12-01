import * as fs from 'fs';
import * as path from 'path';
import { SVG2TSCmd, SVG2TSOutputFile } from '../types';
import { mkdirRecursiveSync, printObj } from '../utils/core';
import { pascalCase } from '../utils/strings';
import { compactSVG, generateTSInterface } from '../utils/svg';

export function render(svgFile: SVG2TSOutputFile, options: SVG2TSCmd) {
  const contextInterface = generateTSInterface(svgFile.contextInterface);

  if (contextInterface) {
    delete svgFile.contextInterface;
  }

  // prettier-ignore
  const interfaceOutput =
        contextInterface
        ? `export interface ${pascalCase(svgFile.name)}Context ${contextInterface};`
        : '';
  // prettier-ignore
  return `${interfaceOutput}export const ${pascalCase(svgFile.name)} = ${printObj(svgFile)};`;
}

export function saveFile(options: SVG2TSCmd, blueprint: string) {
  return (svgFile: SVG2TSOutputFile) => {
    const filePath = options.output + path.sep + svgFile.name + '.ts';
    delete svgFile.path;
    svgFile.svg = compactSVG(svgFile.svg);
    mkdirRecursiveSync(path.dirname(filePath));
    fs.writeFileSync(filePath, render(svgFile, options));
  };
}

export function generateIndexFile(options: SVG2TSCmd, files: Array<SVG2TSOutputFile>) {
  const filePath = options.output + path.sep + 'index.ts';
  const indexFileContents = files
    .map((file: SVG2TSOutputFile) => {
      const svgObjectName = pascalCase(file.name);
      const context = file.contextDefaults ? `, ${svgObjectName}Context` : '';
      return `export { ${svgObjectName}${context} } from './${file.name}';`;
    })
    .join('\n');
  mkdirRecursiveSync(options.output + path.sep);
  fs.writeFileSync(filePath, indexFileContents);
}
