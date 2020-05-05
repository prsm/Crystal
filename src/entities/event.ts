import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Event {
    @PrimaryGeneratedColumn() id: number;

    @Column('varchar', { unique: true }) title: string;

    @Column('varchar') eventMessageID: string;

    @Column('varchar') creatorID: string;

    @Column('datetime', { nullable: true }) date: Date;

    @Column('varchar', { nullable: true }) channelID: string;

    @Column('varchar', { nullable: true }) roleID: string;
}