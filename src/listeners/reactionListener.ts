import { User, MessageReaction } from 'discord.js';
import { Repository } from 'typeorm';

import { Bot } from '../bot';
import { EventHandler } from '../handlers/eventHandler';
import { RoleHandler } from '../handlers/roleHandler';
import { ReactionRole } from '../entities/reactionRole';
import { RoleType } from '../customInterfaces';
import config from '../config';

export class ReactionListener {

    private _reactionRoleRepository: Repository<ReactionRole>;
    private _eventHandler: EventHandler;
    private _roleHandler: RoleHandler;

    constructor(private _bot: Bot) {
        this._reactionRoleRepository = this._bot.getDatabase().getReactionRoleRepository();
        this._eventHandler = this._bot.getEventHandler();
        this._roleHandler = this._bot.getRoleHandler();
    }

    public async reactionAdded(msgReaction: MessageReaction, user: User) {
        if (user.bot) return;
        if (msgReaction.message.id === this._bot.getReactionRoleMsgHandler().getReactionRoleMsgId()) {
            const roleID = (await (this._reactionRoleRepository.findOne({ where: { emojiID: msgReaction.emoji.id } }))).roleID;
            this._roleHandler.addRole(msgReaction.message.guild.members.cache.get(user.id), roleID, RoleType.REACTIONROLE);
        } else if (msgReaction.message.channel.id === config.eventChannelID) {
            this._eventHandler.handleReaction(msgReaction, user, 1);
        }
    }

    public async reactionRemoved(msgReaction: MessageReaction, user: User) {
        if (user.bot) return;
        if (msgReaction.message.id === this._bot.getReactionRoleMsgHandler().getReactionRoleMsgId()) {
            const roleID = (await (this._reactionRoleRepository.findOne({ where: { emojiID: msgReaction.emoji.id } }))).roleID;
            this._roleHandler.removeRole(msgReaction.message.guild.members.cache.get(user.id), roleID, RoleType.REACTIONROLE);
        } else if (msgReaction.message.channel.id === config.eventChannelID) {
            this._eventHandler.handleReaction(msgReaction, user, 0);
        }
    }
}