import { Message } from 'discord.js';
// @ts-ignore
import * as chrono from 'chrono-node';

import { iBot } from '../bot';
import { BotCommand } from '../customInterfaces';

export default class createEventCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 4,
        name: 'createEvent',
        category: 'Events',
        description: 'Create an event(`!help createevent` for examples)\nParameters:\n`-t`[required] - Title\n`-d`[optional] - Description\n`-date`[optional] - Date of the event\n`-channel`[optional] - To create an associated channel (optionally you can provide a name)\n`-color`[optional] - Color of embed(string like `green` or hex code)',
        argsRequired: true,
        admin: false,
        aliases: ['ce'],
        usage: 'createevent [parameters]',
        examples: ['createevent -t Grill and Chill im Wald -d yoooo an alli Members, es sind vill neui dezue choh und au allgemein het me sich unternand scho es zytli nümm gseh.\\nDorum würdi zumene Grill & Chill ilade! :D -date 30.05.2020 -channel grillchannel'],
        showInHelp: true
    }

    private _colorRegex = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

    private _stringToColor: { [key: string]: string } = {
        'aqua': '#00FFFF',
        'black': '#000000',
        'blue': '#0000FF',
        'crimson': '#DC143C',
        'cyan': '#00FFFF',
        'fuchsia': '#FF00FF',
        'gold': '#FFD700',
        'grey': '#808080',
        'green': '#008000',
        'lime': '#00FF00',
        'magenta': '#FF00FF',
        'red': '#FF0000',
        'silver': '#C0C0C0',
        'white': '#FFFFFF',
        'yellow': '#FFFF00'
    };

    constructor(private _botClient: iBot) { }

    public async execute(msg: Message, args: string[], prefix: string) {
        const events = await this._botClient.getDatabase().getEventRepository().find();

        const content = msg.content.split(' ');
        content.shift();
        content[0] = ' ' + content[0];
        const parameters = content.join(' ').split(' -').map((parameter) => {
            const key = parameter.split(' ')[0].toLowerCase();
            let values = parameter.split(' ')
            values.shift();
            const value = values.join(' ');
            return [key, value];
        });

        let event: { [key: string]: any } = {};
        for (const parameter of parameters) {
            const key = parameter[0];
            const value = parameter[1];

            switch (key) {
                case 't':
                case 'title':
                    if (events.find(e => e.title.toLowerCase() === value.toLowerCase())) {
                        msg.channel.send(`:x: There is already an event running with this name.`);
                        return;
                    }
                    event.title = value;
                    break;
                case 'd':
                case 'desc':
                case 'description':
                    event.description = value.split('\\n').join('\n');;
                    break;
                case 'channel':
                    event.channel = {
                        create: true,
                        name: value ? value : null
                    };
                    break;
                case 'date':
                    const resolvedDate = this._resolveDate(value);
                    event.date = resolvedDate.date;
                    if (!event.date) {
                        msg.channel.send(`:x: Date could not be resolved...`);
                        return;
                    }
                    event.withTime = Object.keys(resolvedDate.info[0].start.knownValues).length === 0 || resolvedDate.info[0].start.knownValues.hasOwnProperty('hour');
                    break;
                case 'color':
                    if (!this._colorRegex.test(value) && !this._stringToColor.hasOwnProperty(value.toLowerCase())) {
                        msg.channel.send(`:x: Invalid color`);
                        return;
                    } else if (!this._colorRegex.test(value)) {
                        event.color = this._stringToColor[value.toLowerCase()];
                    } else {
                        event.color = value;
                    }
                    break;
            }
        }
        if (!event.title) {
            msg.channel.send(`:x: Parameter \`t\`/\`title\` is required.`);
            return;
        }
        this._botClient.getEventHandler().createEvent(event, msg.member);
    }

    private _resolveDate(dateString: string): { date: Date, info: any } {
        let date: Date = chrono.de.parseDate(dateString, new Date(), { forwardDate: true });
        let info: any = chrono.de.parse(dateString, new Date(), { forwardDate: true });

        if (!date) {
            date = chrono.parseDate(dateString, new Date(), { forwardDate: true });
            info = chrono.parse(dateString, new Date(), { forwardDate: true });
        }
        return { date, info };
    }

}