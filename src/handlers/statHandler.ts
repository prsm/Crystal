import { Client, VoiceChannel, GuildMember } from 'discord.js';
import ns from 'node-schedule';

import { Bot } from '../bot';
import { Repository } from 'typeorm';
import { MessageStat } from '../entities/messageStat';
import { VoiceStat } from '../entities/voiceStat';
import config from '../config';
import { UserLevel } from '../entities/userLevel';
import { MemberCountStat } from '../entities/memberCountStat';

export class StatHandler {

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

    public init() {
        this._initTextChannelStats();
        this._initVoiceChannelStats();
        this._initMemberCountStats();
    }

    private _initTextChannelStats() {
        this._client.on('message', (msg) => {
            if (msg.author.bot) return;

            // if voice channel is not excluded
            if (!config.levelExcludedTextChannels.includes(msg.channel.id)) {
                this._messageStatRepository.insert({ channelID: msg.channel.id, userID: msg.author.id, timestamp: new Date() });
                this._addExperience(msg.author.id, config.experiencePerMsg);
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
                    && c.guild.id === config.guildID
                    && c.type === 'voice'
                    && !config.levelExcludedVoiceChannels.includes(c.id)
                    && c.members.filter((m: GuildMember) => !m.user.bot).size > 1
            });
            for (const c of voiceChannels) {
                const voiceChannel = c as VoiceChannel;
                voiceChannel.members.each(m => {
                    if (m.user.bot) return;

                    // If user is deafened, don't track him
                    if (m.voice.deaf) return;

                    this._voiceStatRepository.insert({ channelID: voiceChannel.id, userID: m.id, timestamp: new Date() });
                    this._addExperience(m.id, config.experiencePerVoiceMin);
                });
            }
        });
    }

    private _initMemberCountStats() {
        // check membercount every hour
        ns.scheduleJob('0 * * * *', () => {
            this._memberCountStatRepository.insert({ memberCount: this._client.guilds.cache.get(config.guildID).memberCount, timestamp: new Date() });
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

}