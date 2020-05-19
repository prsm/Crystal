import { User, MessageReaction } from 'discord.js';
import { Repository } from 'typeorm';

import { juicepress } from '../bot';
import { EventHandler } from '../handlers/eventHandler';
import { ReactionRole } from '../entities/reactionRole';
import config from '../config';

export class ReactionListener {

    private _reactionRoleRepository: Repository<ReactionRole>;
    private _eventHandler: EventHandler;

    constructor(private _botClient: juicepress) {
        this._reactionRoleRepository = this._botClient.getDatabase().getReactionRoleRepository();
        this._eventHandler = this._botClient.getEventHandler();
    }

    public async reactionAdded(msgReaction: MessageReaction, user: User) {
        if (user.bot) return;
        if (msgReaction.message.id === this._botClient.getReactionRoleMsgHandler().getReactionRoleMsgId()) {
            const role = msgReaction.message.guild.roles.cache.get((await (this._reactionRoleRepository.findOne({ where: { emojiID: msgReaction.emoji.id } }))).roleID);
            if (role) {
                msgReaction.message.guild.members.cache.get(user.id).roles.add(role);
            }
        } else if (msgReaction.message.channel.id === config.eventChannelID) {
            this._eventHandler.handleReaction(msgReaction, user, 1);
        }
    }

    public async reactionRemoved(msgReaction: MessageReaction, user: User) {
        if (user.bot) return;
        if (msgReaction.message.id === this._botClient.getReactionRoleMsgHandler().getReactionRoleMsgId()) {
            const role = msgReaction.message.guild.roles.cache.get((await (this._reactionRoleRepository.findOne({ where: { emojiID: msgReaction.emoji.id } }))).roleID);
            if (role) {
                msgReaction.message.guild.members.cache.get(user.id).roles.remove(role);
            }
        } else if (msgReaction.message.channel.id === config.eventChannelID) {
            this._eventHandler.handleReaction(msgReaction, user, 0);
        }
    }
}