import * as fs from 'fs';
import * as path from 'path';

import { SVG2TSCmd } from './types';
import { loadSvgFile, walkSync } from './utils/core';
import {
    filterKnownDimensions,
    filterSvg,
    filterSvgContent
} from './utils/svg';
import { getSVG2TSOutputFile } from './utils/reflection';

import { banner } from './utils/banner';

export function svg2ts(options: SVG2TSCmd) {
    const { input, output, blueprint, module } = options;
    banner.forEach(_ => console.log(_));
    if (!fs.existsSync(input)) {
        console.log(`Invalid input dir: ${input}`);
    } else {
        console.log('[svg2ts]\x1b[35m Converting svg to TypesScript\x1b[0m');
        const {
            saveFile,
            generateIndexFile
        } = require(`./blueprints/${blueprint}`);

        const files = walkSync(input).filter(filterSvg);

        const realSvgFiles = files
            .map(loadSvgFile(options))
            .filter(filterSvgContent)
            .filter(filterKnownDimensions);

        const tsMetadata = realSvgFiles.map(getSVG2TSOutputFile);

        tsMetadata.forEach(saveFile(options, blueprint));

        generateIndexFile(options, tsMetadata);

        console.log(
            `[svg2ts]\x1b[35m Processed \x1b[0m${realSvgFiles.length}\x1b[35m svg's into: \x1b[0m${output}\x1b[0m`
        );
    }
}
