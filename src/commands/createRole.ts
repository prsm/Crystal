import { Message, Client, Role } from 'discord.js';
import { Repository } from 'typeorm';

import { Bot } from '../bot';
import { ReactionRole } from '../entities/reactionRole';
import config from '../config';
import { BotCommand } from '../customInterfaces';

export default class createRoleCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 2,
        name: 'createrole',
        category: 'Reaction Role',
        description: 'Create a reaction role (Use emoji from this server)',
        argsRequired: true,
        admin: true,
        aliases: ['cr'],
        usage: 'createrole {name of role | id of already created role} {emoji to be used}',
        examples: ['createrole igurls :igurl:', 'createrole 705861955482550353 :testemoji:'],
        showInHelp: true
    }

    private _client: Client;

    private _reactionRoleRepository: Repository<ReactionRole>;

    constructor(private _bot: Bot) {
        this._client = this._bot.getClient();
        this._reactionRoleRepository = this._bot.getDatabase().getReactionRoleRepository();
    }

    public async execute(msg: Message, args: string[]) {
        const roleName = args[0];
        if (!args[1].match(/<:\S*:(\d*)>/)) {
            msg.channel.send(':x: Second argument is not recognised as an emoji.')
            return;
        }
        const emojiID = args[1].match(/<:\S*:(\d*)>/)[1];
        const emoji = this._client.guilds.cache.get(config.guildID).emojis.cache.get(emojiID);
        if (!emoji) {
            msg.channel.send(':x: Emoji not found on  server.')
            return;
        }
        const reactionRoles = await this._reactionRoleRepository.find();
        if (reactionRoles.find(rl => rl.emojiID === emojiID)) {
            msg.channel.send(':x: This emoji is already in use');
            return;
        }
        let role: Role;
        if (roleName.match(/^\d+$/)) {
            role = this._client.guilds.cache.get(config.guildID).roles.cache.get(roleName);
            if (!role) {
                msg.channel.send(':x: It seems like youv\'ve entered a role id, but the role cannot be found.');
                return;
            }
        } else {
            role = await this._client.guilds.cache.get(config.guildID).roles.create({
                data: {
                    name: roleName
                }
            });
        }
        await this._reactionRoleRepository.save({ roleID: role.id, emojiID: emojiID, name: role.name });
        this._bot.getReactionRoleMsgHandler().updateReactionRoleMsg();
        msg.channel.send(`Added Role \`${role.name}\` with emoji ${emoji.toString()}`);
    }
}