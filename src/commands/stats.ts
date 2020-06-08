import fs from 'fs';
import { Message, MessageEmbed, Client, version } from 'discord.js';
import { Repository } from 'typeorm';
import moment from 'moment';

import { Bot } from '../bot';
import { MessageStat } from '../entities/messageStat';
import { VoiceStat } from '../entities/voiceStat';
import { MemberCountStat } from '../entities/memberCountStat';
import { UserLevel } from '../entities/userLevel';
import { BotCommand } from '../customInterfaces';
import config from '../config';

export default class statCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 6,
        name: 'stats',
        category: 'Stats',
        description: 'Show different stats\n\nParameters:\n`server` - Current stats about the server\n`bot` - Stats about the bot.',
        argsRequired: true,
        admin: false,
        aliases: ['s'],
        usage: 'stats',
        examples: ['stats server', 'stats bot'],
        showInHelp: true
    }

    private _client: Client;

    private _messageStatRepository: Repository<MessageStat>;
    private _voiceStatRepository: Repository<VoiceStat>;
    private _memberCountStatRepository: Repository<MemberCountStat>;
    private _userLevelRepository: Repository<UserLevel>;

    constructor(private _bot: Bot) {
        this._client = this._bot.getClient();
        this._messageStatRepository = this._bot.getDatabase().getMessageStatRepository();
        this._voiceStatRepository = this._bot.getDatabase().getVoiceStatRepository();
        this._memberCountStatRepository = this._bot.getDatabase().getMemberCountStatRepository();
        this._userLevelRepository = this._bot.getDatabase().getUserLevelRepository();
    }

    public async execute(msg: Message, args: string[]) {
        switch (args[0]) {
            case 'server':
            case 's':
            case 'srv':
            case 'guild':
                this._serverStats(msg, args);
                break;
            case 'bot':
            case 'b':
                this._botStats(msg, args);
                break;
            default:
                msg.channel.send(':x: Unknown argument.\nKnown arguments:\nServer Stats: `server`/`s`/`srv`/`guild`\nBot Stats: `bot`/`b`');
                break;
        }
    }

    // server stats like total membercount, messages, voice minutes and leaderboards
    private async _serverStats(msg: Message, args: string[]) {
        const guild = this._client.guilds.cache.get(config.guildID);
        const embed = new MessageEmbed();
        embed.setTitle('Server Stats');
        embed.setAuthor(guild.name, guild.iconURL());
        embed.setColor(config.embedColor);
        embed.addField(':chart_with_upwards_trend:Members', guild.memberCount, true);

        const sentMessageCount = await this._messageStatRepository.count();
        embed.addField(':pen_ballpoint:Sent Messages', sentMessageCount, true);

        const voiceMinuteCount = await this._voiceStatRepository.count();
        embed.addField(':loud_sound:Total Voice Time', this._formatVoiceMinutes(voiceMinuteCount), true);

        embed.addField('\u200B', '\u200B');

        const topMessageSender = await this._messageStatRepository.createQueryBuilder('messageStat')
            .select('count(Id)', 'count')
            .addSelect('messageStat.userID', 'userID')
            .groupBy('messageStat.userID')
            .orderBy('count', 'DESC')
            .limit(5)
            .getRawMany();
        embed.addField('Top message senders', topMessageSender.length > 0 ? topMessageSender.map((tms, i) => `${i + 1}. <@${tms.userID}> | ${tms.count}x`) : 'Pretty empty...', true);

        const topVoiceMembers = await this._voiceStatRepository.createQueryBuilder('voiceStat')
            .select('count(Id)', 'count')
            .addSelect('voiceStat.userID', 'userID')
            .groupBy('voiceStat.userID')
            .orderBy('count', 'DESC')
            .limit(5)
            .getRawMany();
        embed.addField('Most active in voice', topVoiceMembers.length > 0 ? topVoiceMembers.map((tvm, i) => `${i + 1}. <@${tvm.userID}> | ${this._formatVoiceMinutes(tvm.count)}`) : 'Pretty empty...', true);

        const topLevels = await this._userLevelRepository.createQueryBuilder('userLevel')
            .select('userLevel.userID', 'userID')
            .addSelect('userLevel.exp', 'exp')
            .orderBy('exp', 'DESC')
            .limit(5)
            .getRawMany();
        embed.addField('Highest levels', topLevels.length > 0 ? topLevels.map((tl, i) => `${i + 1}. <@${tl.userID}> | ${tl.exp}xp`) : 'Pretty empty...', true);

        msg.channel.send(embed);
    }

    // bot stats like versions, uptime, size of database
    private _botStats(msg: Message, args: string[]) {
        const embed = new MessageEmbed();
        embed.setAuthor(this._client.user.username, this._client.user.avatarURL());
        embed.setTitle('Bot Stats');
        embed.setColor(config.embedColor);

        embed.addField(':hash:Version', `**${config.botVersion}** | ${config.botVersionDate}`, true);
        embed.addField(':stopwatch:Uptime', `${this._formatUptime(process.uptime())}`, true);
        embed.addField(`Discord.js Version`, `v${version}`, true);
        embed.addField(`Node.js Version`, `${process.version}`, true);
        embed.addField(`:minidisc:Memory Used`, `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} mb`, true);

        const databaseStats = fs.statSync('./database/bot.db');
        const fileSize = databaseStats.size / 1000;
        embed.addField(':card_box: Database Size', `${fileSize} kb`, true);

        msg.channel.send(embed);
    }

    // format seconds to a better readable format
    private _formatUptime(seconds: number) {
        let duration = moment.duration(seconds, 'seconds');
        return (
            (Math.floor(duration.asMonths()) > 0 ? `${Math.floor(duration.asMonths())}M ` : '') +
            (Math.floor(duration.asMonths()) > 0 || duration.days() > 0 ? `${duration.days()}d ` : '') +
            (duration.hours() > 0 || duration.days() > 0 || Math.floor(duration.asMonths()) > 0 ? `${duration.hours()}h ` : '') +
            (duration.minutes() > 0 || duration.hours() > 0 || duration.days() > 0 || Math.floor(duration.asMonths()) > 0 ? `${duration.minutes()}m ` : '') +
            `${duration.seconds()}s`
        );
    }

    // format mintutes to a better readable format
    private _formatVoiceMinutes(minutes: number) {
        let duration = moment.duration(minutes, 'minutes');
        return (
            (Math.floor(duration.asMonths()) > 0 ? `${Math.floor(duration.asMonths())}M ` : '') +
            (Math.floor(duration.asMonths()) > 0 || duration.days() > 0 ? `${duration.days()}d ` : '') +
            (duration.hours() > 0 || duration.days() > 0 || Math.floor(duration.asMonths()) > 0 ? `${duration.hours()}h ` : '') +
            `${duration.minutes()}m`
        );
    }
}