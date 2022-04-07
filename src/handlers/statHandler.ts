import fs from 'fs';
import { Client, VoiceChannel, GuildMember, MessageEmbed, TextChannel, MessageAttachment } from 'discord.js';
import ns from 'node-schedule';
import moment, { Moment } from 'moment';

import { Bot } from '../bot';
import { Repository } from 'typeorm';
import { MessageStat } from '../entities/messageStat';
import { VoiceStat } from '../entities/voiceStat';
import { UserLevel } from '../entities/userLevel';
import { MemberCountStat } from '../entities/memberCountStat';
import { lineChart, barChart } from '../chartConfig';
import { ChartHandler } from './chartHandler';


export class StatHandler {

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

    private _chartHandler: ChartHandler;

    constructor(private _bot: Bot) {
        this._client = this._bot.getClient();
        this._messageStatRepository = this._bot.getDatabase().getMessageStatRepository();
        this._voiceStatRepository = this._bot.getDatabase().getVoiceStatRepository();
        this._memberCountStatRepository = this._bot.getDatabase().getMemberCountStatRepository();
        this._userLevelRepository = this._bot.getDatabase().getUserLevelRepository();
        this._chartHandler = new ChartHandler();
    }

    public init() {
        this._initTextChannelStats();
        this._initVoiceChannelStats();
        this._initMemberCountStats();
        this._initWeeklyBoard();
    }

    private _initTextChannelStats() {
        this._client.on('message', (msg) => {
            if (msg.author.bot) return;

            // if voice channel is not excluded
            if (!this._bot.getConfig().levelExcludedTextChannels.includes(msg.channel.id)) {
                this._messageStatRepository.insert({ channelID: msg.channel.id, userID: msg.author.id, timestamp: new Date() });
                this._addExperience(msg.author.id, this._bot.getConfig().experiencePerMsg);
            }
        });
    }

    private _initVoiceChannelStats() {
        // check voice connections every minute (to provide detailed voice stats)
        ns.scheduleJob('0 * * * * *', () => {
            /** Get all voice channels which:
                - Are in the rightserver
                - Aren't excluded from stats
                - Have more than one member in it
            */
            const voiceChannels = this._client.channels.cache.array().filter((c: any) => {
                return c.guild
                    && c.guild.id === this._bot.getConfig().guildID
                    && c.type === 'voice'
                    && !this._bot.getConfig().levelExcludedVoiceChannels.includes(c.id)
                    && c.members.filter((m: GuildMember) => !m.user.bot).size > 1
            });
            for (const c of voiceChannels) {
                const voiceChannel = c as VoiceChannel;
                voiceChannel.members.each(m => {
                    if (m.user.bot) return;

                    // If user is deafened, don't track him
                    if (m.voice.deaf) return;

                    this._voiceStatRepository.insert({ channelID: voiceChannel.id, userID: m.id, timestamp: new Date() });
                    this._addExperience(m.id, this._bot.getConfig().experiencePerVoiceMin);
                });
            }
        });
    }

    private _initMemberCountStats() {
        // check membercount every hour
        ns.scheduleJob('0 * * * *', () => {
            this._memberCountStatRepository.insert({ memberCount: this._client.guilds.cache.get(this._bot.getConfig().guildID).memberCount, timestamp: new Date() });
        });
    }

    // add experience to user
    private async _addExperience(userID: string, exp: number) {
        const user = await this._userLevelRepository.findOne(userID);
        if (!user) {
            this._userLevelRepository.save({ userID, exp });
        } else {
            this._userLevelRepository.save({ userID, exp: user.exp + exp });
        }
    }

    private _initWeeklyBoard() {
        ns.scheduleJob('0 22 * * 0', () => {
            this._generateWeekyBoard();
        });
    }

