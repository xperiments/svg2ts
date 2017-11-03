import * as fs from 'fs';
import * as path from 'path';
import * as ProgressBar from 'progress';
import {
    toCamelCase,
    capitalize,
    printObj,
    walkSync,
    minifySvg
} from './utils';
import { banner } from './banner';

export interface SVG2TSContext {
    [key: string]: string | number;
}
export interface SVG2TSDimensions {
    width: number | undefined;
    height: number | undefined;
}
export interface SVG2TSSourceFile {
    name: string;
    file: string;
    path: string;
}
export interface SVG2TSOutputFile extends SVG2TSDimensions, SVG2TSSourceFile {
    viewBox?: SVG2TSDimensions | undefined;
    contextInterface?: string | undefined;
    contextDefaults?: { [key: string]: string | number } | undefined;
}
export interface SVG2TSSvgMetadata {
    width?: number | undefined;
    height?: number | undefined;
    viewBox?: SVG2TSDimensions | undefined;
}

const svgReg = /<svg[^>]+[^>]*>/;
const extractorRegExps = {
    root: /<svg\s[^>]+>/,
    width: /\bwidth ?= ?(['"])([^%]+?)\1/,
    height: /\bheight ?= ?(['"])([^%]+?)\1/,
    viewBox: /\bviewBox ?= ?(['"])(.+?)\1/
};

function isSVG(buffer: string) {
    return svgReg.test(buffer);
}

function parseViewbox(viewBox: any): SVG2TSDimensions {
    const bounds = viewBox.split(' ');
    const width = parseInt(bounds[2], 10);
    const height = parseInt(bounds[3], 10);
    return { width, height };
}

function parseAttributes(root: any): SVG2TSSvgMetadata {
    const width = root.match(extractorRegExps.width);
    const height = root.match(extractorRegExps.height);
    const viewBox = root.match(extractorRegExps.viewBox);
    return {
        ...width ? { width: parseInt(width[2], 10) } : Object.create(null),
        ...height ? { height: parseInt(height[2], 10) } : Object.create(null),
        ...viewBox ? { viewBox: parseViewbox(viewBox[2]) } : Object.create(null)
    };
}

function getSvgDimensions(attrs: any): SVG2TSSvgMetadata {
    const { width, height } = attrs;
    return {
        width,
        height,
        ...attrs.viewBox ? { viewBox: attrs.viewBox } : Object.create(null)
    };
}

function getSvgDimensionsFromViewBox(attrs: any): SVG2TSSvgMetadata {
    const ratio = attrs.viewBox.width / attrs.viewBox.height;
    if (attrs.width) {
        return {
            width: attrs.width,
            height: Math.floor(attrs.width / ratio),
            ...attrs.viewBox ? { viewBox: attrs.viewBox } : Object.create(null)
        };
    }
    if (attrs.height) {
        return {
            width: Math.floor(attrs.height * ratio),
            height: attrs.height,
            ...attrs.viewBox ? { viewBox: attrs.viewBox } : Object.create(null)
        };
    }

    return {
        viewBox: {
            width: attrs.viewBox.width,
            height: attrs.viewBox.height
        }
    };
}

function getSvgMetadata(svgFile: SVG2TSSourceFile) {
    const buffer = svgFile.file;
    const root = buffer.match(extractorRegExps.root);
    if (root) {
        const attrs = parseAttributes(root[0]);
        if (attrs.width && attrs.height) {
            return getSvgDimensions(attrs);
        }
        if (attrs.viewBox) {
            return getSvgDimensionsFromViewBox(attrs);
        }
    }
    console.log(
        `[svg2ts] \x1b[31mUnable to determine dimensions of: \x1b[33m${svgFile.path}\x1b[0m`
    );
    return Object.create(null);
}

function getOutputTemplate(svgFile: SVG2TSOutputFile) {
    const contextInterface = svgFile.contextInterface;
    if (contextInterface) {
        delete svgFile.contextInterface;
    }
    // prettier-ignore
    const interfaceOutput =
        contextInterface
        ? `export interface ${capitalize(toCamelCase(svgFile.name))}Context ${contextInterface};`
        : '';
    // prettier-ignore
    return `${interfaceOutput}export const ${capitalize(toCamelCase(svgFile.name))} = ${printObj(svgFile)};`;
}

function contextDefinitionReducer(acc: any, match: string) {
    const reg = /\${(.+?)\|(.+?)}/g;
    const value = match.replace(reg, '$1');
    acc[match.replace(reg, '$2') + '?'] = isNaN((<any>value) as number)
        ? 'string'
        : 'number';
    return acc;
}

function getContextDefinition(file: string) {
    const reg = /\${(.+?)\|(.+?)}/g;
    const hasDynamicData = file.match(reg);

    if (hasDynamicData) {
        const matches = <RegExpMatchArray>file.match(reg);
        const result = matches.reduce(
            contextDefinitionReducer,
            Object.create(null)
        );
        return JSON.stringify(result)
            .replace(/"/g, '')
            .replace(/,/g, ';');
    } else {
        return undefined;
    }
}

function contextDefaultsReducer(acc: any, match: string) {
    const reg = /\${(.+?)\|(.+?)}/g;
    const value = match.replace(reg, '$1');
    acc[match.replace(reg, '$2')] = value;
    return acc;
}

function getContextDefaults(file: string): SVG2TSContext | undefined {
    const reg = /\${(.+?)\|(.+?)}/g;
    const hasDynamicData = file.match(reg);
    const matches = <RegExpMatchArray>file.match(reg);
    if (hasDynamicData) {
        return matches.reduce(contextDefaultsReducer, Object.create(null));
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
    const { path, name, file } = fileObj;
    return {
        ...width ? { width: width } : Object.create(null),
        ...height ? { height: height } : Object.create(null),
        ...viewBox && viewBox.width && viewBox.height
            ? { viewBox: viewBox }
            : Object.create(null),
        path,
        name,
        file,
        ...contextInterface
            ? { contextInterface: contextInterface }
            : Object.create(null),
        ...contextDefaults
            ? { contextDefaults: contextDefaults }
            : Object.create(null)
    };
}

function saveTypescriptFile(output: string) {
    return (svgFile: SVG2TSOutputFile) => {
        const rootBase = path
            .dirname(svgFile.path as string)
            .split(path.sep)
            .slice(2);
        const filePath = output + path.sep + svgFile.name + '.ts';
        const destBase = path.dirname(filePath);
        if (!fs.existsSync(destBase)) {
            fs.mkdirSync(destBase);
        }
        delete svgFile.path;
        svgFile.file = minifySvg(svgFile.file);
        fs.writeFileSync(filePath, getOutputTemplate(svgFile));
    };
}

function hasKnownDimensions(fileObj: SVG2TSSourceFile) {
    const { width, height, viewBox } = getSvgMetadata(fileObj);
    return (width && height) || (viewBox && viewBox.width && viewBox.height);
}
export function svg2ts(input: string, output: string) {
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
        realSvgFiles
            .map(getTypescriptOutputMetadata)
            .forEach(saveTypescriptFile(output));
        console.log(
            `[svg2ts]\x1b[35m Processed \x1b[0m${realSvgFiles.length}\x1b[35m svg's into: \x1b[0m${output}\x1b[0m`
        );
    }
}
