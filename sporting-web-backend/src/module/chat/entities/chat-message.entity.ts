import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'conversation_id', type: 'int' })
  @Index()
  conversationId: number;

  @ManyToOne(() => Conversation, (conv) => conv.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'role', type: 'varchar', length: 20 })
  role: 'user' | 'assistant' | 'system';

  @Column({ name: 'content', type: 'text' })
  content: string;

  @Column({ name: 'model', type: 'varchar', length: 100, nullable: true })
  model: string | null;

  @Column({ name: 'tokens', type: 'int', nullable: true })
  tokens: number | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number | null;

  @Column({ name: 'attachments', type: 'json', nullable: true })
  attachments: any | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

