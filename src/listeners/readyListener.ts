import { TextChannel } from 'discord.js';

import { Bot } from '../bot';
import config from '../config';

export class ReadyListener {

    private _logChannel: TextChannel;

    constructor(private _bot: Bot) { }

    public async evalReady() {
        console.log(`Logged in as ${this._bot.getClient().user.tag}`);
        this._logChannel = this._bot.getClient().channels.cache.get(config.logChannelID) as TextChannel;
        this._logChannel.send(':green_circle: Bot logged in.');
        this._bot.afterInit();
    }
}