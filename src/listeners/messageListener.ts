import { Message, Client, GuildMember, TextChannel, MessageEmbed } from 'discord.js';

import { iBot } from '../bot';
import config from '../config';

export class MessageListener {

    private _client: Client;

    private _prefix: string;

    private _landingChannel: TextChannel;

    constructor(private _botClient: iBot) {
        this._client = this._botClient.getClient();

        this._prefix = config.prefix;
    }

    public init() {
        this._landingChannel = this._botClient.getClient().channels.cache.get(config.landingChannelID) as TextChannel;
    }

    public async evalMessage(msg: Message) {

        if (msg.content.startsWith(`<@${this._client.user.id}>`) || msg.content.startsWith(`<@!${this._client.user.id}`)) {
            msg.channel.send(`My prefix on this server is \`${this._prefix}\`\nGet a list of commands with \`${this._prefix}help\``);
            return;
        }

        if (!msg.content.toLowerCase().startsWith(this._prefix.toLowerCase())) return;

        let args = msg.content.slice(this._prefix.length).split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = this._botClient.getAllCommands().get(commandName) || this._botClient.getAllCommands().find(cmd => cmd.information.aliases && cmd.information.aliases.includes(commandName));

        // return if no command was found.
        if (!command) return;

        if (command.information.admin && !msg.member.hasPermission('ADMINISTRATOR')) {
            msg.channel.send(`:no_entry_sign: Only an admin can execute this command.`);
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
            command.execute(msg, args, this._prefix);
        } catch (error) {
            console.error(error);
            msg.channel.send(`Error...`);
        }
    }

    public async welcomeMessage(msg: Message) {
        msg.delete();
        if (msg.member.roles.cache.get(config.memberRoleID)) {
            msg.channel.send('You are already a Member of ibois!').then((botMsg) => {
                setTimeout(() => { botMsg.delete() }, 10000);
            });
            return;
        }
        if (msg.content.toLowerCase() === 'accept') {
            msg.member.roles.add(msg.guild.roles.cache.get(config.memberRoleID));
            this._sendJoinMessage(msg.member);
        } else {
            msg.channel.send('Please accept the rules by writing `accept`').then((botMsg) => {
                setTimeout(() => { botMsg.delete() }, 10000);
            });
        }
    }

    private _sendJoinMessage(member: GuildMember) {
        const embed = new MessageEmbed;
        embed.setTitle(`:tada:joined`);
        embed.setColor(0x28a745);
        embed.setTimestamp(new Date());
        embed.setAuthor(member.displayName, member.user.avatarURL());
        this._landingChannel.send(embed);
    }
}