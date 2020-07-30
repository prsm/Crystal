import fs from 'fs';
import { Message, MessageEmbed, Client, version, GuildMember } from 'discord.js';
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
        description: 'Show different stats\n\nParameters:\n`server` - Current stats about the server\n`bot` - Stats about the bot.\n`me`/`@User` - Stats about a specific user.',
        argsRequired: true,
        admin: false,
        aliases: ['s'],
        usage: 'stats',
        examples: ['stats server', 'stats bot', 'stats me', 'stats @Jannik66'],
        showInHelp: true
    }

    private _client: Client;

    private _messageStatRepository: Repository<MessageStat>;
    private _voiceStatRepository: Repository<VoiceStat>;
    private _memberCountStatRepository: Repository<MemberCountStat>;
    private _userLevelRepository: Repository<UserLevel>;

    private _numbers: string[] = [
        '1⃣',
        '2⃣',
        '3⃣',
        '4⃣',
        '5⃣',
        '6⃣',
        '7⃣',
        '8⃣',
        '9⃣',
        ':keycap_ten:'
    ]

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
            case 'me':
                this._userStats(msg, args, msg.member);
                break;
            default:
                msg.channel.send(':x: Unknown argument.\nKnown arguments:\nServer Stats: `server`/`s`/`srv`/`guild`\nBot Stats: `bot`/`b`\nUser Stats: `me`/`@User`');
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
        embed.setDescription('_Tracking since 06.06.2020_');

        embed.addField(':chart_with_upwards_trend:Members', `\`${guild.memberCount}\``, true);

        const sentMessageCount = await this._messageStatRepository.count();
        embed.addField(':pen_ballpoint:Sent Messages', `\`${sentMessageCount}\``, true);

        const voiceMinuteCount = await this._voiceStatRepository.count();
        embed.addField(':loud_sound:Total Voice Time', `\`${this._formatVoiceMinutes(voiceMinuteCount)}\``, true);

        embed.addField('\u200B', '\u200B');

        const topMessageSender = await this._messageStatRepository.createQueryBuilder('messageStat')
            .select('count(Id)', 'count')
            .addSelect('messageStat.userID', 'userID')
            .groupBy('messageStat.userID')
            .orderBy('count', 'DESC')
            .limit(5)
            .getRawMany();
        embed.addField('Top message senders', topMessageSender.length > 0 ? topMessageSender.map((tms, i) => `${this._numbers[i]}<@${tms.userID}>\n:envelope:\`${tms.count}x\``) : 'Pretty empty...', true);

        const topVoiceMembers = await this._voiceStatRepository.createQueryBuilder('voiceStat')
            .select('count(Id)', 'count')
            .addSelect('voiceStat.userID', 'userID')
            .groupBy('voiceStat.userID')
            .orderBy('count', 'DESC')
            .limit(5)
            .getRawMany();
        embed.addField('Most active in voice', topVoiceMembers.length > 0 ? topVoiceMembers.map((tvm, i) => `${this._numbers[i]}<@${tvm.userID}>\n:stopwatch:\`${this._formatVoiceMinutes(tvm.count)}\``) : 'Pretty empty...', true);

        const topLevels = await this._userLevelRepository.createQueryBuilder('userLevel')
            .select('userLevel.userID', 'userID')
            .addSelect('userLevel.exp', 'exp')
            .orderBy('exp', 'DESC')
            .limit(5)
            .getRawMany();
        embed.addField('Highest levels', topLevels.length > 0 ? topLevels.map((tl, i) => `${this._numbers[i]}<@${tl.userID}>\n:star:\`${tl.exp}xp\``) : 'Pretty empty...', true);

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
        const fileSize = databaseStats.size / 1000 / 1000;
        embed.addField(':card_box: Database Size', `${fileSize.toFixed(1)} mb`, true);

        msg.channel.send(embed);
    }

    private async _userStats(msg: Message, args: string[], member: GuildMember) {
        const embed = new MessageEmbed();
        embed.setTitle(`${member.displayName}'s stats`);
        embed.setColor(member.displayHexColor);
        embed.setThumbnail(member.user.avatarURL({ dynamic: true }));
        embed.setDescription('_Tracking since 06.06.2020_');

        embed.addField(':calendar_spiral: Joined Server', `\`${moment(member.joinedAt).format('DD.MM.YYYY')}\``);

        // get sent messages count
        const messageSats = await this._messageStatRepository.createQueryBuilder('messageStat')
            .select('count(Id)', 'msgCount')
            .groupBy('messageStat.userID')
            .where(`messageStat.userID = ${member.id}`)
            .getRawOne();

        // get total voice minutes
        const voiceStats = await this._voiceStatRepository.createQueryBuilder('voiceStat')
            .select('count(Id)', 'min')
            .groupBy('voiceStat.userID')
            .where(`voiceStat.userID = ${member.id}`)
            .getRawOne();

        // get all levels to determine index of user (place in leaderboard)
        const levels = await this._userLevelRepository.find({ order: { exp: 'DESC' } });

        // find index of user in levels
        const index = levels.findIndex(l => l.userID === member.id);

        embed.addField(':envelope: Sent Messages', `\`${messageSats ? messageSats.msgCount : 0}x\``, true);
        embed.addField(':stopwatch: Voice Time', `\`${this._formatVoiceMinutes(voiceStats ? voiceStats.min : 0)}\``, true);

        const expString = index >= 0 ? `\`${levels[index].exp}xp | ${index + 1}. place\`` : '\`0xp\`';
        embed.addField(':star: Experience', expString, true);

        if (!msg.author.dmChannel) {
            await msg.author.createDM();
        }
        msg.author.dmChannel.send(embed);
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
            (duration.asHours() > 0 ? `${Math.floor(duration.asHours())}h ` : '') +
            `${duration.minutes()}m`
        );
    }
}