    private async _generateWeekyBoard() {
        const weekStartDate = moment().weekday(0).hour(0).minute(0).second(0);
        const beforeWeekStartDate = moment(weekStartDate).subtract(7, 'days');
        const embed = new MessageEmbed();
        const guild = this._client.guilds.cache.get(this._bot.getConfig().guildID);

        embed.setTitle(`SOS Weekly Leaderboard - KW  ${weekStartDate.format('ww')}`);
        embed.setColor(this._bot.getConfig().embedColor);
        embed.setThumbnail(guild.iconURL({ dynamic: true }));

        const membersAtWeekStart = await this._memberCountStatRepository.createQueryBuilder('memberCount')
            .select('memberCount', 'memberCount')
            .orderBy('timestamp')
            .where(`memberCount.timestamp > '${weekStartDate.toISOString()}'`)
            .getRawOne();

        embed.addField(':chart_with_upwards_trend:Member Growth', `\`${guild.memberCount - membersAtWeekStart.memberCount_memberCount}\``);
        embed.addField('\u200B', '\u200B');

        const lastWeekVoice: { count: number, timestamp: string, userID: string }[] = await this._voiceStatRepository.createQueryBuilder('voiceStat')
            .select('count(Id)', 'count')
            .addSelect('userID', 'userID')
            .groupBy('userID')
            .where(`voiceStat.timestamp > '${weekStartDate.toISOString()}'`)
            .getRawMany();

        const beforeLastWeekVoice: { count: number, timestamp: string, userID: string }[] = await this._voiceStatRepository.createQueryBuilder('voiceStat')
            .select('count(Id)', 'count')
            .addSelect('userID', 'userID')
            .groupBy('userID')
            .where(`voiceStat.timestamp > '${beforeWeekStartDate.toISOString()}' AND voiceStat.timestamp < '${weekStartDate.toISOString()}'`)
            .getRawMany();

        const voiceMemberCompared = Math.round(lastWeekVoice.length * 100 / beforeLastWeekVoice.length - 100);
        const voiceTimeCompared = Math.round(lastWeekVoice.map(v => v.count).reduce((a, b) => a + b) * 100 / beforeLastWeekVoice.map(v => v.count).reduce((a, b) => a + b) - 100);

        embed.addField(':loud_sound:Voice Stats', `Total members in voice: \`${lastWeekVoice.length}\` | \`${voiceMemberCompared > 0 ? `+${voiceMemberCompared}` : `${voiceMemberCompared}`}%\`\nTotal voice hours: \`${this._formatVoiceMinutes(lastWeekVoice.map(v => v.count).reduce((a, b) => a + b))}\` | \`${voiceTimeCompared > 0 ? `+${voiceTimeCompared}` : `${voiceTimeCompared}`}%\``, true);

        const lastWeekMessages: { count: number, timestamp: string, userID: string }[] = await this._messageStatRepository.createQueryBuilder('messageStat')
            .select('count(Id)', 'count')
            .addSelect('userID', 'userID')
            .groupBy('userID')
            .where(`messageStat.timestamp > '${weekStartDate.toISOString()}'`)
            .getRawMany();

        const beforeLastWeekMessages: { count: number, timestamp: string, userID: string }[] = await this._messageStatRepository.createQueryBuilder('messageStat')
            .select('count(Id)', 'count')
            .addSelect('userID', 'userID')
            .groupBy('userID')
            .where(`messageStat.timestamp > '${beforeWeekStartDate.toISOString()}' AND messageStat.timestamp < '${weekStartDate.toISOString()}'`)
            .getRawMany();

        const msgMemberCompared = Math.round(lastWeekMessages.length * 100 / beforeLastWeekMessages.length - 100);
        const msgMessagesCompared = Math.round(lastWeekMessages.map(m => m.count).reduce((a, b) => a + b) * 100 / beforeLastWeekMessages.map(m => m.count).reduce((a, b) => a + b) - 100);

        embed.addField(':pen_ballpoint:Message Stats', `Total message writers: \`${lastWeekMessages.length}\` | \`${msgMemberCompared > 0 ? `+${msgMemberCompared}` : `${msgMemberCompared}`}%\`\nTotal messages: \`${lastWeekMessages.map(m => m.count).reduce((a, b) => a + b)}x\` | \`${msgMessagesCompared > 0 ? `+${msgMessagesCompared}` : `${msgMessagesCompared}`}%\``, true);
        embed.addField('\u200B', '\u200B');

        const topVoiceMembers: { count: number, userID: string }[] = await this._voiceStatRepository.createQueryBuilder('voiceStat')
            .select('count(Id)', 'count')
            .addSelect('userID', 'userID')
            .groupBy('userID')
            .orderBy('count', 'DESC')
            .where(`voiceStat.timestamp > '${weekStartDate.toISOString()}'`)
            .limit(10)
            .getRawMany();

        embed.addField(':trophy:Top voice members', topVoiceMembers.map((tvm, i) => `${this._numbers[i]}<@${tvm.userID}>`), true);

        const topMessageMembers: { count: number, userID: string }[] = await this._messageStatRepository.createQueryBuilder('messageStat')
            .select('count(Id)', 'count')
            .addSelect('userID', 'userID')
            .groupBy('userID')
            .orderBy('count', 'DESC')
            .where(`messageStat.timestamp > '${weekStartDate.toISOString()}'`)
            .limit(10)
            .getRawMany();

        embed.addField(':trophy:Biggest writers', topMessageMembers.map((tmm, i) => `${this._numbers[i]}<@${tmm.userID}>`), true);

        const botChannel = this._client.channels.cache.get(this._bot.getConfig().botChannel) as TextChannel;

        // Chart generation
        const fileName = new Date().getTime().toString();
        const voiceStatFile = `${this._bot.getConfig().TempPath}/voiceStats${fileName}.png`;
        const messageStatFile = `${this._bot.getConfig().TempPath}/messageStats${fileName}.png`;
        const channelStatFile = `${this._bot.getConfig().TempPath}/channelStats${fileName}.png`;

        await this._generateVoiceStatChart(weekStartDate, voiceStatFile);
        await this._generateMessageStatChart(weekStartDate, messageStatFile);
        await this._generateChannelStatChart(weekStartDate, channelStatFile);

        await botChannel.send(`Server Stats for this week:`, embed);
        await botChannel.send([new MessageAttachment(voiceStatFile), new MessageAttachment(messageStatFile), new MessageAttachment(channelStatFile)]);
        // delete chart after sending it to discord
        fs.unlinkSync(voiceStatFile);
        fs.unlinkSync(messageStatFile);
        fs.unlinkSync(channelStatFile);
    }

