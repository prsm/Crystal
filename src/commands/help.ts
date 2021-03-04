import { Message, Collection, MessageEmbed, Client } from 'discord.js';

import { Bot } from '../bot';
import { BotCommand } from '../customInterfaces';

export default class helpCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 0,
        name: 'help',
        category: 'Information',
        description: 'Displays all available commands.',
        argsRequired: false,
        admin: false,
        aliases: ['h'],
        usage: 'help',
        examples: ['help', 'help addEvent'],
        showInHelp: true
    }

    private _client: Client;

    private _commands: Collection<string, BotCommand>;

    constructor(private _bot: Bot) {
        this._client = this._bot.getClient();
        this._commands = this._bot.getAllCommands();
    }

    public async execute(msg: Message, args: string[]) {
        // set up embed
        let embed = new MessageEmbed();
        embed.setColor(this._bot.getConfig().embedColor);
        embed.setAuthor(`${this._client.user.username}`, this._client.user.avatarURL());

        // search for a command to display help for
        const command = this._commands.get(args[0]) || this._commands.find(cmd => cmd.information.aliases && cmd.information.aliases.includes(args[0]));

        // if a command was found, set up help message for it
        if (command) {
            embed.setTitle(`Commandinfo \`${command.information.name}\``);
            embed.addField(`Description`, `${command.information.description}`);
            embed.addField(`Category`, `${command.information.category}`);
            if (command.information.aliases.length > 0) {
                let aliases: string;
                for (let alias of command.information.aliases) {
                    if (aliases) {
                        aliases += `, \`${alias}\``;
                    } else {
                        aliases = `\`${alias}\``;
                    }
                }
                embed.addField(`Aliases`, `${aliases}`);
            }
            embed.addField(`Usage`, `\`${this._bot.getConfig().prefix}${command.information.usage}\``);
            if (command.information.examples) {
                let examples: string;
                for (let example of command.information.examples) {
                    if (examples) {
                        examples += `\n\`${this._bot.getConfig().prefix}${example}\``;
                    } else {
                        examples = `\`${this._bot.getConfig().prefix}${example}\``;
                    }
                }
                embed.addField(`Example`, `${examples}`);
            }

            // send help message to log channel
            this._sendEmbedMessage(msg, embed);
        } else if (args[0]) {
            // if no command was found, send error message
            this._sendMessage(msg, `:no_entry_sign: ${msg.author.toString()}, the command \`${args[0]}\` was not found.`);
        } else {
            // set up general help message
            embed.setTitle(`Commands`);
            embed.setDescription(`To get detailed information about a command, type \`${this._bot.getConfig().prefix}help {command}\``);
            let fields: {
                [key: string]: string
            } = {};
            for (const command of this._commands) {
                if (command[1].information.showInHelp) {
                    if (fields[`${command[1].information.category}`]) {
                        fields[`${command[1].information.category}`] += `\n**${this._bot.getConfig().prefix}${command[1].information.name}**\n${command[1].information.description}`;
                    } else {
                        fields[`${command[1].information.category}`] = `**${this._bot.getConfig().prefix}${command[1].information.name}**\n${command[1].information.description}`;
                    }
                }
            }

            for (const key in fields) {
                embed.addField(`►${key}◄`, fields[key]);
            }
            this._sendEmbedMessage(msg, embed);
        }
    }

    private _sendMessage(msg: Message, text: string) {
        msg.channel.send(text);
    }

    private _sendEmbedMessage(msg: Message, embed: MessageEmbed) {
        msg.channel.send(embed);
    }
}