import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class MemberCountStat {
    @PrimaryGeneratedColumn() id: number;

    @Column('int') memberCount: number;

    @Column('datetime') timestamp: Date;
}