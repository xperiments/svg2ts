#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { svg2ts } from './svg2ts';
import { SVG2TSCmd } from './types';
import { banner } from './utils/banner';
import { CommandLineTools } from './utils/cmd';

const packageJson = require('../package.json');

export * from './svg2ts';

/**
 * Main command line entry point
 *
 * @returns
 */
function main() {
  const args = process.argv.slice(2);

  const commandLineToolsOptions = {
    aliases: {
      output: 'o',
      input: 'i',
      blueprint: 'b',
      module: 'm',
      config: 'c'
    },
    help: {
      input: 'svg source dir|./svg',
      output: 'ts output dir|./svg-ts-out',
      blueprint: "blueprint to use 'typescript'[default] 'angular' |typescript",
      module: 'Module name for angular blueprint |svg-to-ts',
      config: 'Provide a external config file |svgts.json'
    },
    banner: banner,
    version: packageJson.version
  };

  const cmd = new CommandLineTools<SVG2TSCmd>('svg2ts', args, commandLineToolsOptions);

  if (!cmd.args.input && !cmd.args.output && !cmd.args.config) {
    if (fs.existsSync(path.resolve(process.cwd(), 'svg2ts.json'))) {
      cmd.args.config = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'svg2ts.json'), 'utf8'));
    } else {
      return cmd.help();
    }
  } else {
    if (cmd.args.config) {
      if (fs.existsSync(path.resolve(process.cwd(), cmd.args.config as string))) {
        cmd.args.config = JSON.parse(fs.readFileSync(cmd.args.config as string, 'utf8'));
      } else {
        return cmd.help();
      }
    }
  }

  cmd.args.blueprint = cmd.args.blueprint || 'typescript';
  cmd.args.module = cmd.args.module || 'svg-to-ts';
  svg2ts(cmd.args);
}

// run main process
main();
