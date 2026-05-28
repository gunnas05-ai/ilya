import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { ChatRoom } from './chat-room.entity';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ChatRoom, (room) => room.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;

  @Column({ type: 'uuid' })
  @Index()
  roomId: string;

  @Column({ type: 'uuid' })
  @Index()
  senderId: string;

  @Column()
  senderName: string;

  @Column({ default: 'user' })
  senderRole: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'varchar', nullable: true })
  fileUrl: string;

  @Column({ type: 'varchar', nullable: true })
  fileName: string;

  @Column({ type: 'varchar', nullable: true })
  fileType: string;

  @Column({ type: 'int', nullable: true })
  fileSize: number;

  @Column({ default: false })
  isRead: boolean;

  @Column('simple-array', { nullable: true })
  readBy: string[];

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  @Index()
  createdAt: Date;
}
