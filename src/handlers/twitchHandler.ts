import { Client, TextChannel } from 'discord.js';
import express from 'express';
import rp from 'request-promise';
import { Repository } from 'typeorm';

import { iBot } from '../bot';
import { Config } from '../entities/config';
import config from '../config';

export class TwitchHandler {

    private _client: Client;

    private _app: any;

    private _twitchChannel: TextChannel;

    private _twitchToken: string;

    private _configRepository: Repository<Config>;

    constructor(private _botClient: iBot) {
        this._client = this._botClient.getClient();
        this._configRepository = this._botClient.getDatabase().getConfigRepository();

        this._app = express();
        this._app.use(express.json());
    }

    public async init() {
        // load twitchToken
        const twitchTokenConfig = (await this._configRepository.findOne({ where: { key: 'twitchToken' } }));
        if (twitchTokenConfig) this._twitchToken = twitchTokenConfig.value;

        this._twitchChannel = this._client.channels.cache.get(config.twitchStreamChannelID) as TextChannel;

        // set up express listeners for webhooks
        this._listenToWebhooks();

        // start express app
        this._app.listen(config.expressPort);
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
        await this._validateToken();

        this._subscribeToWebhooks();

        // resubscribe to webhooks after 9 days
        // More info here: https://dev.twitch.tv/docs/api/webhooks-guide#subscriptions
        this._setTimer();
    }

    private async _validateToken() {
        // If no twitch token was found, create a new one
        if (!this._twitchToken) {
            // TODO
            this._createTwitchToken();
            return;
        }

        let options = {
            method: 'GET',
            uri: `https://id.twitch.tv/oauth2/validate`,
            headers: {
                'authorization': `OAuth ${this._twitchToken}`
            },
            json: true
        };
        await rp(options).catch(async (err) => {
            if (err.statusCode === 401) {
                // TODO
                await this._renewToken();
            } else {
                console.error(err);
            }
        });
    }

    private async _subscribeToWebhooks() {
        // the subscribtions last 10 days, but i renew each after 9 days
        let options = {
            method: 'POST',
            uri: `https://api.twitch.tv/helix/webhooks/hub`,
            body: {
                'hub.mode': 'subscribe',
                'hub.callback': 'http://jannik66.ddns.net:7777/stream',
                'hub.lease_seconds': 864000,
                'hub.topic': ''
            },
            headers: {
                'authorization': `Bearer ${this._twitchToken}`
            },
            json: true
        };

        for (const userId of config.streamIDs) {
            options.body['hub.topic'] = `https://api.twitch.tv/helix/streams?user_id=${userId}`;
            await rp(options);
        }
    }

    private _setTimer() {
        // resubscribe webhooks after 9 days
        setTimeout(() => {
            this._initWebhooks();
        }, 100 * 60 * 60 * 24 * 9);
    }

    private _sendStreamNotification(data: any) {
        this._twitchChannel.send(`<@&${config.twitchRoleID}>, ${data.user_name} went live! Join here: https://www.twitch.tv/${data.user_name}`);
    }

    private async _renewToken() {
        console.log('renew twitch token');
    }

    // create a new twitch token
    private _createTwitchToken() {
        console.log('create twitch token');
    }

}