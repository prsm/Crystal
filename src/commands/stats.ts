import fs from 'fs';
import { Message, MessageEmbed, Client, version, GuildMember, MessageAttachment } from 'discord.js';
import { Repository } from 'typeorm';
import moment from 'moment';

import { Bot } from '../bot';
import { MessageStat } from '../entities/messageStat';
import { VoiceStat } from '../entities/voiceStat';
import { ChartHandler } from '../handlers/chartHandler';
import { BotCommand } from '../customInterfaces';
import { lineChart } from '../chartConfig';

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
    private _chartHandler: ChartHandler;

    constructor(private _bot: Bot) {
        this._client = this._bot.getClient();
        this._messageStatRepository = this._bot.getDatabase().getMessageStatRepository();
        this._voiceStatRepository = this._bot.getDatabase().getVoiceStatRepository();
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
        embed.setColor(this._bot.getConfig().embedColor);

        embed.addField(':hash:Version', `**${this._bot.getConfig().botVersion}** | ${this._bot.getConfig().botVersionDate}`, true);
        embed.addField(':stopwatch:Uptime', `${this._formatUptime(process.uptime())}`, true);
        embed.addField(`Discord.js Version`, `v${version}`, true);
        embed.addField(`Node.js Version`, `${process.version}`, true);
        embed.addField(`:minidisc:Memory Used`, `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} mb`, true);

        const databaseStats = fs.statSync(this._bot.getConfig().DBPath);
        const fileSize = databaseStats.size / 1000 / 1000;
        embed.addField(':card_box: Database Size', `${fileSize.toFixed(1)} mb`, true);

        msg.channel.send(embed);
    }

    private async _userStats(msg: Message, args: string[], member: GuildMember) {
        const embed = new MessageEmbed();
        embed.setTitle(`Your server stats`);
        embed.setColor(member.displayHexColor);
        embed.setThumbnail(member.user.avatarURL({ dynamic: true }));
        embed.setDescription('_Tracking since 06.06.2020_');

        // get sent messages count
        const messageSats = await this._messageStatRepository.createQueryBuilder('messageStat')
            .select('count(Id)', 'count')
            .addSelect('userID')
            .groupBy('messageStat.userID')
            .orderBy('count', 'DESC')
            .getRawMany();
        const messagesCount = messageSats.find(msgs => msgs.userID === member.id) ? messageSats.find(msgs => msgs.userID === member.id).count : 0;
        const messagesRank = (messageSats.findIndex(msgs => msgs.userID === member.id) + 1) > 0 ? (messageSats.findIndex(msgs => msgs.userID === member.id) + 1) : '-';

        // get total voice minutes
        const voiceStats = await this._voiceStatRepository.createQueryBuilder('voiceStat')
            .select('count(Id)', 'min')
            .addSelect('userID')
            .groupBy('voiceStat.userID')
            .orderBy('min', 'DESC')
            .getRawMany();
        const voiceCount = voiceStats.find(voice => voice.userID === member.id) ? voiceStats.find(voice => voice.userID === member.id).min : 0;
        const voiceRank = (voiceStats.findIndex(voice => voice.userID === member.id) + 1) > 0 ? (voiceStats.findIndex(voice => voice.userID === member.id) + 1) : '-';

        const weekStartDate = moment().weekday(0).hour(0).minute(0).second(0);
        const thisWeekMessages = await this._messageStatRepository.createQueryBuilder('messageStat')
            .select('count(Id)', 'count')
            .addSelect('userID')
            .groupBy('messageStat.userID')
            .orderBy('count', 'DESC')
            .where(`messageStat.timestamp > '${weekStartDate.toISOString()}'`)
            .getRawMany();
        const thisWeekMessagesCount = thisWeekMessages.find(msgs => msgs.userID === member.id) ? thisWeekMessages.find(msgs => msgs.userID === member.id).count : 0;
        const thisWeekMessagesRank = (thisWeekMessages.findIndex(msgs => msgs.userID === member.id) + 1) > 0 ? (thisWeekMessages.findIndex(msgs => msgs.userID === member.id) + 1) : '-';
        const thisWeekVoice = await this._voiceStatRepository.createQueryBuilder('voiceStat')
            .select('count(Id)', 'min')
            .addSelect('userID')
            .groupBy('voiceStat.userID')
            .orderBy('min', 'DESC')
            .where(`voiceStat.timestamp > '${weekStartDate.toISOString()}'`)
            .getRawMany();
        const thisWeekVoiceCount = thisWeekVoice.find(voice => voice.userID === member.id) ? thisWeekVoice.find(voice => voice.userID === member.id).min : 0;
        const thisWeekVoiceRank = (thisWeekVoice.findIndex(voice => voice.userID === member.id) + 1) > 0 ? (thisWeekVoice.findIndex(voice => voice.userID === member.id) + 1) : '-';

        embed.addField(':envelope: Sent Messages', `Total: \`${messagesCount}x\` | Rank \`${messagesRank}\`\nThis week: \`${thisWeekMessagesCount}x\` | Rank \`${thisWeekMessagesRank}\``, true);
        embed.addField(':stopwatch: Voice Time', `Total: \`${this._formatVoiceMinutes(voiceCount)}\` | Rank \`${voiceRank}\`\nThis week: \`${this._formatVoiceMinutes(thisWeekVoiceCount)}\` | Rank \`${thisWeekVoiceRank}\``, true);

        if (!msg.author.dmChannel) {
            await msg.author.createDM();
        }
        await msg.author.dmChannel.send(embed).then(async () => {
            // Chart generation
            const fileName = new Date().getTime().toString();
            const voiceFilePath = `${this._bot.getConfig().TempPath}/voice_${fileName}.png`;
            const messageFilePath = `${this._bot.getConfig().TempPath}/message_${fileName}.png`;

            await this._generateUserVoiceStatChart(member.id, voiceFilePath);
            await this._generateUserMessageStatChart(member.id, messageFilePath);

            msg.channel.send(':love_letter: Check your DMs :)');
            // send chart
            await msg.author.dmChannel.send([new MessageAttachment(voiceFilePath), new MessageAttachment(messageFilePath)]);

            // delete chart after sending it to discord
            fs.unlinkSync(voiceFilePath);
            fs.unlinkSync(messageFilePath);
        }).catch(() => {
            msg.channel.send('It seem like you have disabled direct messages from SOS. Please enable these so I can send your stats privately.');
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

    private async _generateUserVoiceStatChart(userId: string, filePath: string) {
        const chartConfig = lineChart;
        const weekStartDate = moment().weekday(0).hour(0).minute(0).second(0);

        chartConfig.data.labels = [
            'Mo',
            'Di',
            'Mi',
            'Do',
            'Fr',
            'Sa',
            'So'
        ];

        // Fetch data from database
        const lastWeekVoice: { timestamp: string }[] = await this._voiceStatRepository.createQueryBuilder('voiceStat')
            .select('timestamp', 'timestamp')
            .where(`voiceStat.userID = '${userId}' AND voiceStat.timestamp > '${weekStartDate.toISOString()}'`)
            .getRawMany();

        const days: any[][] = [[], [], [], [], [], [], []];

        lastWeekVoice.forEach(voiceStat => {
            const day = moment(voiceStat.timestamp).diff(weekStartDate, 'day');
            days[day].push(voiceStat);
        });
        const minutesPerDay = days.map(a => a.length);

        chartConfig.data.datasets[0].data = minutesPerDay;
        chartConfig.data.datasets[0].borderColor = '#75d8ff';

        chartConfig.options.title.text = 'Voice minutes this week';

        await this._chartHandler.draw(1500, 1000, chartConfig, filePath);
    }

    private async _generateUserMessageStatChart(userId: string, filePath: string) {
        const chartConfig = lineChart;
        const weekStartDate = moment().weekday(0).hour(0).minute(0).second(0);

        chartConfig.data.labels = [
            'Mo',
            'Di',
            'Mi',
            'Do',
            'Fr',
            'Sa',
            'So'
        ];

        // Fetch data from database
        const lastWeekMessage: { timestamp: string }[] = await this._messageStatRepository.createQueryBuilder('messageStat')
            .select('timestamp', 'timestamp')
            .where(`messageStat.userID = '${userId}' AND messageStat.timestamp > '${weekStartDate.toISOString()}'`)
            .getRawMany();

        const days: any[][] = [[], [], [], [], [], [], []];

        // Create labels
        lastWeekMessage.forEach(messageStat => {
            const day = moment(messageStat.timestamp).diff(weekStartDate, 'day');
            days[day].push(messageStat);
        });
        const messagesPerDay = days.map(a => a.length);

        chartConfig.data.datasets[0].data = messagesPerDay;
        chartConfig.data.datasets[0].borderColor = '#ff67e4';

        chartConfig.options.title.text = 'Sent messages this week';

        await this._chartHandler.draw(1500, 1000, chartConfig, filePath);
    }
}
