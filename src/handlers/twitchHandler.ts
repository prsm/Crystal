import { Client, TextChannel, MessageEmbed } from 'discord.js';
import express from 'express';
import fetch from 'node-fetch';
import { Repository } from 'typeorm';

import { Bot } from '../bot';
import { Config } from '../entities/config';

export class TwitchHandler {

    private _client: Client;

    private _app: any;

    private _twitchChannel: TextChannel;

    private _twitchToken: string;

    private _configRepository: Repository<Config>;

    private _logChannel: TextChannel;

    constructor(private _bot: Bot) {
        this._client = this._bot.getClient();
        this._configRepository = this._bot.getDatabase().getConfigRepository();

        this._app = express();
        this._app.use(express.json());
    }

    public async init() {
        // load twitchToken
        const twitchTokenConfig = (await this._configRepository.findOne({ where: { key: 'twitchToken' } }));
        if (twitchTokenConfig) this._twitchToken = twitchTokenConfig.value;

        this._twitchChannel = this._client.channels.cache.get(this._bot.getConfig().twitchStreamChannelID) as TextChannel;
        this._logChannel = this._bot.getClient().channels.cache.get(this._bot.getConfig().logChannelID) as TextChannel;

        // set up express listeners for webhooks
        this._listenToWebhooks();

        // start express app
        this._app.listen(this._bot.getConfig().callbackPort);
        this._initWebhooks();
    }

    private _listenToWebhooks() {
        // to register a webhook, I have to send a 200 response with the hub.challenge
        this._app.get('/stream', (req: any, res: any) => {
            const challenge = req.query['hub.challenge'];
            res.set('Content-Type', 'text/plain')
            res.send(challenge);
        });

        // if a webhook is received, process it and send stream notification if user is live
        this._app.post('/stream', (req: any, res: any) => {
            if (req.body.data && req.body.data.length > 0) {
                this._sendStreamNotification(req.body.data[0]);
            }

            // respond with 200 to let twitch know I'm still listening
            res.sendStatus(200);
        });
    }

    private async _initWebhooks() {
        // Twitch wants to validate the token on a regular basis.
        // More info here: https://dev.twitch.tv/docs/authentication#validating-requests
        const validToken = await this._validateToken();
        if (!validToken) {
            this._logChannel.send(':warning: Twitch token is invalid. I\'m creating a new one...');
            this._createTwitchToken();
            return;
        }
        this._subscribeToWebhooks();

        // resubscribe to webhooks after 9 days
        // More info here: https://dev.twitch.tv/docs/api/webhooks-guide#subscriptions
        this._setTimer();
    }

    private async _validateToken() {
        // If no twitch token was found, create a new one
        if (!this._twitchToken) {
            return false;
        }

        let options = {
            method: 'GET',
            headers: {
                'authorization': `OAuth ${this._twitchToken}`
            }
        };
        const result = await fetch('https://id.twitch.tv/oauth2/validate', options).catch(async (err) => {
            if (err.statusCode !== 401) {
                console.error(err);
            }
        });
        return result && result.status === 200 ? true : false;
    }

    private async _subscribeToWebhooks() {
        const body = {
            'hub.mode': 'subscribe',
            'hub.callback': `http://${this._bot.getConfig().callbackURL}:${this._bot.getConfig().callbackPort}/stream`,
            'hub.lease_seconds': 864000,
            'hub.topic': ''
        };
        // the subscriptions last 10 days, but i renew each after 9 days
        let options = {
            method: 'POST',
            body: '',
            headers: {
                'content-type': 'application/json',
                'authorization': `Bearer ${this._twitchToken}`,
                'client-id': this._bot.getConfig().twitchClientID
            }
        };

        for (const userId of this._bot.getConfig().streamIDs) {
            body["hub.topic"] = `https://api.twitch.tv/helix/streams?user_id=${userId}`;
            options.body = JSON.stringify(body);
            await fetch(`https://api.twitch.tv/helix/webhooks/hub`, options);
        }
        this._logChannel.send(':purple_circle: Subscribed to Twitch webhooks.');
    }

    private _setTimer() {
        // resubscribe webhooks after 9 days
        setTimeout(() => {
            this._initWebhooks();
        }, 1000 * 60 * 60 * 24 * 9);
    }

    private _sendStreamNotification(data: any) {
        const embed = new MessageEmbed();
        embed.setColor(this._bot.getConfig().embedColor);
        embed.setTitle(`${data.title}`);
        embed.setDescription(`<@${this._bot.getConfig().twitchUsers[data.user_id]}> went live!\n\n<:twitch:718751320386830367> [Join here](https://www.twitch.tv/${data.user_name})`);
        this._twitchChannel.send(`<@&${this._bot.getConfig().twitchRoleID}>`, embed);
    }

    // create a new twitch token (app tokens can't be renewed)
    private async _createTwitchToken() {
        const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${this._bot.getConfig().twitchClientID}&client_secret=${this._bot.getConfig().twitchClientSecret}&grant_type=client_credentials`, { method: 'POST' }).catch(async (err) => {
            console.error(err);
        });;
        if (!response) {
            this._logChannel.send(':warning: Something went wrong when creating a new Twitch token');
            return;
        }
        const parsed = await response.json();
        await this._configRepository.save({ key: 'twitchToken', value: parsed.access_token });
        this._twitchToken = parsed.access_token;
        this._logChannel.send(':green_circle: Created a new Twitch token.');
        this._initWebhooks();
    }

}