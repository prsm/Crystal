import { Client, GuildMember, Guild } from "discord.js";
import { Bot } from "../bot";
import { RoleType } from "../customInterfaces";

export class RoleHandler {

    private _client: Client;

    private _guild: Guild;

    private reactionRoleIds: string[];

    private eventRoleIds: string[];

    constructor(private _bot: Bot) {
        this._client = this._bot.getClient();
    }

    public init() {
        this._guild = this._client.guilds.cache.get(this._bot.getConfig().guildID);
        this.reactionRoleUpdate();
        this.eventRoleUpdate();
    }

    public async addRole(member: GuildMember, roleID: string, type: RoleType) {
        if (type == RoleType.REACTIONROLE
            && !member.roles.cache.get(this._bot.getConfig().roleSeparatorID)
            || type == RoleType.EVENTROLE
            && !member.roles.cache.get(this._bot.getConfig().eventSeparatorID)) {
            member.roles.add(type === RoleType.REACTIONROLE ? this._bot.getConfig().roleSeparatorID : this._bot.getConfig().eventSeparatorID);
        }
        const role = this._guild.roles.cache.get(roleID);
        if (role) {
            member.roles.add(role);
        }
    }

    public async removeRole(member: GuildMember, roleID: string, type: RoleType) {
        const role = this._guild.roles.cache.get(roleID);
        if (role) {
            await member.roles.remove(role);
        }

        if (type == RoleType.REACTIONROLE
            && !member.roles.cache.some((r) => this.reactionRoleIds.includes(r.id))
            || type == RoleType.EVENTROLE
            && !member.roles.cache.some((r) => this.eventRoleIds.includes(r.id))) {
            member.roles.remove(type === RoleType.REACTIONROLE ? this._bot.getConfig().roleSeparatorID : this._bot.getConfig().eventSeparatorID);
        }
    }

    public async reactionRoleUpdate() {
        const roles = await this._bot.getDatabase().getReactionRoleRepository().find();
        this.reactionRoleIds = roles.map(r => r.roleID);
    }

    public async eventRoleUpdate() {
        const events = await this._bot.getDatabase().getEventRepository().find();
        this.eventRoleIds = events.map(e => e.roleID).filter(rID => rID !== null);
    }

}