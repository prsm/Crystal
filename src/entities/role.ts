import { Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Role {
    @PrimaryColumn('varchar') id: string;
}