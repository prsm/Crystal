import { LockChannelHandler } from './../handlers/lockChannelHandler';
import { Message, Client, TextChannel } from 'discord.js';
import moment, { min } from 'moment';

import { Bot } from '../bot';
import { BotCommand } from '../customInterfaces';
import config from '../config';

export default class lockChannelCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 9,
        name: 'lockchannel',
        category: 'Tools',
        description: 'Lock a text channel for a specific time.',
        argsRequired: true,
        admin: false,
        aliases: ['lc'],
        usage: 'lockchannel {minutes}',
        examples: ['lockchannel 30'],
        showInHelp: true
    }

    private _lockChannelHandler: LockChannelHandler;

    constructor(private _bot: Bot) {
        this._lockChannelHandler = this._bot.getLockChannelHandler();
    }

    public async execute(msg: Message, args: string[]) {
        const permissionsOfMember = msg.member.permissionsIn(msg.channel);
        if (!permissionsOfMember.has("MANAGE_CHANNELS")) {
            msg.channel.send(`:no_entry_sign: You don't have the manage channel permission for ${msg.channel.toString()}`);
            return;
        }
        const minutes = parseInt(args[0], 10);
        if (!minutes) {
            msg.channel.send(`:no_entry_sign: Cannot parse argument \`${args[0]}\` to a number.`);
            return;
        }
        if (minutes > 1440) {
            msg.channel.send(`:no_entry_sign: Sorry, you can lock a text channel for a maximum of **24 hours** (1440 minutes).`);
            return;
        }
        const endTime = moment().add(minutes, 'minutes');
        await this._lockChannelHandler.lockChannel(msg.channel as TextChannel, msg.author, endTime.toDate(), minutes);
    }
}