import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AiKeyStatus {
  ACTIVE = 'active',
  COOLDOWN = 'cooldown',
  DISABLED = 'disabled',
  ERROR = 'error',
}

export enum AiProvider {
  GEMINI = 'gemini',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  DEEPSEEK = 'deepseek',
  GROQ = 'groq',
}

@Entity('ai_api_keys')
export class AiApiKey {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 500 })
  apiKey: string;

  @Column({
    type: 'enum',
    enum: AiProvider,
    default: AiProvider.GEMINI,
  })
  provider: AiProvider;

  @Column({
    type: 'enum',
    enum: AiKeyStatus,
    default: AiKeyStatus.ACTIVE,
  })
  status: AiKeyStatus;

  @Column({ type: 'int', default: 1 })
  priority: number;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'int', default: 0 })
  errorCount: number;

  @Column({ type: 'datetime', nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  lastExhaustedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  cooldownUntil: Date | null;

  @Column({ type: 'text', nullable: true })
  lastErrorMessage: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
