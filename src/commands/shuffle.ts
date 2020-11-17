import { Message, MessageEmbed, MessageReaction, User, CollectorFilter, TextChannel, Client, VoiceChannel } from 'discord.js';

import { Bot } from '../bot';
import { BotCommand } from '../customInterfaces';
import config from '../config';

export default class shuffleCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 8,
        name: 'shuffle',
        category: 'Tools',
        description: 'Shuffles the users in your voice channel into a given amount of teams. (Default is 2)',
        argsRequired: false,
        admin: false,
        aliases: [],
        usage: 'shuffle [number]',
        examples: ['shuffle', 'shuffle 3'],
        showInHelp: true
    }

    private _client: Client;

    constructor(private _bot: Bot) {
        this._client = this._bot.getClient();
    }

    public async execute(msg: Message, args: string[]) {
        let teamCount = 2;
        if (args[0]) {
            if (!args[0].match(/^\d+$/)) {
                msg.channel.send(':x: Please enter a valid number');
                return;
            }
            teamCount = parseInt(args[0]);
        }
        if (!msg.member.voice.channelID) {
            msg.channel.send(':x: You aren\'t in a voice channel.');
            return;
        }
        if (msg.member.voice.channel.members.size === 1) {
            msg.channel.send(':warning: You\'re all alone in this channel...');
            return;
        }

        // get userids and shuffle them
        const userIds = msg.member.voice.channel.members.array().map(m => m.id);
        this._shuffle(userIds);

        // split users into teams
        const teams: string[][] = [];
        userIds.forEach((id, i) => teams[i % teamCount] ? teams[i % teamCount].push(id) : teams[i % teamCount] = [id]);

        // create embed with teams
        const embed = new MessageEmbed();
        embed.setColor(config.embedColor);
        embed.setTitle('Shuffled Teams');
        teams.forEach((team, i) => embed.addField(`Team ${i + 1}`, team.map(userId => `<@${userId}>`), true));

        const m = await msg.channel.send(embed);

        // Fetch users from guild to ensure the bot finds the correct member
        await msg.guild.members.fetch();

        const filter = (reaction: MessageReaction, user: User) => {
            return ['🔀'].includes(reaction.emoji.name) && (msg.guild.members.cache.get(user.id).hasPermission('ADMINISTRATOR') || msg.guild.members.cache.get(user.id).roles.cache.has(config.moderatorRoleID)) && !user.bot;
        };

        this._awaitMenuReactions(m, filter, teams);

        await m.react('🔀');
    }

    // randomly shuffle the array
    private _shuffle(array: string[]) {
        for (let i = array.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    private async _awaitMenuReactions(m: Message, filter: CollectorFilter, teams: string[][]) {
        m.awaitReactions(filter, { max: 1, time: 4 * 60 * 1000, errors: ['time'] })
            .then(async (collected) => {
                const reaction = collected.first();
                if (!reaction) return;
                this._moveUsers(teams, reaction.users.cache.find(u => !u.bot));
                await m.reactions.removeAll();
            }).catch(() => {
                m.reactions.removeAll();
            });
    }

    private async _moveUsers(teams: string[][], mover: User) {
        const logChannel = this._client.channels.cache.get(config.logChannelID) as TextChannel;
        logChannel.send(`:white_circle: ${mover.tag} (\`${mover.id}\`) moved users with the shuffle command.`);

        teams.shift();
        for (const team of teams) {
            const emtpyVoiceChannel = this._client.channels.cache.find((c) => {
                if (c.type !== 'voice') return false;
                const vc = c as VoiceChannel;
                return vc.parentID === config.dynamicVoiceCategoryID && vc.members.size === 0
            });
            for (const userID of team) {
                await this._client.guilds.cache.get(config.guildID).members.cache.get(userID).voice.setChannel(emtpyVoiceChannel, `Shuffle move by ${mover.tag} (${mover.id})`);
            }
            await this._delay(500);
        }
    }

    private _delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

}