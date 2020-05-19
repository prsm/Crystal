import { Client, TextChannel, Message } from 'discord.js';

import { juicepress } from '../bot';
import config from '../config';

export class ReactionRoleMsgHandler {

    private _client: Client;

    private _reactionRoleMsg: Message;

    private _reactionRoleChannel: { key: string, value: string };
    private _reactionRoleMsgId: { key: string, value: string };

    constructor(private _botClient: juicepress) {
        this._client = this._botClient.getClient();
    }

    public async updateReactionRoleMsg() {
        await this.fetchReactionRoleMessage();
        if (this._reactionRoleMsg) {
            this._editMsg();
        }
    }

    public async fetchReactionRoleMessage() {
        this._reactionRoleChannel = await this._botClient.getDatabase().getConfigRepository().findOne({ where: { key: 'reactionRoleChannel' } });
        this._reactionRoleMsgId = await this._botClient.getDatabase().getConfigRepository().findOne({ where: { key: 'reactionRoleMsg' } });
        if (this._reactionRoleChannel) {
            await (this._client.channels.cache.get(this._reactionRoleChannel.value) as TextChannel).messages.fetch();
            this._reactionRoleMsg = (this._client.channels.cache.get(this._reactionRoleChannel.value) as TextChannel).messages.cache.get(this._reactionRoleMsgId.value);
        }
    }

    private async _editMsg() {
        const roles = await this._botClient.getDatabase().getReactionRoleRepository().find();
        const embed = this._reactionRoleMsg.embeds[0];
        let rolesMsg = '';
        for (const role of roles) {
            if (!this._reactionRoleMsg.reactions.cache.find(r => r.emoji.id == role.emojiID)) {
                embed.fields = [];
                await this._reactionRoleMsg.react(this._client.guilds.cache.get(config.juicyyGuildID).emojis.cache.get(role.emojiID));
            }
        }
        const reactions = this._reactionRoleMsg.reactions.cache;
        for (const reaction of reactions) {
            if (roles.find(r => r.emojiID === reaction[0])) {
                rolesMsg += `\n${this._client.guilds.cache.get(config.juicyyGuildID).emojis.cache.get(reaction[0])}: **${roles.find(r => r.emojiID === reaction[0]).name}**`;
            } else {
                console.log(`WARNING: Not role for emoji ${reaction[0]} found...`);
                //this._reactionRoleMsg.reactions.cache.get(reaction[0]).remove();
            }
        }
        embed.fields = [];
        embed.addField('Roles', rolesMsg);
        this._reactionRoleMsg.edit(null, { embed });
    }

    public getReactionRoleChannel() {
        return this._reactionRoleChannel.value;
    }

    public getReactionRoleMsgId() {
        return this._reactionRoleMsgId ? this._reactionRoleMsgId.value : null;
    }

    public getReactionRoleMsg() {
        return this._reactionRoleMsg;
    }

}