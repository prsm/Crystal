import { Message, MessageEmbed, Client } from 'discord.js';
import { Repository } from 'typeorm';

import { Bot } from '../bot';
import { Config } from '../entities/config';
import { ReactionRole } from '../entities/reactionRole';
import config from '../config';
import { BotCommand } from '../customInterfaces';

export default class createReactionMsgCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 1,
        name: 'createreactionmsg',
        category: 'Reaction Role',
        description: 'Create/Re-create the reaction role message.',
        argsRequired: false,
        admin: true,
        aliases: [],
        usage: 'createreactionmsg',
        examples: ['createreactionmsg'],
        showInHelp: false
    }

    private _client: Client;

    private _configRepository: Repository<Config>;

    private _reactionRoleRepository: Repository<ReactionRole>;

    constructor(private _bot: Bot) {
        this._client = this._bot.getClient();
        this._configRepository = this._bot.getDatabase().getConfigRepository();
        this._reactionRoleRepository = this._bot.getDatabase().getReactionRoleRepository();
    }

    public async execute(msg: Message, args: string[]) {
        const embed = new MessageEmbed;
        embed.setTitle('Server Roles');
        embed.setDescription('Assign yourself a role by reacting to the message.');
        embed.setColor(config.embedColor);
        const roles = await this._reactionRoleRepository.find();
        if (roles.length === 0) {
            msg.channel.send(`:x: No Roles available. Add a reaction role with \`${config.prefix}createrole\``)
            return;
        }
        let fieldString = '';
        for (const role of roles) {
            fieldString += `${this._client.emojis.cache.get(role.emojiID)}: **${role.name}**\n`;
        }
        embed.addField('Roles', fieldString);
        const reactionMsg = await msg.channel.send(embed);
        msg.delete();
        this._react(reactionMsg, roles);
        await this._configRepository.save({ key: 'reactionRoleMsg', value: reactionMsg.id });
        await this._configRepository.save({ key: 'reactionRoleChannel', value: reactionMsg.channel.id });
        this._bot.getReactionRoleMsgHandler().fetchReactionRoleMessage();
    }

    private async _react(msg: Message, roles: ReactionRole[]) {
        for (const role of roles) {
            await msg.react(this._client.emojis.cache.get(role.emojiID));
        }
    }
}