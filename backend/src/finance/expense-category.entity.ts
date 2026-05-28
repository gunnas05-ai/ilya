import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

export enum ExpenseCategoryType {
  LOGISTICS = 'logistics',
  FAMILY = 'family',
}

@Entity('expense_categories')
export class ExpenseCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nameTr: string;

  @Column({ length: 100 })
  nameEn: string;

  @Column({ type: 'simple-enum', enum: ExpenseCategoryType })
  type: ExpenseCategoryType;

  @Column({ length: 100, nullable: true })
  icon: string;

  @Column({ length: 7, nullable: true })
  colorCode: string;

  @Column({ type: 'uuid', nullable: true })
  parentId: string;

  @ManyToOne(() => ExpenseCategory, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: ExpenseCategory;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
