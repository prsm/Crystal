import { Entity, Column, PrimaryGeneratedColumn, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { User } from './user';
import { ReminderMsg } from './reminderMsg';
import { EventUser } from './eventUser';

@Entity()
export class Event {
    @PrimaryGeneratedColumn() id: number;

    @Column('varchar', { unique: true }) title: string;

    @Column('varchar') eventMessageID: string;

    @Column('varchar') creatorID: string;

    @Column('datetime', { nullable: true }) date: Date;

    @Column('varchar', { nullable: true }) channelID: string;

    @Column('varchar', { nullable: true }) roleID: string;

    @Column('boolean', { nullable: true }) withTime: boolean;

    @Column('int', { nullable: true }) limit: number;

    @OneToMany(type => ReminderMsg, reminderMsg => reminderMsg.event)
    reminderMsgs: ReminderMsg[];

    @ManyToMany(type => User)
    @JoinTable()
    remindedUsers: User[];

    @OneToMany(() => EventUser, eventUser => eventUser.event)
    participants: EventUser[];
}