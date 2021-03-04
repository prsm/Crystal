import { Client, MessageEmbed, CategoryChannel, TextChannel, GuildChannelManager, GuildMember, MessageReaction, User, Role, Message, Collection } from 'discord.js';
import { Repository } from 'typeorm';
import moment from 'moment';

import { Bot } from '../bot';
import { Event } from '../entities/event';
import { User as UserEntity } from '../entities/user';
import { Role as RoleEntity } from '../entities/role';
import { EventUser } from '../entities/eventUser';
import { ReminderHandler } from './reminderHandler';
import { ReminderMsg } from '../entities/reminderMsg';
import { RoleHandler } from './roleHandler';
import { RoleType } from '../customInterfaces';

export class EventHandler {

    private _client: Client;

    private _reminderHandler: ReminderHandler;

    private _roleHandler: RoleHandler;

    private _eventCategory: CategoryChannel;

    private _eventChannel: TextChannel;

    private _eventRepository: Repository<Event>;

    private _userRepository: Repository<UserEntity>;
    private _eventUserRepository: Repository<EventUser>;
    private _roleRepository: Repository<RoleEntity>;

    // GuildChannelManager for creating new channels
    private _channelManager: GuildChannelManager;


    constructor(private _bot: Bot) {
        this._client = this._bot.getClient();
        this._eventRepository = this._bot.getDatabase().getEventRepository();
        this._userRepository = this._bot.getDatabase().getUserRepository();
        this._eventUserRepository = this._bot.getDatabase().getEventUserRepository();
        this._roleRepository = this._bot.getDatabase().getRoleRepository();
    }

    public async init() {
        // channel manager for creating new channels
        this._channelManager = new GuildChannelManager(this._client.guilds.cache.get(this._bot.getConfig().guildID));

        // event category
        this._eventCategory = this._client.channels.cache.get(this._bot.getConfig().eventCategoryID) as CategoryChannel;

        // event text channel
        this._eventChannel = this._client.channels.cache.get(this._bot.getConfig().eventChannelID) as TextChannel;
        await this._eventChannel.messages.fetch();

        this._reminderHandler = this._bot.getReminderHandler();
        this._roleHandler = this._bot.getRoleHandler();
    }

    public async createEvent(event: { [key: string]: any }, author: GuildMember) {
        let channel: TextChannel;
        let role: Role;
        let infos = '';
        if (event.date) {
            infos += `**Date**: ${event.withTime ? moment(event.date).format('DD.MM.YYYY HH:mm') : moment(event.date).format('DD.MM.YYYY')}\n`;
        }
        if (event.channel && event.channel.create) {
            role = await this._client.guilds.cache.get(this._bot.getConfig().guildID).roles.create({ data: { name: event.channel.name ? event.channel.name : event.title } });
            channel = await this._channelManager.create(event.channel.name ? event.channel.name : event.title, {
                parent: this._eventCategory,
                permissionOverwrites: [
                    {
                        id: author.guild.id,
                        deny: ['VIEW_CHANNEL']
                    }, {
                        id: role.id,
                        allow: ['VIEW_CHANNEL']
                    }]
            })
            infos += `**Channel:**${channel.toString()}\n`;
        }

        if (event.roles) {
            infos += `**Required Role${event.roles.length > 1 ? 's' : ''}:**\n`;
            event.roles.forEach((role: string) => {
                infos += `> <@&${role}>\n`;
            });
        }

        const embed = new MessageEmbed;
        if (event.color) {
            embed.setColor(event.color);
        };
        embed.setTitle(event.title);
        if (event.description) embed.setDescription(event.description);
        if (event.date || event.channel || event.roles) embed.addField('Infos', infos);

        // HAS TO BE THE LAST FIELD
        embed.addField(`Participants (0${event.limit ? `/${event.limit}` : ''})`, '\u200B');

        embed.setFooter(`✅ Participate | ${event.date ? '⏰ Reminder | ' : ''}${event.channel ? '💾 Archive Channel | ' : ''}❌ Delete Event`);
        embed.setAuthor(`${author.displayName}`, author.user.avatarURL());
        const eventMessage = await this._eventChannel.send(embed);
        await eventMessage.react('✅');
        if (event.date) {
            await eventMessage.react('⏰');
        }
        if (event.channel) {
            await eventMessage.react('💾');
        }
        await eventMessage.react('❌');
        const databaseEvent: Partial<Event> = {
            channelID: channel ? channel.id : null,
            date: event.date ? moment(event.date).toDate() : null,
            title: event.title,
            eventMessageID: eventMessage.id,
            creatorID: author.user.id,
            roleID: role ? role.id : null,
            withTime: event.withTime,
            limit: event.limit,
            roles: []
        }

        if (event.roles) {
            for (const role of event.roles) {
                const roleEntity: RoleEntity = { id: role };
                this._roleRepository.save(roleEntity);
                databaseEvent.roles.push(roleEntity);
            }
        }

        await this._saveToDatabase(databaseEvent);
        this._reminderHandler.loadReminders();
    }

