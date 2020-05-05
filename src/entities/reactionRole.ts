import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class ReactionRole {
    @PrimaryColumn('varchar') roleID: string;

    @Column('varchar', { unique: true }) emojiID: string;

    @Column('varchar', { unique: true }) name: string;
}