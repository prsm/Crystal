import { Entity, Column, PrimaryGeneratedColumn, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { User } from './user';
import { ReminderMsg } from './reminderMsg';

@Entity()
export class Event {
    @PrimaryGeneratedColumn() id: number;

    @Column('varchar', { unique: true }) title: string;

    @Column('varchar') eventMessageID: string;

    @Column('varchar') creatorID: string;

    @Column('datetime', { nullable: true }) date: Date;

    @Column('varchar', { nullable: true }) channelID: string;

    @Column('varchar', { nullable: true }) roleID: string;

    @Column('boolean') withTime: boolean;

    @OneToMany(type => ReminderMsg, reminderMsg => reminderMsg.event)
    reminderMsgs: ReminderMsg[];

    @ManyToMany(type => User)
    @JoinTable()
    remindedUsers: User[];
}