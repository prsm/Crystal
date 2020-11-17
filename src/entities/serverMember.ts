import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class ServerMember {
    @PrimaryColumn('varchar') id: string;

    @Column('int') moderationState: number;

    @Column('datetime') moderationDate: Date;

    @Column('varchar') moderationReason: string;
}