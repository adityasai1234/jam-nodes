#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import {
  listCommand,
  runCommand,
  initCommand,
  credentialsCommand,
} from './commands/index.js';

const program = new Command()
  .name('jam-playground')
  .description('Test jam-nodes interactively')
  .version('0.1.0');

// Add commands
program.addCommand(listCommand);
program.addCommand(runCommand);
program.addCommand(initCommand);
program.addCommand(credentialsCommand);

// Default action (no command) - show help
program.action(() => {
  console.log();
  console.log(chalk.bold.cyan('  jam-nodes Playground'));
  console.log(chalk.dim('  Test workflow nodes interactively'));
  console.log();
  program.outputHelp();
});

// Parse arguments
program.parse();
