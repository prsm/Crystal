import fs from 'fs';
import { Message, MessageEmbed, Client, version, GuildMember, MessageAttachment, User, Guild } from 'discord.js';
import { Repository } from 'typeorm';
import moment from 'moment';

import { Bot } from '../bot';
import { MessageStat } from '../entities/messageStat';
import { VoiceStat } from '../entities/voiceStat';
import { MemberCountStat } from '../entities/memberCountStat';
import { UserLevel } from '../entities/userLevel';
import { BotCommand } from '../customInterfaces';
import config from '../config';
import { lineChart } from '../chartConfig';
import { ChartHandler } from '../handlers/chartHandler';

export default class statCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 6,
        name: 'stats',
        category: 'Stats',
        description: 'Show different stats\n\nParameters:\n`bot` - Stats about the bot.\n`me` - Stats about you.',
        argsRequired: true,
        admin: false,
        aliases: ['s'],
        usage: 'stats',
        examples: ['stats bot', 'stats me'],
        showInHelp: true
    }

    private _client: Client;

    private _messageStatRepository: Repository<MessageStat>;
    private _voiceStatRepository: Repository<VoiceStat>;
    private _memberCountStatRepository: Repository<MemberCountStat>;
    private _userLevelRepository: Repository<UserLevel>;
    private _chartHandler: ChartHandler;

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
        this._chartHandler = new ChartHandler();
    }

    public async execute(msg: Message, args: string[]) {
        switch (args[0]) {
            case 'bot':
            case 'b':
                this._botStats(msg, args);
                break;
            case 'me':
                this._userStats(msg, args, msg.member);
                break;
            default:
                msg.channel.send(':x: Unknown argument.\nKnown arguments:\nBot Stats: `bot`/`b`\nUser Stats: `me`');
                break;
        }
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
        embed.setTitle(`Your server stats:`);
        embed.setColor(member.displayHexColor);
        embed.setThumbnail(member.user.avatarURL({ dynamic: true }));
        embed.setDescription('_Tracking since 06.06.2020_');

        // embed.addField(':calendar_spiral: Joined Server', `\`${moment(member.joinedAt).format('DD.MM.YYYY')}\``);

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

        const lastWeekDate = moment().subtract(7, 'days').toISOString();
        const lastWeekVoice = await this._voiceStatRepository.createQueryBuilder('voiceStat')
            .select('count(Id)', 'min')
            .groupBy('voiceStat.userID')
            .where(`voiceStat.userID = ${member.id} AND voiceStat.timestamp > '${lastWeekDate}'`)
            .getRawOne();

        // get all levels to determine index of user (place in leaderboard)
        const levels = await this._userLevelRepository.find({ order: { exp: 'DESC' } });

        // find index of user in levels
        const index = levels.findIndex(l => l.userID === member.id);

        embed.addField(':envelope: Sent Messages', `\`${messageSats ? messageSats.msgCount : 0}x\``, true);
        embed.addField(':stopwatch: Voice Time', `\`Total: ${this._formatVoiceMinutes(voiceStats ? voiceStats.min : 0)}\`\n\`This week: ${this._formatVoiceMinutes(lastWeekVoice ? lastWeekVoice.min : 0)}\``, true);

        const expString = index >= 0 ? `\`${levels[index].exp}xp | ${index + 1}. place\`` : '\`0xp\`';
        embed.addField(':star: Experience', expString, true);

        if (!msg.author.dmChannel) {
            await msg.author.createDM();
        }
        await msg.author.dmChannel.send(embed).then(async () => {
            // Chart generation
            const fileName = new Date().getTime().toString();
            const filePath = `./database/${fileName}.png`;

            await this._generateUserStatChart(member.id, filePath);

            msg.channel.send(':love_letter: Check your DMs :)');
            // send chart
            await msg.author.dmChannel.send(new MessageAttachment(filePath));

            // delete chart after sending it to discord
            fs.unlinkSync(filePath);
        }).catch(() => {
            msg.channel.send('It seem like you have disabled direct messages from PR1SM. Please enable these so i can send your stats privately.');
            return;
        });
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

    private async _generateUserStatChart(userId: string, filePath: string) {
        const chartConfig = lineChart;
        const lastWeekDate = moment().hour(0).minute(0).add('1', 'day').subtract(7, 'days');

        const editable = moment(lastWeekDate);
        chartConfig.data.labels = [];
        for (let i = 1; i <= 7; i++) {
            chartConfig.data.labels.push(editable.format('DD.MM'));
            editable.add('1', 'day');
        }

        const lastWeekVoice: { timestamp: string }[] = await this._voiceStatRepository.createQueryBuilder('voiceStat')
            .select('timestamp', 'timestamp')
            .where(`voiceStat.userID = '${userId}' AND voiceStat.timestamp > '${lastWeekDate.toISOString()}'`)
            .getRawMany();

        const days: any[][] = [[], [], [], [], [], [], []];

        lastWeekVoice.forEach(voiceStat => {
            const day = moment(voiceStat.timestamp).diff(lastWeekDate, 'day');
            days[day].push(voiceStat);
        });
        const minutesPerDay = days.map(a => a.length);

        chartConfig.data.datasets[0].data = minutesPerDay;
        chartConfig.data.datasets[0].borderColor = '#429bb8';

        chartConfig.options.title.text = 'Voice minutes in the last week';

        await this._chartHandler.draw(1500, 1000, chartConfig, filePath);
    }
}
