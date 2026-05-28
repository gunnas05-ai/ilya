import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  OneToMany, Index,
} from 'typeorm';
import { ChatMessage } from './chat-message.entity';

@Entity('chat_rooms')
export class ChatRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({ default: false })
  isGroup: boolean;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string;

  @Column('simple-array', { nullable: true })
  participantIds: string[];

  @Column('simple-array', { nullable: true })
  participantNames: string[];

  @Column({ default: false })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  lastMessage: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastActivity: Date;

  @Column({ default: 0 })
  @Index()
  messageCount: number;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @OneToMany(() => ChatMessage, (m) => m.room, { cascade: true })
  messages: ChatMessage[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
