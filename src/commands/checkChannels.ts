import { Message, Client, GuildChannel } from 'discord.js';

import { Bot } from '../bot';
import { BotCommand } from '../customInterfaces';

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
        const guild = this._client.guilds.cache.get(this._bot.getConfig().guildID);

        // get all text channels and sort them in the right order
        const textChannels = guild.channels.cache.filter(c => c.type === 'text' && c.viewable).sort(this._sortChannels);
        // get all voice channels and sort them in the right order
        const voiceChannels = guild.channels.cache.filter(c => c.type === 'voice' && c.viewable).sort(this._sortChannels);

        let msgString = 'I can see the following Channels and create stats from them:\n\n';

        msgString += '**Text Channels**\n' + textChannels.map(c => c.toString()).join('\n') + '\n';
        msgString += '**Voice Channels**\n' + voiceChannels.map(c => c.name).join('\n') + '\n\n';

        msgString += `**Text channels exluded from stats**\n${this._bot.getConfig().levelExcludedTextChannels.length > 0 ? this._bot.getConfig().levelExcludedTextChannels.map(id => `<#${id}>`) : 'None'}\n`;
        msgString += `**Voice channels exluded from stats**\n${this._bot.getConfig().levelExcludedVoiceChannels.length > 0 ? this._bot.getConfig().levelExcludedVoiceChannels.map(id => `${guild.channels.cache.get(id).name}`) : 'None'}`;

        msg.channel.send(msgString);
    }

    private _sortChannels(a: GuildChannel, b: GuildChannel): number {
        if (a.rawPosition > b.rawPosition) return 1;
        if (a.rawPosition < b.rawPosition) return -1;
        return 0;
    }
}