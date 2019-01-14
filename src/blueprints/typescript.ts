import * as fs from 'fs';
import * as path from 'path';
import { SVG2TSCmd, SVG2TSConfigProject, SVG2TSOutputFile } from '../types';
import { mkdirRecursiveSync, printObj } from '../utils/core';
import { getTypescriptInterfaceDescriptor } from '../utils/reflection';
import { pascalCase } from '../utils/strings';
import { compactSVG } from '../utils/svg';

/**
 * Renders the final string output of the asset file
 *
 * @export
 * @param {SVG2TSOutputFile} svgFile
 * @param {SVG2TSCmd} options
 * @returns {string}
 */
export function render(svgFile: SVG2TSOutputFile, options: SVG2TSCmd | SVG2TSConfigProject): string {
  const contextInterface = getTypescriptInterfaceDescriptor(svgFile.contextInterface);

  if (contextInterface) {
    delete svgFile.contextInterface;
  }

  const interfaceOutput = contextInterface
    ? `export interface ${pascalCase(svgFile.name)}Context ${contextInterface};`
    : '';

  return `${interfaceOutput}export const ${pascalCase(svgFile.name)}: SVG2TSFile = ${printObj(svgFile)};`;
}

/**
 * Typescript blueprint saveFile method
 *
 * @export
 * @param {SVG2TSCmd} options
 * @returns
 */
export function saveFile(options: SVG2TSCmd | SVG2TSConfigProject) {
  return (svgFile: SVG2TSOutputFile) => {
    const filePath = options.output + path.sep + svgFile.name + '.ts';
    // delete path from resulting object
    delete svgFile.path;
    // compact svg file
    svgFile.svg = compactSVG(svgFile.svg);
    // create file path route if not exist
    mkdirRecursiveSync(path.dirname(filePath));
    // save final file
    fs.writeFileSync(filePath, render(svgFile, options));
  };
}

/**
 * Generates the typescript blueprint index file
 *
 * @export
 * @param {SVG2TSCmd} options
 * @param {Array<SVG2TSOutputFile>} files
 */
export function generateIndexFile(options: SVG2TSCmd | SVG2TSConfigProject, files: Array<SVG2TSOutputFile>) {
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

  fs.writeFileSync(
    `${options.output}${path.sep}types.d.ts`,
    `interface SVG2TSDimensions {
  height?: number | undefined;
  minx?: number | undefined;
  miny?: number | undefined;
  width?: number | undefined;
}

interface SVG2TSFile {
  contextDefaults?: { [key: string]: string | number } | undefined;
  css?: string;
  height?: string | undefined;
  name: string;
  svg: string;
  svgHash: string;
  viewBox?: SVG2TSDimensions | undefined;
  width?: string | undefined;
}
    `
  );
}

export function generateDotFile(options: SVG2TSCmd | SVG2TSConfigProject, files: Array<SVG2TSOutputFile>) {
  const filePath = `${options.output}${path.sep}${options.module}.svgts`;

  const exports = files.map(file => file.name);

  fs.writeFileSync(filePath, JSON.stringify({ exports, files, module: options.module }, null, 2), 'utf-8');
}
