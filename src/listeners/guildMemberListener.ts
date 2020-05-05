import { GuildMember, PartialGuildMember, TextChannel } from 'discord.js';

import { iBot } from '../bot';
import config from '../config';

export class GuildMemberListener {

    private _landingChannel: TextChannel;

    constructor(private _botClient: iBot) { }

    public init() {
        this._landingChannel = this._botClient.getClient().channels.cache.get(config.landingChannelID) as TextChannel;
    }

    public async evalGuildMemberRemove(member: GuildMember | PartialGuildMember) {
        if (member.roles.cache.get(config.memberRoleID)) {
            this._landingChannel.send(`>🔴 ${member.toString()} left.`);
        }
    }
}