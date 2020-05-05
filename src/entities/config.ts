import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Config {
    @PrimaryColumn('varchar') key: string;

    @Column('varchar') value: string;
}