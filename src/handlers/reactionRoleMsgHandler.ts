import { Client, TextChannel, Message } from 'discord.js';

import { Bot } from '../bot';

export class ReactionRoleMsgHandler {

    private _client: Client;

    private _reactionRoleMsg: Message;

    private _reactionRoleChannel: { key: string, value: string };
    private _reactionRoleMsgId: { key: string, value: string };

    constructor(private _bot: Bot) {
        this._client = this._bot.getClient();
    }

    public async updateReactionRoleMsg() {
        await this.fetchReactionRoleMessage();
        if (this._reactionRoleMsg) {
            // Fetch users from guild to ensure the bot includes all members in the reaction role msg
            await this._reactionRoleMsg.guild.members.fetch();
            this._editMsg();
        }
    }

    public async fetchReactionRoleMessage() {
        this._reactionRoleChannel = await this._bot.getDatabase().getConfigRepository().findOne({ where: { key: 'reactionRoleChannel' } });
        this._reactionRoleMsgId = await this._bot.getDatabase().getConfigRepository().findOne({ where: { key: 'reactionRoleMsg' } });
        if (this._reactionRoleChannel) {
            await (this._client.channels.cache.get(this._reactionRoleChannel.value) as TextChannel).messages.fetch();
            this._reactionRoleMsg = (this._client.channels.cache.get(this._reactionRoleChannel.value) as TextChannel).messages.cache.get(this._reactionRoleMsgId.value);
        }
    }

    private async _editMsg() {
        const roles = await this._bot.getDatabase().getReactionRoleRepository().find({ order: { name: 'ASC' } });
        const embed = this._reactionRoleMsg.embeds[0];
        embed.fields = [];
        for (const role of roles) {
            if (!this._reactionRoleMsg.reactions.cache.find(r => r.emoji.id == role.emojiID)) {
                embed.fields = [];
                await this._reactionRoleMsg.react(this._client.emojis.cache.get(role.emojiID));
            }
        }
        const reactions = this._reactionRoleMsg.reactions.cache;
        for (const reaction of reactions) {
            if (roles.find(r => r.emojiID === reaction[0])) {
                embed.fields.push({
                    name: `${this._client.emojis.cache.get(reaction[0])} **${roles.find(r => r.emojiID === reaction[0]).name}**`,
                    value: `\`${this._reactionRoleMsg.guild.roles.cache.get(roles.find(r => r.emojiID === reaction[0]).roleID).members.size}\` Members`,
                    inline: true
                }
                );
            } else {
                console.log(`WARNING: No role for emoji ${reaction[0]} found...`);
                //this._reactionRoleMsg.reactions.cache.get(reaction[0]).remove();
            }
        }
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