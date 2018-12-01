import * as fs from 'fs';
import { SVG2TSCmd } from './types';
import { banner } from './utils/banner';
import { loadSvgFile, walkSync } from './utils/core';
import { getSVG2TSOutputFile } from './utils/reflection';
import { filterKnownDimensions, filterSvg, filterSvgContent } from './utils/svg';

export function svg2ts(options: SVG2TSCmd) {
  const { input, output, blueprint } = options;
  banner.forEach(_ => console.log(_));
  if (!fs.existsSync(input)) {
    console.log(`Invalid input dir: ${input}`);
  } else {
    console.log('[svg2ts]\x1b[35m Converting svg to TypesScript\x1b[0m');

    const { saveFile, generateIndexFile } = require(`./blueprints/${blueprint}`);

    const files = walkSync(input).filter(filterSvg);

    const svgFiles = files
      .map(loadSvgFile(options))
      .filter(filterSvgContent)
      .filter(filterKnownDimensions);

    const tsMetadata = svgFiles.map(getSVG2TSOutputFile);

    tsMetadata.forEach(saveFile(options, blueprint));

    generateIndexFile(options, tsMetadata);

    console.log(`[svg2ts]\x1b[35m Processed \x1b[0m${svgFiles.length}\x1b[35m svg's into: \x1b[0m${output}\x1b[0m`);
  }
}
