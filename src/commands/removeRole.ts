import { Message } from 'discord.js';
import { Repository } from 'typeorm';

import { juicepress } from '../bot';
import { ReactionRole } from '../entities/reactionRole';
import { BotCommand } from '../customInterfaces';

export default class createRoleCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 3,
        name: 'removerole',
        category: 'Reaction Role',
        description: 'Remove a reaction Role',
        argsRequired: true,
        admin: true,
        aliases: ['rr'],
        usage: 'removerole {id of role}',
        examples: ['removerole 705861955482550353'],
        showInHelp: true
    }

    private _reactionRoleRepository: Repository<ReactionRole>;

    constructor(private _botClient: juicepress) {
        this._reactionRoleRepository = this._botClient.getDatabase().getReactionRoleRepository();
    }

    public async execute(msg: Message, args: string[], prefix: string) {
        const roleID = args[0];
        if (!roleID.match(/^\d+$/)) {
            msg.channel.send(':x: Argument is not recognised as a role id')
            return;
        }
        const reactionRole = await this._reactionRoleRepository.findOne({ where: { roleID } });
        if (!reactionRole) {
            msg.channel.send(':x: No reaction role found for this id.');
            return;
        }
        this._reactionRoleRepository.remove(reactionRole);
        this._botClient.getReactionRoleMsgHandler().updateReactionRoleMsg();
        msg.channel.send(`Removed Role \`${reactionRole.name}\``);
    }
}