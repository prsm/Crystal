import { Message, Client, TextChannel } from 'discord.js';

import { Bot } from '../bot';
import { RoleHandler } from '../handlers/roleHandler';
import { RoleType } from '../customInterfaces';

export class MessageListener {

    private _client: Client;

    private _prefix: string;

    private _landingChannel: TextChannel;

    private _roleHandler: RoleHandler;

    constructor(private _bot: Bot) {
        this._client = this._bot.getClient();

        this._prefix = this._bot.getConfig().prefix;

        this._roleHandler = this._bot.getRoleHandler();
    }

    public init() {
        this._landingChannel = this._bot.getClient().channels.cache.get(this._bot.getConfig().landingChannelID) as TextChannel;
    }

    public async evalMessage(msg: Message) {

        if (msg.content.startsWith(`<@${this._client.user.id}>`) || msg.content.startsWith(`<@!${this._client.user.id}`)) {
            msg.channel.send(`My prefix on this server is \`${this._prefix}\`\nGet a list of commands with \`${this._prefix}help\``);
            return;
        }

        if (!msg.content.toLowerCase().startsWith(this._prefix.toLowerCase())) return;

        let args = msg.content.slice(this._prefix.length).split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = this._bot.getAllCommands().get(commandName) || this._bot.getAllCommands().find(cmd => cmd.information.aliases && cmd.information.aliases.includes(commandName));

        // return if no command was found.
        if (!command) return;

        if (command.information.admin &&
            !msg.member.hasPermission('ADMINISTRATOR') &&
            !msg.member.roles.cache.has(this._bot.getConfig().moderatorRoleID)) {
            msg.channel.send(`:no_entry_sign: Only an admin or moderator can execute this command.`);
            return;
        }

        if (command.information.argsRequired && !args.length) {
            let reply = `:no_entry_sign: No arguments were provided`

            reply += `\nUsage: \`${this._prefix}${command.information.usage}\``

            reply += `\nExample:`;

            for (let example of command.information.examples) {
                reply += `\n\`${this._prefix}${example}\``;
            }
            msg.channel.send(reply);
            return;
        }

        try {
            command.execute(msg, args);
        } catch (error) {
            console.error(error);
            msg.channel.send(`Error...`);
        }
    }

    public async welcomeMessage(msg: Message) {
        msg.delete();
        if (msg.member.roles.cache.get(this._bot.getConfig().memberRoleID)) {
            msg.channel.send('You are already a Member of this server!').then((botMsg) => {
                setTimeout(() => { botMsg.delete() }, 10000);
            });
            return;
        }
        if (msg.content.toLowerCase() === 'accept') {
            this._roleHandler.addRole(msg.member, this._bot.getConfig().memberRoleID, RoleType.MEMBERROLE);
        } else {
            msg.channel.send('Please accept the rules by writing `accept`').then((botMsg) => {
                setTimeout(() => { botMsg.delete() }, 10000);
            });
        }
    }
}