#!/usr/bin/env node
import { CommandLineTools } from './cmd';
import { svg2ts } from './svg2ts';
import { banner } from './banner';
const packageJson = require('../package.json');

export interface Svg2TsCmd {
    output: string;
    input: string;
}

function main() {
    const args = process.argv.slice(2);

    const commandLineToolsOptions = {
        aliases: {
            output: 'o',
            input: 'i'
        },
        help: {
            input: 'svg source dir|./svg',
            output: 'ts output dir|./svg-ts-out'
        },
        // prettier-ignore
        banner: banner,
        version: packageJson.version
    };
    const cmd = new CommandLineTools<Svg2TsCmd>(
        'svg2ts',
        args,
        commandLineToolsOptions
    );
    if (!cmd.args.input || !cmd.args.output) {
        return cmd.help();
    } else {
        svg2ts(cmd.args.input, cmd.args.output);
    }
}
main();
