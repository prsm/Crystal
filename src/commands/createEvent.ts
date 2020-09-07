import { Message } from 'discord.js';
// @ts-ignore
import chrono from 'chrono-node';

import { Bot } from '../bot';
import { BotCommand } from '../customInterfaces';

export default class createEventCommand implements BotCommand {
    public information: BotCommand['information'] = {
        id: 4,
        name: 'createEvent',
        category: 'Events',
        description: 'Create an event(`!help createevent` for examples)\n\nParameters:\n`-t`[required] - Title\n`-d`[optional] - Description\n`-date`[optional] - Date of the event\n`-channel`[optional] - To create an associated channel (optionally with a name)\n`-color`[optional] - Color of embed(string like `green` or hex code)',
        argsRequired: true,
        admin: false,
        aliases: ['ce'],
        usage: 'createevent [parameters]',
        examples: ['createevent -t Grill and Chill im Wald -d "Lad euch zumene Grillobe ih! :D\\nOrt: Im Wald" -date 04.11.2019 -channel grillchannel'],
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

    constructor(private _bot: Bot) { }

    public async execute(msg: Message, args: string[]) {
        const events = await this._bot.getDatabase().getEventRepository().find();

        const content = msg.content.split(' ');
        content.shift();
        let contentString = content.join(' ');

        // resolve event parameter
        const parameters = [];
        do {
            contentString = contentString.trim();
            // find key
            const parameterStartIndex = contentString.indexOf('-');
            const parameterEndIndex = contentString.indexOf(' ', parameterStartIndex) >= 0 ? contentString.indexOf(' ', parameterStartIndex) : contentString.length;
            let key = contentString.substring(parameterStartIndex + 1, parameterEndIndex).toLowerCase();
            key = key.trim();

            // cut contentString with already parsed part
            contentString = contentString.substring(parameterEndIndex);
            contentString = contentString.trim();

            // find value
            let value;
            let endIndex;
            // no value was found
            if (contentString.startsWith('-')) {
                endIndex = 0;
                value = '';
                // value starts with quotation mark so the end will also be a quotation mark
            } else if (contentString.startsWith('"')) {
                endIndex = contentString.indexOf('"', 1);
                value = contentString.substring(1, endIndex);
            } else {
                endIndex = contentString.indexOf(' -') >= 0 ? contentString.indexOf(' -') : contentString.length;
                value = contentString.substring(0, endIndex);
            }
            value = value.trim();

            // cut contentString with already parsed part
            contentString = contentString.substring(endIndex);
            contentString = contentString.trim();

            // save key and value to parameter array
            parameters.push([key, value]);
        } while (contentString.length > 0);

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
        this._bot.getEventHandler().createEvent(event, msg.member);
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