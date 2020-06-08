import { Message } from 'discord.js';

/**
 * Every Bot Command
 */
export interface BotCommand {
    information: {
        id: number,
        name: string,
        category: string,
        description: string,
        argsRequired: boolean,
        admin: boolean,
        aliases: string[],
        usage: string,
        examples: string[],
        showInHelp: boolean
    },
    execute(msg: Message, args: string[]): void
}

/**
 * General Config
 */
export interface BotConfig {
    guildID: string,
    memberRoleID: string,
    welcomeChannelID: string,
    dynamicVoiceCategoryID: string,
    eventCategoryID: string,
    eventChannelID: string,
    twitchStreamChannelID: string,
    twitchRoleID: string,
    callbackURL: string,
    callbackPort: number,
    streamIDs: number[],
    botOwnerID: string,
    botToken: string,
    twitchClientID: string,
    twitchClientSecret: string,
    prefix: string,
    botID: string,
    rootPath: string,
    DBLogging: boolean,
    landingChannelID: string,
    logChannelID: string,
    levelExcludedTextChannels: string[],
    levelExcludedVoiceChannels: string[],
    experiencePerMsg: number,
    experiencePerVoiceMin: number,
    embedColor: number,
    twitchUsers: { [key: string]: string },
    botVersion: string,
    botVersionDate: string
}
