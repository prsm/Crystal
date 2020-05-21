import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class MessageStat {
    @PrimaryGeneratedColumn() id: number;

    @Column('varchar') userID: string;

    @Column('varchar') channelID: string;

    @Column('datetime') timestamp: Date;
}