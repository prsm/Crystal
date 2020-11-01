import { Column, Entity, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Event } from './event';

@Entity()
export class EventUser {
    @PrimaryGeneratedColumn() id: number;

    @Column('varchar') userId: string;

    @Column('int') joined: number;

    @ManyToOne(() => Event, event => event.participants)
    event: Event;
}