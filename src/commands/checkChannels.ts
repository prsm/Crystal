import { Message, Client, MessageEmbed, GuildChannel } from 'discord.js';

import { Bot } from '../bot';
import { BotCommand } from '../customInterfaces';
import config from '../config';

export default class checkChannelsCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 7,
        name: 'checkchannels',
        category: 'Information',
        description: 'List all channels the bot can see and create stats from.',
        argsRequired: false,
        admin: true,
        aliases: ['cc'],
        usage: 'checkchannels',
        examples: ['checkchannels'],
        showInHelp: true
    }

    private _client: Client;

    constructor(private _bot: Bot) {
        this._client = this._bot.getClient();
    }

    public async execute(msg: Message, args: string[]) {
        const guild = this._client.guilds.cache.get(config.guildID);

        // get all text channels and sort them in the right order
        const textChannels = guild.channels.cache.filter(c => c.type === 'text').sort(this._sortChannels);
        // get all voice channels and sort them in the right order
        const voiceChannels = guild.channels.cache.filter(c => c.type === 'voice').sort(this._sortChannels);

        const embed = new MessageEmbed();
        embed.setColor(config.embedColor);
        embed.setTitle('Channels');
        embed.setDescription('I can see the following Channels and create stats from them:');

        embed.addField('Textchannels', textChannels.map(c => `${c.toString()}`), true);
        embed.addField('Voicechannels', voiceChannels.map(c => `${c.name}`), true);

        embed.addField('\u200B', '\u200B');

        embed.addField('Text channels exluded from stats',
            config.levelExcludedTextChannels.length > 0 ? config.levelExcludedTextChannels.map(id => `<#${id}>`) : 'None', true);
        embed.addField('Voice channels exluded from stats',
            config.levelExcludedVoiceChannels.length > 0 ? config.levelExcludedVoiceChannels.map(id => `${guild.channels.cache.get(id).name}`) : 'None', true);

        msg.channel.send(embed);
    }

    private _sortChannels(a: GuildChannel, b: GuildChannel): number {
        if (a.rawPosition > b.rawPosition) return 1;
        if (a.rawPosition < b.rawPosition) return -1;
        return 0;
    }
}