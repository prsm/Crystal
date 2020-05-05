import { Client, MessageEmbed, CategoryChannel, TextChannel, GuildChannelManager, GuildMember, MessageReaction, User, Role, Message, Collection } from 'discord.js';
import { Repository } from 'typeorm';
import moment from 'moment';

import { iBot } from '../bot';
import { Event } from '../entities/event';
import config from '../config';

export class EventHandler {

    private _client: Client;

    private _eventCategory: CategoryChannel;

    private _eventChannel: TextChannel;

    private _eventRepository: Repository<Event>;

    // GuildChannelManager for creating new channels
    private _channelManager: GuildChannelManager;


    constructor(private _botClient: iBot) {
        this._client = this._botClient.getClient();
        this._eventRepository = this._botClient.getDatabase().getEventRepository()
    }

    public async init() {
        // channel manager for creating new channels
        this._channelManager = new GuildChannelManager(this._client.guilds.cache.get(config.iboisGuildID));

        // event category
        this._eventCategory = this._client.channels.cache.get(config.eventCategoryID) as CategoryChannel;

        // event text channel
        this._eventChannel = this._client.channels.cache.get(config.eventChannelID) as TextChannel;
        await this._eventChannel.messages.fetch();
    }

    public async createEvent(event: { [key: string]: any }, author: GuildMember) {
        let channel: TextChannel;
        let role: Role;
        let infos = '';
        if (event.date) {
            infos += `**Date**: ${event.withTime ? moment(event.date).format('DD.MM.YYYY HH:mm') : moment(event.date).format('DD.MM.YYYY')}\n`;
        }
        if (event.channel && event.channel.create) {
            role = await this._client.guilds.cache.get(config.iboisGuildID).roles.create({ data: { name: event.channel.name ? event.channel.name : event.title } });
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
            infos += `**Channel:**${channel.toString()}`
        }
        const embed = new MessageEmbed;
        if (event.color) {
            embed.setColor(event.color);
        };
        embed.setTitle(event.title);
        if (event.description) embed.setDescription(event.description);
        if (event.date || event.channel) embed.addField('Infos', infos);

        // HAS TO BE THE LAST FIELD
        embed.addField('Participants (0)', '\u200B');

        embed.setFooter('✅ Participate | ⏰ Reminder | ❌ Delete Event');
        embed.setAuthor(`${author.displayName}`, author.user.avatarURL());
        const eventMessage = await this._eventChannel.send(embed);
        await eventMessage.react('✅');
        await eventMessage.react('⏰');
        await eventMessage.react('❌');
        const databaseEvent: Partial<Event> = {
            channelID: channel ? channel.id : null,
            date: event.date ? moment(event.date).toDate() : null,
            title: event.title,
            eventMessageID: eventMessage.id,
            creatorID: author.user.id,
            roleID: role ? role.id : null
        }
        this._saveToDatabase(databaseEvent);
    }

    public async handleReaction(msgReaction: MessageReaction, user: User, action: 0 | 1) {
        const event = await this._eventRepository.findOne({ where: { eventMessageID: msgReaction.message.id } });

        // should not happen
        if (!event) return;

        if (action === 1) {
            switch (msgReaction.emoji.name) {
                case '✅':
                    await msgReaction.users.fetch();
                    this._updateParticipants(msgReaction.message, msgReaction.users.cache);
                    const role = msgReaction.message.guild.roles.cache.get(event.roleID);
                    if (role) {
                        msgReaction.message.guild.members.cache.get(user.id).roles.add(role);
                    }
                    break;
                //  TODO add reminder
                case '⏰':
                    break;
                case '❌':
                    // TODO: Also allow admins
                    if (event.creatorID === user.id) {
                        this._deleteEvent(event);
                    }
                    break;
            }
        } else {
            switch (msgReaction.emoji.name) {
                case '✅':
                    await msgReaction.users.fetch();
                    this._updateParticipants(msgReaction.message, msgReaction.users.cache);
                    const role = msgReaction.message.guild.roles.cache.get(event.roleID);
                    if (role) {
                        msgReaction.message.guild.members.cache.get(user.id).roles.remove(role);
                    }
                    break;
                //  TODO remove reminder
                case '⏰':
                    break;
            }
        }
    }

    private async _updateParticipants(eventMsg: Message, reactedUsers: Collection<string, User>) {
        const embed = eventMsg.embeds[0];
        embed.fields.splice(-1, 1);

        const participants = reactedUsers.array().filter(u => !u.bot).map(u => u.id);

        let participantString = '';
        if (participants.length === 0) {
            embed.addField(`Participants (${participants.length})`, '\u200B');
        } else {
            for (const userId of participants) {
                participantString += `> <@${userId}>\n`;
            }
            embed.addField(`Participants (${participants.length})`, participantString);
        }
        eventMsg.edit(null, embed);
    }

    private async _deleteEvent(event: Event) {
        this._eventChannel.messages.cache.get(event.eventMessageID).delete();
        if (event.channelID) {
            this._client.channels.cache.get(event.channelID).delete();
            this._client.guilds.cache.get(config.iboisGuildID).roles.cache.get(event.roleID).delete();
        }
        this._eventRepository.remove(event);
    }

    private _saveToDatabase(event: Partial<Event>) {
        this._eventRepository.save(event);
    }

}