import { Client, Collection, User, GuildMember, PartialGuildMember } from 'discord.js';
import fs from 'fs';

import { BotDatabase } from './database';
import { ReactionRoleMsgHandler } from './handlers/reactionRoleMsgHandler';
import { EventHandler } from './handlers/eventHandler';
import { TwitchHandler } from './handlers/twitchHandler';
import { ReminderHandler } from './handlers/reminderHandler';
import { StatHandler } from './handlers/statHandler';

import { GuildMemberListener } from './listeners/guildMemberListener';
import { MessageListener } from './listeners/messageListener';
import { ReactionListener } from './listeners/reactionListener';
import { ReadyListener } from './listeners/readyListener';
import { VoiceChannelListener } from './listeners/voiceChannelListener';

import { BotCommand } from './customInterfaces';
import config from './config';

export class juicepress {
    // Discord Client of the Bot
    private _client: Client;

    // All available commands (in folder 'commands')
    private _commands: Collection<string, BotCommand>;

    // Bot SQLite Database
    private _botDB: BotDatabase;

    // Listeners
    private _messageListener: MessageListener;
    private _readyListener: ReadyListener;
    private _reactionListener: ReactionListener;
    private _voiceChannelListener: VoiceChannelListener;
    private _guildMemberListener: GuildMemberListener;

    private _reactionRoleMsgHandler: ReactionRoleMsgHandler
    private _eventHandler: EventHandler;
    private _twitchHandler: TwitchHandler;
    private _reminderHandler: ReminderHandler;
    private _statHandler: StatHandler;

    // initial start method
    public async start() {
        // create new client
        this._client = new Client();

        // init database connection
        await new BotDatabase().initConnection().then((botDB) => {
            this._botDB = botDB;
        });

        this._reactionRoleMsgHandler = new ReactionRoleMsgHandler(this);
        this._eventHandler = new EventHandler(this);
        this._twitchHandler = new TwitchHandler(this);
        this._reminderHandler = new ReminderHandler(this);
        this._statHandler = new StatHandler(this);

        // create listnerers
        this._messageListener = new MessageListener(this);
        this._readyListener = new ReadyListener(this);
        this._reactionListener = new ReactionListener(this);
        this._voiceChannelListener = new VoiceChannelListener(this);
        this._guildMemberListener = new GuildMemberListener(this);

        // load all commands
        this.loadCommands();

        // init event listeners
        this.initEvents();

        this._client.login(config.botToken);
    }

    /**
     * getters
     * 
     */
    public getClient() {
        return this._client;
    }
    public getDatabase() {
        return this._botDB;
    }
    public getAllCommands() {
        return this._commands;
    }
    public getReactionRoleMsgHandler(): ReactionRoleMsgHandler {
        return this._reactionRoleMsgHandler;
    }
    public getEventHandler(): EventHandler {
        return this._eventHandler;
    }
    public getReminderHandler(): ReminderHandler {
        return this._reminderHandler;
    }

    // init event listeners
    private initEvents() {
        // ReadyListener
        this._client.on('ready', async () => this._readyListener.evalReady());

        // MessageListener
        this._client.on('message', async (msg) => {
            // return if msg is from bot or not sent in a guild
            if (msg.author.bot || !msg.guild) return;
            if (msg.channel.id === config.welcomeChannelID) {
                this._messageListener.welcomeMessage(msg);
                return;
            }
            this._messageListener.evalMessage(msg);
        });

        // ReactionListener
        this._client.on('messageReactionAdd', async (msgReaction, user) => this._reactionListener.reactionAdded(msgReaction, user as User));
        this._client.on('messageReactionRemove', async (msgReaction, user) => this._reactionListener.reactionRemoved(msgReaction, user as User));

        // VoiceChannelListener
        this._client.on('voiceStateUpdate', async (oldState, newState) => this._voiceChannelListener.evalVoiceStateUpdate(oldState, newState));

        // GuildMemberListener
        this._client.on('guildMemberRemove', async (member: GuildMember | PartialGuildMember) => this._guildMemberListener.evalGuildMemberRemove(member));
    }

    // load all commands
    private loadCommands() {
        this._commands = new Collection();
        const COMMANDFILES = fs.readdirSync(`${config.rootPath}/commands`).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

        for (const file of COMMANDFILES) {
            const COMMAND = require(`./commands/${file}`).default;
            const commandInstance = new COMMAND(this);
            this._commands.set(commandInstance.information.name.toLowerCase(), commandInstance);
        }
    }

    // methods which need a logged in client. Call after bot is ready (called by ready listener)
    public async afterInit() {
        this._messageListener.init();
        this._voiceChannelListener.loadVoiceChannels();
        this._guildMemberListener.init();
        this._reactionRoleMsgHandler.updateReactionRoleMsg();
        this._eventHandler.init();
        this._reminderHandler.init();
        this._twitchHandler.init();
    }
}