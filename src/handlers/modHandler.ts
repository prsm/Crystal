import { Guild } from 'discord.js';
import { Repository } from 'typeorm';
import { Client, User, MessageEmbed, GuildMember, TextChannel, MessageReaction, Message, CollectorFilter } from 'discord.js';

import moment from 'moment';

import { Bot } from '../bot';
import config from '../config';
import { ServerMember } from '../entities/serverMember';

export class ModHandler {

    private _client: Client;

    private _guild: Guild;
    private modChannel: TextChannel;

    private _serverMemberRepository: Repository<ServerMember>;

    private reacionTimelimit = 5 * 60 * 1000;

    private _moderationStates = [
        'Clean',
        'Warning',
        '7 Day Ban',
        'Lifetime Ban'
    ]

    constructor(private _bot: Bot, private _modMember: GuildMember) {
        this._client = this._bot.getClient();
        this._guild = this._client.guilds.cache.get(config.guildID);
        this.modChannel = this._client.channels.cache.get(config.moderationChannelID) as TextChannel;
        this._serverMemberRepository = this._bot.getDatabase().getServerMemberRepository();
    }

    public async startInterface() {
        const embed = new MessageEmbed;
        embed.setTitle('PR1SM Moderation');
        embed.setColor(0x75ffb8);
        embed.setAuthor(this._modMember.displayName, this._modMember.user.avatarURL());
        embed.setDescription('What would you like to do?');
        embed.addField('Options', ':clipboard: Overview of punished members\n:hammer: Punish a member\n:x: Close interface');

        const m = await this.modChannel.send(embed);

        const filter = (reaction: MessageReaction, user: User) => {
            return ['📋', '🔨', '❌'].includes(reaction.emoji.name) && user.id == this._modMember.id;
        };

        this._awaitInterfaceReactions(m, filter);

        await m.react('📋');
        await m.react('🔨');
        await m.react('❌');
    }

    private async _awaitInterfaceReactions(m: Message, filter: CollectorFilter) {
        m.awaitReactions(filter, { max: 1, time: this.reacionTimelimit, errors: ['time'] })
            .then(async (collected) => {
                const reaction = collected.first();
                if (!reaction) return;
                if (reaction.emoji.name === '📋') {
                    // remove all reactions
                    await m.reactions.removeAll();
                    this._showOverview(m);
                } else if (reaction.emoji.name === '🔨') {
                    // remove all reactions
                    await m.reactions.removeAll();
                    this._punishMember(m);
                } else if (reaction.emoji.name === '❌') {
                    // trash the message instantly, returning so the listener fully stops
                    return await m.delete();
                } else {
                    this._awaitInterfaceReactions(m, filter);
                }
            }).catch(() => {
                m.reactions.removeAll();
            });
    }

    private async _showOverview(m: Message) {
        const embed = new MessageEmbed;
        embed.setTitle('PR1SM Moderation');
        embed.setColor(0x75ffb8);
        embed.setAuthor(this._modMember.displayName, this._modMember.user.avatarURL());
        embed.setDescription('Punished members');

        const serverMembers = await this._serverMemberRepository.find();
        const punishedMembers = serverMembers.filter(sm => sm.moderationState !== 0);

        await this._guild.members.fetch();

        punishedMembers.forEach(async pm => {
            if (pm.moderationState > 1) {
                const bannedUsers = await this._guild.fetchBans();
                const bannedUser = bannedUsers.find(bu => bu.user.id === pm.id);
                const punishDate = moment(pm.moderationDate).format('DD.MM.YYYY HH:mm');
                const unbanIn = moment(moment(pm.moderationDate).add(7, 'days')).fromNow();
                const stateBack = moment(moment(pm.moderationDate).add(3, 'months')).format('DD.MM.YYYY HH:mm');
                embed.addField(`${bannedUser.user.tag} | \`${bannedUser.user.id}\``, `**State:** ${this._moderationStates[pm.moderationState]}\n**Reason:** ${pm.moderationReason}\n**Date**: \`${punishDate}\`\n**State back at:** ${stateBack}${pm.moderationState === 2 ? `\n**Unban in:** ${unbanIn}` : ''}\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`);
            } else {
                const member = this._guild.members.cache.get(pm.id);
                const punishDate = moment(pm.moderationDate).format('DD.MM.YYYY HH:mm');
                const stateBack = moment(moment(pm.moderationDate).add(3, 'months')).format('DD.MM.YYYY HH:mm');
                embed.addField(`${member.displayName} | \`${member.user.tag}\` | \`${member.user.id}\``, `State: \`${this._moderationStates[pm.moderationState]}\`\nReason: \`${pm.moderationReason}\`\nDate: \`${punishDate}\`\nState back at: \`${stateBack}\`\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`);
            }
        });

        if (punishedMembers.length === 0) {
            embed.addField(':x:', 'No members found.');
        }

        m.edit(null, embed);
    }

    private async _punishMember(m: Message) {
        const embed = new MessageEmbed;
        embed.setTitle('PR1SM Moderation');
        embed.setColor(0x75ffb8);
        embed.setAuthor(this._modMember.displayName, this._modMember.user.avatarURL());
        embed.setDescription('Please enter the id of the user you want to punish:');

        m.edit(null, embed);
    }

}