import { RedisCommandDoc } from './types';
import { BASIC_REDIS_COMMANDS } from './basicCommands';
import { DATA_STRUCTURE_COMMANDS } from './dataStructureCommands';
import { SERVER_COMMANDS } from './serverCommands';

export const REDIS_COMMAND_DOCS: RedisCommandDoc[] = [
  ...BASIC_REDIS_COMMANDS,
  ...DATA_STRUCTURE_COMMANDS,
  ...SERVER_COMMANDS,
];

export { BASIC_REDIS_COMMANDS, DATA_STRUCTURE_COMMANDS, SERVER_COMMANDS };
export type { RedisCommandDoc };
