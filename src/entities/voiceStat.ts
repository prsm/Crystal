import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class VoiceStat {
    @PrimaryGeneratedColumn() id: number;

    @Column('varchar') userID: string;

    @Column('varchar') channelID: string;

    @Column('datetime') timestamp: Date;
}