    // format mintutes to a better readable format
    private _formatVoiceMinutes(minutes: number) {
        let duration = moment.duration(minutes, 'minutes');
        return (
            (duration.asHours() > 0 ? `${Math.floor(duration.asHours())}h ` : '') +
            `${duration.minutes()}m`
        );
    }

    private async _generateVoiceStatChart(weekStartDate: Moment, filePath: string) {
        const chartConfig = lineChart;

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
            .where(`voiceStat.timestamp > '${weekStartDate.toISOString()}'`)
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

    /**
    * Generate Sent Message Chart
    */
    private async _generateMessageStatChart(weekStartDate: Moment, filePath: string) {
        const chartConfig = lineChart;

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
            .where(`messageStat.timestamp > '${weekStartDate.toISOString()}'`)
            .getRawMany();

        const days: any[][] = [[], [], [], [], [], [], []];

        // Create labels
        lastWeekMessage.forEach(messageStat => {
            const day = moment(messageStat.timestamp).diff(weekStartDate, 'day');
            days[day].push(messageStat);
        });
        const messagesPerDay = days.map(a => a.length);

        chartConfig.data.datasets[0].data = messagesPerDay;
        chartConfig.data.datasets[0].borderColor = '#b375ff';

        chartConfig.options.title.text = 'Sent messages this week';

        await this._chartHandler.draw(1500, 1000, chartConfig, filePath);
    }

    /**
     * Generate Bar chart with the most active text channels
     */
    private async _generateChannelStatChart(weekStartDate: Moment, filePath: string) {
        const chartConfig = barChart;

        chartConfig.data.labels = [];

        // Fetch data from database
        const lastWeekMessageChannels: { channelID: string, count: number }[] = await this._messageStatRepository.createQueryBuilder('messageStat')
            .select('channelID', 'channelID')
            .addSelect('count(*)', 'count')
            .groupBy('channelID')
            .orderBy('count', 'DESC')
            .limit(7)
            .where(`messageStat.timestamp > '${weekStartDate.toISOString()}'`)
            .getRawMany();

        // Create labels
        lastWeekMessageChannels.forEach(lmc => {
            const channel = this._client.channels.cache.get(lmc.channelID) as TextChannel;
            if (channel) {
                chartConfig.data.labels.push(channel.name);
            } else {
                chartConfig.data.labels.push(lmc.channelID);
            }
        });

        const channels: number[] = [];

        lastWeekMessageChannels.forEach((messageStat, i) => {
            channels.push(messageStat.count);
        });

        chartConfig.data.datasets[0].data = channels;
        chartConfig.data.datasets[0].backgroundColor = ['#ff6969', '#ffb56b', '#ebff6b', '#75ffb8', '#75d8ff', '#7875ff', '#b375ff'];

        chartConfig.options.title.text = 'Top text channels last week';

        await this._chartHandler.draw(1500, 1000, chartConfig, filePath);
    }

}