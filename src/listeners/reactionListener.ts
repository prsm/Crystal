import { User, MessageReaction } from 'discord.js';
import { Repository } from 'typeorm';

import { Bot } from '../bot';
import { EventHandler } from '../handlers/eventHandler';
import { RoleHandler } from '../handlers/roleHandler';
import { ReactionRoleMsgHandler } from '../handlers/reactionRoleMsgHandler';
import { ReactionRole } from '../entities/reactionRole';
import { RoleType } from '../customInterfaces';
import config from '../config';

export class ReactionListener {

    private _reactionRoleRepository: Repository<ReactionRole>;
    private _eventHandler: EventHandler;
    private _roleHandler: RoleHandler;
    private _reactionRoleMsgHandler: ReactionRoleMsgHandler;

    constructor(private _bot: Bot) {
        this._reactionRoleRepository = this._bot.getDatabase().getReactionRoleRepository();
        this._eventHandler = this._bot.getEventHandler();
        this._roleHandler = this._bot.getRoleHandler();
        this._reactionRoleMsgHandler = this._bot.getReactionRoleMsgHandler();
    }

    public async reactionAdded(msgReaction: MessageReaction, user: User) {
        if (user.bot) return;

        // Fetch users from guild to ensure the bot finds the user which reacted
        await msgReaction.message.guild.members.fetch();

        if (msgReaction.message.id === this._bot.getReactionRoleMsgHandler().getReactionRoleMsgId()) {
            const role = (await (this._reactionRoleRepository.findOne({ where: { emojiID: msgReaction.emoji.id } })));
            if (msgReaction.message.guild.members.cache.get(user.id).roles.cache.get(role.roleID)) {
                await this._roleHandler.removeRole(msgReaction.message.guild.members.cache.get(user.id), role.roleID, RoleType.REACTIONROLE);
                await msgReaction.message.channel.send(`:red_circle: ${user.toString()} removed the Role **${role.name}**.`).then((botMsg) => {
                    setTimeout(() => { botMsg.delete() }, 5000);
                });
            } else {
                await this._roleHandler.addRole(msgReaction.message.guild.members.cache.get(user.id), role.roleID, RoleType.REACTIONROLE);
                await msgReaction.message.channel.send(`:green_circle: ${user.toString()} added the Role **${role.name}**.`).then((botMsg) => {
                    setTimeout(() => { botMsg.delete() }, 5000);
                });
            }
            this._reactionRoleMsgHandler.updateReactionRoleMsg();
            msgReaction.users.remove(user.id);
        } else if (msgReaction.message.channel.id === config.eventChannelID) {
            this._eventHandler.handleReaction(msgReaction, user, 1);
        }
    }

    public async reactionRemoved(msgReaction: MessageReaction, user: User) {
        if (user.bot) return;

        // Fetch users from guild to ensure the bot finds the user which reacted
        await msgReaction.message.guild.members.fetch();

        if (msgReaction.message.channel.id === config.eventChannelID) {
            this._eventHandler.handleReaction(msgReaction, user, 0);
        }
    }
}