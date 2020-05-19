import { Client, TextChannel, Message } from 'discord.js';
import moment from 'moment';
import ns from 'node-schedule';

import { juicepress } from '../bot';
import config from '../config';
import { Repository } from 'typeorm';
import { Event } from '../entities/event';

export class ReminderHandler {

    private _client: Client;

    private _reminders: ns.Job[] = [];

    private _eventRepository: Repository<Event>;

    private _eventChannel: TextChannel;

    constructor(private _botClient: juicepress) {
        this._client = this._botClient.getClient();
        this._eventRepository = this._botClient.getDatabase().getEventRepository();
    }

    init() {
        this._eventChannel = this._client.channels.cache.get(config.eventChannelID) as TextChannel;
        this.loadReminders();
    }

    async loadReminders() {
        const events = await this._eventRepository.find();
        const filteredEvents = events.filter((e) => e.date > new Date());

        for (const job of this._reminders) {
            if (job) job.cancel();
        }
        this._reminders = [];
        for (const event of filteredEvents) {
            let remindTime: Date;
            if (event.withTime) {
                remindTime = moment(event.date).subtract('2', 'hours').toDate();
            } else {
                remindTime = moment(event.date).subtract('1', 'day').hour(5).toDate();
            }
            const job = ns.scheduleJob(remindTime, () => this._sendReminder(event));
            this._reminders.push(job);
        }
    }

    private async _sendReminder(event: Event) {
        const usersToRemind = (await this._eventRepository.findOne({ where: { id: event.id }, relations: ['remindedUsers'] })).remindedUsers;
        let channel: TextChannel;
        let pingString = '';
        if (event.channelID) {
            channel = this._client.channels.cache.get(event.channelID) as TextChannel;
        } else {
            channel = this._eventChannel;
        }
        for (const user of usersToRemind) {
            pingString += `<@${user.id}>`;
        }
        let reminderMessage: Message;
        if (event.withTime) {
            reminderMessage = await channel.send(`Event **${event.title}** is starting in 2 hours!\n\n${pingString}`);
        } else {
            reminderMessage = await channel.send(`Event **${event.title}** is starting tomorrow!\n\n${pingString}`);
        }
        if (!event.channelID) {
            this._botClient.getDatabase().getConnection().manager.insert('ReminderMsg', { messageId: reminderMessage.id, event });
        }
    }

}