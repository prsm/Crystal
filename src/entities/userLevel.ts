import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class UserLevel {
    @PrimaryColumn('varchar') userID: string;

    @Column('int') exp: number;
}