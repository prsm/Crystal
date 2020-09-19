import { GuildMember, PartialGuildMember, TextChannel, MessageEmbed } from 'discord.js';

import { Bot } from '../bot';
import config from '../config';

export class GuildMemberListener {

    private _landingChannel: TextChannel;

    constructor(private _bot: Bot) { }

    public init() {
        this._landingChannel = this._bot.getClient().channels.cache.get(config.landingChannelID) as TextChannel;
    }

    public async evalGuildMemberAdd(member: GuildMember | PartialGuildMember) {
        const embed = new MessageEmbed;
        embed.setTitle(`Welcome to the PR1SM Discord Server`);
        embed.setDescription(`${member.toString()}(\`${member.user.tag}\`) joined.\nPR1SM has now \`${member.guild.memberCount}\` members.`)
        embed.setColor(0x28a745);
        embed.setTimestamp(new Date());
        this._landingChannel.send(embed);
    }

    public async evalGuildMemberRemove(member: GuildMember | PartialGuildMember) {
        const embed = new MessageEmbed;
        embed.setTitle(`${member.displayName} left`);
        embed.setDescription(`${member.toString()}(\`${member.user.tag}\`) left.\nPR1SM has now \`${member.guild.memberCount}\` members.`)
        embed.setColor(0xdc3545);
        embed.setTimestamp(new Date());
        this._landingChannel.send(embed);
    }
}