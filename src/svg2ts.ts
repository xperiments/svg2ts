import * as fs from 'fs';
import * as path from 'path';
import * as ProgressBar from 'progress';
import {
    capitalize,
    dotObject,
    minifySvg,
    printObj,
    removeDefaultsFromVars,
    toCamelCase,
    walkSync
} from './utils';
import { banner } from './banner';
import {
    SVG2TSDimensions,
    SVG2TSSvgMetadata,
    SVG2TSSourceFile,
    SVG2TSOutputFile,
    SVG2TSContext
} from './types';
import { Svg2TsCmd } from './index';
import { isSVG, parseViewbox, getSvgMetadata } from './svg';

function contextDefinitionReducer(acc: any, match: string) {
    const reg = /\{{(.+?)\|(.+?)}}/g;
    const value = match.replace(reg, '$1');
    dotObject(
        `dot.${match.replace(reg, '$2')}`,
        acc,
        isNaN((<any>value) as number) ? 'string' : 'number'
    );
    return acc;
}

function getContextDefinition(file: string) {
    const reg = /\{{(.+?)\|(.+?)}}/g;
    const hasDynamicData = file.match(reg);

    if (hasDynamicData) {
        const matches = <RegExpMatchArray>file.match(reg);
        const result = matches.reduce(contextDefinitionReducer, {});
        return JSON.stringify(result)
            .replace(/"/g, '')
            .replace(/,/g, ';');
    } else {
        return undefined;
    }
}

function contextDefaultsReducer(acc: any, match: string) {
    const reg = /\{{(.+?)\|(.+?)}}/g;
    const value = match.replace(reg, '$1');
    dotObject(
        `dot.${match.replace(reg, '$2')}`,
        acc,
        isNaN((<any>value) as number) ? value : parseInt(value, 10)
    );
    return acc;
}

function getContextDefaults(file: string): SVG2TSContext | undefined {
    const reg = /\{{(.+?)\|(.+?)}}/g;
    const hasDynamicData = file.match(reg);
    const matches = <RegExpMatchArray>file.match(reg);
    if (hasDynamicData) {
        return matches.reduce(contextDefaultsReducer, {});
    } else {
        return undefined;
    }
}

function filterSvg(file: string) {
    return file.includes('svg') && path.extname(file) === '.svg';
}

function filterSvgContent(svgFilePath: SVG2TSSourceFile): boolean {
    return isSVG(svgFilePath.file);
}

function loadSvgFile(fileName: string): SVG2TSSourceFile {
    const svg = fs.readFileSync(fileName, 'utf8').replace(/\r?\n|\r/g, '');
    return {
        path: fileName,
        name: path.basename(fileName).replace('.svg', ''),
        file: svg
    };
}

function getTypescriptOutputMetadata(
    fileObj: SVG2TSSourceFile
): SVG2TSOutputFile {
    const { width, height, viewBox } = getSvgMetadata(fileObj);
    const contextInterface = getContextDefinition(fileObj.file);
    const contextDefaults = getContextDefaults(fileObj.file);
    const { path, name } = fileObj;
    let { file } = fileObj;
    if (contextInterface) {
        file = removeDefaultsFromVars(file);
    }
    file = file.replace(/'/g, "\\'");
    return {
        ...width ? { width: width } : {},
        ...height ? { height: height } : {},
        ...viewBox && viewBox.width && viewBox.height
            ? { viewBox: viewBox }
            : {},
        path,
        name,
        file,
        ...contextInterface ? { contextInterface: contextInterface } : {},
        ...contextDefaults ? { contextDefaults: contextDefaults } : {}
    };
}

function hasKnownDimensions(fileObj: SVG2TSSourceFile) {
    const { width, height, viewBox } = getSvgMetadata(fileObj);
    return (width && height) || (viewBox && viewBox.width && viewBox.height);
}

export function svg2ts(options: Svg2TsCmd) {
    const { input, output, blueprint, module } = options;
    banner.forEach(_ => console.log(_));
    if (!fs.existsSync(input)) {
        console.log(`Invalid input dir: ${input}`);
    } else {
        console.log('[svg2ts]\x1b[35m Converting svg to TypesScript\x1b[0m');
        const files = walkSync(input).filter(filterSvg);
        const realSvgFiles = files
            .map(loadSvgFile)
            .filter(filterSvgContent)
            .filter(hasKnownDimensions);
        const tsMetadata = realSvgFiles.map(getTypescriptOutputMetadata);
        const {
            saveFile,
            generateIndexFile
        } = require(`./blueprints/${blueprint}`);
        tsMetadata.forEach(saveFile(options, blueprint));

        generateIndexFile(options, tsMetadata);

        console.log(
            `[svg2ts]\x1b[35m Processed \x1b[0m${realSvgFiles.length}\x1b[35m svg's into: \x1b[0m${output}\x1b[0m`
        );
    }
}
