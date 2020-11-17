import { ModHandler } from './../handlers/modHandler';
import { Message } from 'discord.js';

import { Bot } from '../bot';
import { BotCommand } from '../customInterfaces';
import config from '../config';

export default class mod implements BotCommand {
    public information: BotCommand['information'] = {
        id: 10,
        name: 'mod',
        category: 'Tools',
        description: 'Moderation interface',
        argsRequired: false,
        admin: true,
        aliases: [],
        usage: 'mod',
        examples: ['mod'],
        showInHelp: true
    }

    constructor(private _bot: Bot) { }

    public async execute(msg: Message, args: string[]) {
        // only in moderation channel allowed
        if (msg.channel.id !== config.moderationChannelID) {
            msg.channel.send(':x: Command is only allowed in the moderation channel.');
            return;
        }
        const modHandler = new ModHandler(this._bot, msg.member);
        modHandler.startInterface();
    }
}