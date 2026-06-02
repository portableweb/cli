#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init";
import { packCommand } from "./commands/pack";
import { unpackCommand } from "./commands/unpack";
import { openCommand } from "./commands/open";
import { validateCommand } from "./commands/validate";

const program = new Command();

program
  .name("pweb")
  .description("Create, pack, and open .pweb bundles")
  .version("0.1.0");

program.addCommand(initCommand);
program.addCommand(packCommand);
program.addCommand(unpackCommand);
program.addCommand(openCommand);
program.addCommand(validateCommand);

program.parse();
