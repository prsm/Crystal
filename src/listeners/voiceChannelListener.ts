import { VoiceState, VoiceChannel, GuildChannelManager, CategoryChannel } from 'discord.js';

import { juicepress } from '../bot';
import config from '../config';

export class VoiceChannelListener {

    // GuildChannelManager for creating new channels
    private _channelManager: GuildChannelManager;

    // dynamic voice category
    private _dynamicCategory: CategoryChannel;

    // all relevant voice channels with name and connected user count
    private _voiceChannels: { id: string, name: string, connectedUserCount: number }[] = [];

    constructor(private _botClient: juicepress) { }

    public async evalVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
        // if user changed the voice channel (join, leave, channel switch)
        if (oldState.channelID !== newState.channelID) {
            // if previous state was a channel
            if (oldState.channelID) {
                // if voice channel is in the dynamic voice category, update usercount for channel
                if (oldState.channel.parentID === config.dynamicVoiceCategoryID) {
                    this._voiceChannels.find(vc => vc.id === oldState.channelID).connectedUserCount--;
                }
            }
            // if new state was a channel
            if (newState.channelID) {
                // if voice channel is in the dynamic voice category, update usercount for channel
                if (newState.channel.parentID === config.dynamicVoiceCategoryID) {
                    this._voiceChannels.find(vc => vc.id === newState.channelID).connectedUserCount++;
                }
            }
        }
        // refresh voice channels
        this._refreshDynamicChannels();
    }

    // called on bot login
    // init parameters
    public async loadVoiceChannels() {
        // channel manager for creating new channels
        this._channelManager = new GuildChannelManager(this._botClient.getClient().guilds.cache.get(config.juicyyGuildID));

        // dynamic voice category
        this._dynamicCategory = this._botClient.getClient().channels.cache.get(config.dynamicVoiceCategoryID) as CategoryChannel;

        // get all relevant voice channels
        const voicechannels = this._botClient.getClient().channels.cache.filter((c) => {
            if (c.type !== 'voice') return false;
            const voiceChannel = c as VoiceChannel;
            if (voiceChannel.parentID && voiceChannel.parentID === config.dynamicVoiceCategoryID) return true;
            return false;
        });

        // save voice channels to array
        for (const channel of voicechannels) {
            const vc = channel[1] as VoiceChannel;
            await vc.fetch();
            this._voiceChannels.push({ id: vc.id, name: vc.name, connectedUserCount: vc.members.size });
        }

        // refresh voice channels
        this._refreshDynamicChannels();
    }

    // refresh voice channels
    private async _refreshDynamicChannels() {
        // get all channels which are empty
        const emptyChannels = this._voiceChannels.filter(vc => vc.connectedUserCount === 0);

        // if only one channel is empty, return
        if (Object.keys(emptyChannels).length === 1) return;

        // if no channel is empty create a new one
        if (Object.keys(emptyChannels).length === 0) {
            // sort channels by name
            this._voiceChannels.sort((a, b) => {
                if (a.name > b.name) return 1;
                if (a.name < b.name) return -1;
                return 0;
            });
            // get last number
            const number = parseInt(this._voiceChannels[this._voiceChannels.length - 1].name.match(/^.*#(.*)$/)[1]);

            // create new channel under the right category
            const createdChannel = await this._channelManager.create(`🔊┃Voice #${number + 1}`, {
                type: 'voice',
                parent: this._dynamicCategory
            });

            // update channel array
            this._voiceChannels.push({ id: createdChannel.id, name: createdChannel.name, connectedUserCount: createdChannel.members.size });
        }

        // if more than one channel is empty, delete all exept one
        if (Object.keys(emptyChannels).length > 1) {
            // sort by name and remove first for keeping
            emptyChannels.sort((a, b) => {
                if (a.name > b.name) return 1;
                if (a.name < b.name) return -1;
                return 0;
            });
            emptyChannels.shift();

            // delete all other
            for (const vc of emptyChannels) {
                // get voice channel and delete it
                const toBeDeleted = this._botClient.getClient().channels.cache.get(vc.id);
                toBeDeleted.delete();

                // update channel array
                const index = this._voiceChannels.findIndex(voiceChannel => voiceChannel.id === vc.id);
                this._voiceChannels.splice(index, 1);
            }
        }
    }
}