    public async handleReaction(msgReaction: MessageReaction, user: User, action: 0 | 1) {
        const event = await this._eventRepository.findOne({ where: { eventMessageID: msgReaction.message.id }, relations: ['reminderMsgs', 'participants', 'roles'] });

        // should not happen
        if (!event) return;

        if (action === 1) {
            switch (msgReaction.emoji.name) {
                case '✅':
                    await msgReaction.users.fetch();
                    if (event.roles.length > 0) {
                        const memberRoles = this._client.guilds.cache.get(this._bot.getConfig().guildID).members.cache.get(user.id).roles.cache;
                        if (memberRoles.some(role => event.roles.some(r => r.id === role.id))) {
                            this._updateParticipants(msgReaction.message, user, action, event);
                            if (event.roleID) this._roleHandler.addRole(msgReaction.message.guild.members.cache.get(user.id), event.roleID, RoleType.EVENTROLE);
                        } else {
                            if (!user.dmChannel) {
                                await user.createDM();
                            }
                            await user.dmChannel.send(':x: You can\'t participate in this event because you don\'t have any of the required roles.').catch(() => {
                                // User has dms disabled for this server.
                            });
                            msgReaction.users.remove(user.id);
                        }
                    } else {
                        this._updateParticipants(msgReaction.message, user, action, event);
                        if (event.roleID) this._roleHandler.addRole(msgReaction.message.guild.members.cache.get(user.id), event.roleID, RoleType.EVENTROLE);
                    }
                    break;
                case '⏰':
                    if (event.date) {
                        await msgReaction.users.fetch();
                        this._updateReminders(msgReaction.message.id, msgReaction.users.cache);
                    }
                    break;
                case '💾':
                    if (event.creatorID === user.id ||
                        this._client.guilds.cache.get(this._bot.getConfig().guildID).members.cache.get(user.id).hasPermission('ADMINISTRATOR') ||
                        this._client.guilds.cache.get(this._bot.getConfig().guildID).members.cache.get(user.id).roles.cache.has(this._bot.getConfig().moderatorRoleID)
                    ) {
                        this._archiveEventChannel(event);
                    }
                    break;
                case '❌':
                    if (event.creatorID === user.id ||
                        this._client.guilds.cache.get(this._bot.getConfig().guildID).members.cache.get(user.id).hasPermission('ADMINISTRATOR') ||
                        this._client.guilds.cache.get(this._bot.getConfig().guildID).members.cache.get(user.id).roles.cache.has(this._bot.getConfig().moderatorRoleID)) {
                        this._deleteEvent(event);
                    }
                    break;
            }
        } else {
            switch (msgReaction.emoji.name) {
                case '✅':
                    await msgReaction.users.fetch();
                    this._updateParticipants(msgReaction.message, user, action, event);
                    if (event.roleID) this._roleHandler.removeRole(msgReaction.message.guild.members.cache.get(user.id), event.roleID, RoleType.EVENTROLE);
                    break;
                case '⏰':
                    if (event.date) {
                        await msgReaction.users.fetch();
                        this._updateReminders(msgReaction.message.id, msgReaction.users.cache);
                    }
                    break;
            }
        }
    }

