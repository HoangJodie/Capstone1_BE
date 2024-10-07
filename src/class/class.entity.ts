
// import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

// @Entity('Class') // Map to the "Class" table in SQL Server
// export class Class {
//   @PrimaryGeneratedColumn() // Auto-incremented primary key
//   class_id: number;

//   @Column({ length: 50 }) // NVARCHAR(50) in SQL Server
//   class_name: string;

//   @Column({ length: 255 }) // NVARCHAR(255) in SQL Server
//   class_description: string;

//   @Column() // INT in SQL Server
//   class_type: number;

//   @Column('decimal', { precision: 10, scale: 2 }) // DECIMAL(10, 2) in SQL Server
//   fee: number;

//   @Column('datetime') // DATETIME in SQL Server
//   start_date: Date;

//   @Column('datetime') // DATETIME in SQL Server
//   end_date: Date;
// }