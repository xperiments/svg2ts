import * as fs from 'fs';
import { SVG2TSCmd, SVG2TSOutputFile } from './types';
import { banner } from './utils/banner';
import { generateDotFile, loadSvgFile, walkSync } from './utils/core';
import { getSVG2TSOutputFile } from './utils/reflection';
import { filterKnownDimensions, filterSvg, filterSvgContent } from './utils/svg';

export function svg2ts(options: SVG2TSCmd) {
  const { input, output, blueprint } = options;

  return new Promise((resolve, reject) => {
    try {
      // print svg banner
      banner.forEach(_ => console.log(_));

      // checks if input dir exists
      if (!fs.existsSync(input)) {
        console.log(`Invalid input dir: ${input}`);
      } else {
        console.log('[svg2ts]\x1b[35m Converting svg to TypesScript\x1b[0m');

        // dynamically load saveFile & generateIndexFile
        // from the selected blueprint
        const {
          saveFile,
          generateIndexFile
        }: {
          saveFile: (options: SVG2TSCmd) => (svgFile: SVG2TSOutputFile) => void;
          generateIndexFile: (options: SVG2TSCmd, files: Array<SVG2TSOutputFile>) => void;
        } = require(`./blueprints/${blueprint}`);

        // get svg files inside input folder filtered by extension
        const files = walkSync(input).filter(filterSvg);

        const validSvgFiles = files
          // load each svg file
          .map(loadSvgFile(options))
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
          `[svg2ts]\x1b[35m Processed \x1b[0m${validSvgFiles.length}\x1b[35m svg's into: \x1b[0m${output}\x1b[0m`
        );
        resolve();
      }
    } catch (e) {
      reject(e);
    }
  });
}
