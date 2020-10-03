import { Client, TextChannel, User } from 'discord.js';
import moment from 'moment';
import * as ns from 'node-schedule';

import { Bot } from '../bot';

export class LockChannelHandler {

    private _client: Client;

    private _lockedChannels: LockChannel[] = [];

    constructor(private _bot: Bot) {
        this._client = this._bot.getClient();
    }

    public async lockChannel(channel: TextChannel, user: User, endTime: Date, amount: number): Promise<void> {
        if (this._lockedChannels.find(lockedChannel => lockedChannel.channelID === channel.id)) {
            channel.send(`:no_entry_sign: This channel is already locked until \`${moment(this._lockedChannels.find(lockedChannel => lockedChannel.channelID === channel.id).endTime).format('DD.MM.YYYY HH:mm:ss')}\``);
            return;
        }

        // load permissions and set all to deny "SEND_MESSAGES"
        const permissions = channel.permissionOverwrites;
        permissions.map(permission => {
            permission.update({
                'SEND_MESSAGES': false
            });
        });

        // edit permissions of channel
        await channel.overwritePermissions(permissions, `lockChannel command from Crystal, used by user ${user.id}`);
        
        // send info msg
        const botMsg = await channel.send(`:lock: ${user.toString()} locked this channel for ${amount} ${amount > 1 ? 'minutes' : 'minute'}.\nThis channel will be unlocked again at \`${moment(endTime).format('DD.MM.YYYY HH:mm:ss')}\`\n\nReact with :alarm_clock: to get notified as soon as this channel gets unlocked.`);
        botMsg.react('⏰');

        // add channel to locked channel array
        const lockChannel: LockChannel = {
            channelID: channel.id,
            oldPermissions: channel.permissionOverwrites,
            lockerID: user.id,
            endTime,
            botMsgID: botMsg.id
        };
        this._lockedChannels.push(lockChannel);

        // init schedule to unlock channel again
        this._initSchedule(lockChannel);
    }

    private _initSchedule(lockChannel: LockChannel) {
        ns.scheduleJob(lockChannel.endTime, () => this._unlockChannel(lockChannel));
    }


    // unlock channel and notify users
    private async _unlockChannel(lockChannel: LockChannel) {
        const textChannel = this._client.channels.cache.get(lockChannel.channelID) as TextChannel;
        await textChannel.overwritePermissions(lockChannel.oldPermissions, `lockChannel command from Crystal, used by user ${lockChannel.lockerID}`);
        this._lockedChannels.splice(this._lockedChannels.indexOf(lockChannel, 1));
        const reminders = textChannel.messages.cache.get(lockChannel.botMsgID).reactions.cache.find(reaction => reaction.emoji.name === '⏰').users.cache.filter(u => !u.bot);
        textChannel.send(`:white_check_mark: This channel is now unlocked. Happy typing!\n\n${reminders.map(u => `${u.toString()}`).join(' ')}`);
    }

}

interface LockChannel { channelID: string, oldPermissions: any, lockerID: string, endTime: Date, botMsgID: string };