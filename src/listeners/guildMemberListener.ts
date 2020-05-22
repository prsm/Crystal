import { GuildMember, PartialGuildMember, TextChannel, MessageEmbed } from 'discord.js';

import { Bot } from '../bot';
import config from '../config';

export class GuildMemberListener {

    private _landingChannel: TextChannel;

    constructor(private _bot: Bot) { }

    public init() {
        this._landingChannel = this._bot.getClient().channels.cache.get(config.landingChannelID) as TextChannel;
    }

    public async evalGuildMemberRemove(member: GuildMember | PartialGuildMember) {
        if (member.roles.cache.get(config.memberRoleID)) {
            const embed = new MessageEmbed;
            embed.setTitle(`:no_entry_sign:left`);
            embed.setColor(0xdc3545);
            embed.setTimestamp(new Date());
            embed.setAuthor(member.displayName, member.user.avatarURL());
            this._landingChannel.send(embed);
        }
    }
}