    private async _updateParticipants(eventMsg: Message, user: User, action: 0 | 1, event: Event) {
        const embed = eventMsg.embeds[0];

        switch (action) {
            case 0:
                await this._eventUserRepository.delete({ userId: user.id, event });
                break;
            case 1:
                const eventUser: Partial<EventUser> = { userId: user.id, joined: new Date().getTime(), event };
                await this._eventUserRepository.insert(eventUser);
                break;
        }
        event = await this._eventRepository.findOne({ where: { id: event.id }, relations: ['reminderMsgs', 'participants'] });

        if (!event.limit ||
            event.participants.length <= event.limit + 1 && action === 1 ||
            event.participants.length < event.limit && action === 0) {
            embed.fields.splice(-1, 1);
        } else {
            embed.fields.splice(-1, 1);
            embed.fields.splice(-1, 1);
        }

        let participants = event.participants;

        if (event.limit) {
            participants = participants.sort((a, b) => a.joined - b.joined);
            const realParticipants = participants.slice(0, event.limit);
            const waitingBench = participants.slice(event.limit);

            let participantString = '';
            if (realParticipants.length === 0) {
                embed.addField(`Participants (${realParticipants.length}/${event.limit})`, '\u200B');
            } else {
                for (const participant of realParticipants) {
                    participantString += `> <@${participant.userId}>\n`;
                }
                embed.addField(`Participants (${realParticipants.length}/${event.limit})`, participantString);
            }

            let waitingBenchString = '';
            if (waitingBench.length > 0) {
                for (let i = 0; i < waitingBench.length; i++) {
                    waitingBenchString += `> ${i + 1}. <@${waitingBench[i].userId}>\n`;
                }
                embed.addField(`Waiting Bench`, waitingBenchString);
            }
        } else {
            let participantString = '';
            if (participants.length === 0) {
                embed.addField(`Participants (${participants.length})`, '\u200B');
            } else {
                for (const participant of participants) {
                    participantString += `> <@${participant.userId}>\n`;
                }
                embed.addField(`Participants (${participants.length})`, participantString);
            }
        }

        eventMsg.edit(null, embed);
    }

    private async _updateReminders(eventMsgId: string, reactedUsers: Collection<string, User>) {
        const event = await this._eventRepository.findOne({ where: { eventMessageID: eventMsgId }, relations: ['remindedUsers'] });
        const participants = reactedUsers.array().filter(u => !u.bot).map(u => u.id);
        event.remindedUsers = [];
        for (const user of participants) {
            const userEntity: UserEntity = { id: user };
            this._userRepository.save(userEntity);
            event.remindedUsers.push(userEntity);
        }
        this._eventRepository.save(event);
    }

    private async _archiveEventChannel(event: Event) {
        if (event.channelID) {
            const eventChannel = this._client.channels.cache.get(event.channelID) as TextChannel;
            // move eventChannel in archive category and sync permissions
            await eventChannel.setParent(this._bot.getConfig().archiveCategoryID);

            // it seems like that sometimes, lockPermissions don't work right after changing the parent
            // Wait 1 second before locking the permissions, this doesn't have any bad side effects
            setTimeout(() => {
                eventChannel.lockPermissions();
            }, 1000);
        }
    }

    private async _deleteEvent(event: Event) {
        await this._eventChannel.messages.fetch();
        this._eventChannel.messages.cache.get(event.eventMessageID).delete();
        if (event.channelID) {
            this._client.guilds.cache.get(this._bot.getConfig().guildID).roles.cache.get(event.roleID).delete();
        }
        for (const reminderMsg of event.reminderMsgs) {
            this._eventChannel.messages.cache.get(reminderMsg.messageId).delete();
        }
        await this._eventUserRepository.delete({ event });
        await this._bot.getDatabase().getConnection().getRepository(ReminderMsg).delete({ event });
        await this._eventRepository.remove(event);
        this._reminderHandler.loadReminders();
    }

    private async _saveToDatabase(event: Partial<Event>) {
        await this._eventRepository.save(event);
    }

}