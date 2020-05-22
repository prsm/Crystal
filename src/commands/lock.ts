import { Message } from 'discord.js';

import { Bot } from '../bot';
import { BotCommand } from '../customInterfaces';
import config from '../config';

export default class lockCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 5,
        name: 'lock',
        category: 'Dynamic Channels',
        description: 'Lock your voice channel to a specific amount of users. No limit or 0 unlocks the channel.',
        argsRequired: false,
        admin: false,
        aliases: ['l'],
        usage: 'lock [number]',
        examples: ['lock 2', 'lock (to unlock)'],
        showInHelp: true
    }

    constructor(private _bot: Bot) { }

    public async execute(msg: Message, args: string[]) {
        // check if user is in a vocie channel
        if (!msg.member.voice.channelID) {
            msg.channel.send(':x: You aren\'t in a voice channel.');
            return;
        }
        // check if user is in a dynamic voice channel
        if (msg.member.voice.channel.parentID !== config.dynamicVoiceCategoryID) {
            msg.channel.send(':x: Your voice channel is not a dynamic voice channel.');
            return;
        }
        // if no arguments were provided, unlock the channel (set userlimit to 0)
        if (!args[0]) {
            msg.member.voice.channel.setUserLimit(0);
            return;
        }
        // check if argument is a number and between 0 and 99
        if (!args[0].match(/^\d+$/) || parseInt(args[0]) < 0 || parseInt(args[0]) > 99) {
            msg.channel.send(':x: Userlimit has to be between 0 and 99');
            return;
        }
        // set userlimit
        msg.member.voice.channel.setUserLimit(parseInt(args[0]));
    }
}