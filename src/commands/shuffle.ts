import { Message, MessageEmbed } from 'discord.js';

import { Bot } from '../bot';
import { BotCommand } from '../customInterfaces';
import config from '../config';

export default class shuffleCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 8,
        name: 'shuffle',
        category: 'Tools',
        description: 'Shuffles the users in your voice channel into a given amount of teams. (Default is 2)',
        argsRequired: false,
        admin: false,
        aliases: [],
        usage: 'shuffle [number]',
        examples: ['shuffle', 'shuffle 3'],
        showInHelp: true
    }

    constructor(private _bot: Bot) { }

    public async execute(msg: Message, args: string[]) {
        let teamCount = 2;
        if (args[0]) {
            if (!args[0].match(/^\d+$/)) {
                msg.channel.send(':x: Please enter a valid number');
                return;
            }
            teamCount = parseInt(args[0]);
        }
        if (!msg.member.voice.channelID) {
            msg.channel.send(':x: You aren\'t in a voice channel.');
            return;
        }
        if (msg.member.voice.channel.members.size === 1) {
            msg.channel.send(':warning: You\'re all alone in this channel...');
            return;
        }

        // get userids and shuffle them
        const userIds = msg.member.voice.channel.members.array().map(m => m.id);
        this._shuffle(userIds);

        // split users into teams
        const teams: string[][] = [];
        userIds.forEach((id, i) => teams[i % teamCount] ? teams[i % teamCount].push(id) : teams[i % teamCount] = [id]);

        // create embed with teams
        const embed = new MessageEmbed();
        embed.setColor(config.embedColor);
        embed.setTitle('Shuffled Teams');
        teams.forEach((team, i) => embed.addField(`Team ${i + 1}`, team.map(userId => `<@${userId}>`), true));

        msg.channel.send(embed);
    }

    // randomly shuffle the array
    private _shuffle(array: string[]) {
        for (let i = array.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}