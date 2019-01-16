import * as fs from 'fs';
import * as path from 'path';
import { SVG2TSCmd, SVG2TSConfigFile, SVG2TSConfigProject, SVG2TSOutputFile } from './types';
import { loadSvgFile, walkSync } from './utils/core';
import { getSVG2TSOutputFile } from './utils/reflection';
import { filterKnownDimensions, filterSvg, filterSvgContent } from './utils/svg';
import fg = require('fast-glob');

export function svg2ts(options: SVG2TSCmd) {
  const { input, config } = options;

  return new Promise((resolve, reject) => {
    try {
      if (config) {
        const projects = (config as SVG2TSConfigFile).projects;
        projects.forEach(project => {
          project.output = path.resolve(process.cwd(), project.output);

          const files = fg.sync(project.files, {
            transform: entry => (typeof entry === 'string' ? entry : entry.path)
          });

          processSvgFiles(files, project, resolve);
        });

        return;
      } else {
        if (!fs.existsSync(input) && !config) {
          console.log(`Invalid input dir: ${input}`);
        } else {
          const files = walkSync(input).filter(filterSvg);
          console.log('[svg2ts]\x1b[35m Converting svg to TypesScript\x1b[0m');
          processSvgFiles(files, options, resolve);
        }
      }
    } catch (e) {
      reject(e);
    }
  });
}

function processSvgFiles(files: Array<string>, options: SVG2TSConfigProject | SVG2TSCmd, resolve: Function) {
  // dynamically load saveFile & generateIndexFile
  // from the selected blueprint

  const {
    saveFile,
    generateIndexFile,
    generateDotFile
  }: {
    saveFile: (options: SVG2TSCmd | SVG2TSConfigProject) => (svgFile: SVG2TSOutputFile) => void;
    generateIndexFile: (options: SVG2TSCmd | SVG2TSConfigProject, files: Array<SVG2TSOutputFile>) => void;
    generateDotFile: (options: SVG2TSCmd | SVG2TSConfigProject, files: Array<SVG2TSOutputFile>) => void;
  } = require(`./blueprints/${options.blueprint}`);

  // get svg files inside input folder filtered by extension

  const validSvgFiles = files
    // load each svg file
    .map(loadSvgFile())
    // filter ones where content seems a svg file
    .filter(filterSvgContent)
    // filter ones where dimensions are known by (width/height) or viewBox
    .filter(filterKnownDimensions);

  // get a SVG2TSOutputFile array from each of the valid svg files
  const outputSvgFiles = validSvgFiles.map(getSVG2TSOutputFile);

  // for SVG2TSOutputFile process it with
  // the current blueprint
  outputSvgFiles.forEach(saveFile(options));

  // generate a barrel index file of the assets
  generateIndexFile(options, outputSvgFiles);

  // generate the library module.svgts
  generateDotFile(options, outputSvgFiles);

  console.log(
    `[svg2ts]\x1b[35m Processed \x1b[0m${validSvgFiles.length}\x1b[35m svg's into: \x1b[0m${options.output}\x1b[0m`
  );
  resolve();
}
