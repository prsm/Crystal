import { Entity, PrimaryColumn, ManyToOne } from 'typeorm';
import { Event } from './event';

@Entity()
export class ReminderMsg {
    @PrimaryColumn('varchar') messageId: string;

    @ManyToOne(type => Event, event => event.reminderMsgs)
    event: Event;
}