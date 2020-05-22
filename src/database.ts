import { ConnectionOptions, createConnection, Connection, Repository } from 'typeorm';

import config from './config';
import { Config } from './entities/config';
import { ReactionRole } from './entities/reactionRole';
import { Event } from './entities/event';
import { User } from './entities/user';
import { ReminderMsg } from './entities/reminderMsg';
import { MessageStat } from './entities/messageStat';
import { VoiceStat } from './entities/voiceStat';
import { UserLevel } from './entities/userLevel';

// database options
const options: ConnectionOptions = {
    type: 'sqlite',
    database: `./database/bot.db`,
    entities: [Config, ReactionRole, Event, User, ReminderMsg, MessageStat, VoiceStat, UserLevel],
    logging: config.DBLogging
}

export class BotDatabase {

    private _connection: Connection;

    private _configRepository: Repository<Config>;

    private _reactionRoleRepository: Repository<ReactionRole>;
    private _eventRepository: Repository<Event>;
    private _userRepository: Repository<User>;

    private _messageStat: Repository<MessageStat>;
    private _voiceStat: Repository<VoiceStat>;
    private _userLevel: Repository<UserLevel>;

    public async initConnection(): Promise<BotDatabase> {
        // init connection to database
        this._connection = await createConnection(options);

        // check if all tables are correct and generate scaffolding
        await this._connection.synchronize();

        // save repository to property
        this._configRepository = this._connection.getRepository(Config);
        this._reactionRoleRepository = this._connection.getRepository(ReactionRole);
        this._eventRepository = this._connection.getRepository(Event);
        this._userRepository = this._connection.getRepository(User);

        this._messageStat = this._connection.getRepository(MessageStat);
        this._voiceStat = this._connection.getRepository(VoiceStat);
        this._userLevel = this._connection.getRepository(UserLevel);

        return this;
    }

    // getter for the database connection
    public getConnection(): Connection {
        return this._connection;
    }

    public getConfigRepository(): Repository<Config> {
        return this._configRepository;
    }

    public getReactionRoleRepository(): Repository<ReactionRole> {
        return this._reactionRoleRepository;
    }

    public getEventRepository(): Repository<Event> {
        return this._eventRepository;
    }

    public getUserRepository(): Repository<User> {
        return this._userRepository;
    }

    public getMessageStatRepository(): Repository<MessageStat> {
        return this._messageStat;
    }

    public getVoiceStatRepository(): Repository<VoiceStat> {
        return this._voiceStat;
    }

    public getUserLevelRepository(): Repository<UserLevel> {
        return this._userLevel;
    }
}